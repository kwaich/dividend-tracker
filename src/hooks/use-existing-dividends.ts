import { useQueries, useQuery } from "@tanstack/react-query";
import type { ActivityDetails, AddonContext } from "@wealthfolio/addon-sdk";
import { QueryKeys } from "@wealthfolio/addon-sdk";
import { useMemo } from "react";

export function useExistingDividends(ctx: AddonContext): {
  existingDivs: ActivityDetails[] | undefined;
  isLoading: boolean;
} {
  const { data: rawDivs, isLoading: divsLoading } = useQuery({
    queryKey: [QueryKeys.ACTIVITIES, "DIVIDEND"],
    queryFn: async () => {
      const pageSize = 1000;
      let page = 0;
      const allData: ActivityDetails[] = [];

      while (true) {
        const res = await ctx.api.activities.search(
          page,
          pageSize,
          { activityTypes: ["DIVIDEND"] },
          "",
        );
        allData.push(...res.data);
        if (res.data.length === 0 || allData.length >= res.meta.totalRowCount)
          break;
        page++;
      }

      return allData;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Some legacy assets have a NULL display_code, which makes assetSymbol
  // come back as an empty string. Fall back to fetching the asset profile
  // for those rows and use displayCode || instrumentSymbol.
  const missingSymbolAssetIds = useMemo(() => {
    if (!rawDivs) return [];
    const ids = new Set<string>();
    for (const d of rawDivs) {
      if (!d.assetSymbol && d.assetId) ids.add(d.assetId);
    }
    return Array.from(ids);
  }, [rawDivs]);

  const profileQueries = useQueries({
    queries: useMemo(
      () =>
        missingSymbolAssetIds.map((id) => ({
          queryKey: [QueryKeys.ASSET_DATA, id],
          queryFn: () => ctx.api.assets.getProfile(id),
          staleTime: 5 * 60 * 1000,
        })),
      [missingSymbolAssetIds, ctx.api.assets],
    ),
  });

  const profilesLoading =
    missingSymbolAssetIds.length > 0 && profileQueries.some((q) => q.isLoading);

  const existingDivs = useMemo(() => {
    if (!rawDivs) return undefined;
    if (missingSymbolAssetIds.length === 0) return rawDivs;
    const symbolByAssetId = new Map<string, string>();
    missingSymbolAssetIds.forEach((id, i) => {
      const asset = profileQueries[i]?.data;
      const fallback = asset?.displayCode || asset?.instrumentSymbol;
      if (fallback) symbolByAssetId.set(id, fallback);
    });
    return rawDivs.map((d) =>
      d.assetSymbol || !symbolByAssetId.has(d.assetId)
        ? d
        : { ...d, assetSymbol: symbolByAssetId.get(d.assetId)! },
    );
    // profileQueries identity changes each render; gate on loading state instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawDivs, missingSymbolAssetIds, profilesLoading]);

  return { existingDivs, isLoading: divsLoading || profilesLoading };
}
