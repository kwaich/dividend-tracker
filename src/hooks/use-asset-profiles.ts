import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import {
  QueryKeys,
  type AddonContext,
  type Asset,
} from "@wealthfolio/addon-sdk";
import { useCallback, useMemo } from "react";

export function useAssetProfiles(
  ctx: AddonContext,
  instrumentIds: string[],
): { profiles: (Asset | undefined)[]; allLoaded: boolean } {
  return useQueries({
    queries: useMemo(
      () =>
        instrumentIds.map((id) => ({
          queryKey: [QueryKeys.ASSET_DATA, id],
          queryFn: () => ctx.api.assets.getProfile(id),
          staleTime: 5 * 60 * 1000,
        })),
      [instrumentIds, ctx.api.assets],
    ),
    // combine recomputes on every result change (including refetches), unlike
    // a memo gated on allLoaded, which stays true while settled queries refetch.
    combine: useCallback(
      (results: UseQueryResult<Asset, Error>[]) => ({
        profiles: results.map((q) => q.data),
        allLoaded:
          instrumentIds.length === 0 || results.every((q) => !q.isLoading),
      }),
      [instrumentIds],
    ),
  });
}
