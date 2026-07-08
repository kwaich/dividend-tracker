import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import type { ActivityDetails, AddonContext } from "@wealthfolio/addon-sdk";
import { useCallback, useMemo } from "react";
import { POSITION_ACTIVITY_TYPES } from "../lib/quantity-timeline";

export const POSITION_ACTIVITIES_QUERY_KEY = "position-activities";

export function usePositionActivities(
  ctx: AddonContext,
  symbols: string[],
  symbolMap: Map<
    string,
    { symbol: string; accountIds: string[]; currency: string; assetId: string }
  >,
): { data: Map<string, ActivityDetails[]>; allLoaded: boolean } {
  return useQueries({
    queries: useMemo(
      () =>
        symbols.map((symbol) => {
          const assetId = symbolMap.get(symbol)?.assetId ?? symbol;
          return {
            queryKey: [POSITION_ACTIVITIES_QUERY_KEY, symbol],
            queryFn: async () => {
              const res = await ctx.api.activities.search(
                0,
                5000,
                { activityTypes: POSITION_ACTIVITY_TYPES, symbol: assetId },
                "",
                { id: "date", desc: false },
              );
              return res.data;
            },
            staleTime: 5 * 60 * 1000,
          };
        }),
      [symbols, symbolMap, ctx.api.activities],
    ),
    // combine recomputes on every result change (including refetches), unlike
    // a memo gated on allLoaded, which stays true while settled queries refetch.
    combine: useCallback(
      (results: UseQueryResult<ActivityDetails[], Error>[]) => ({
        data: new Map(
          symbols.map((symbol, i) => [symbol, results[i]?.data ?? []]),
        ),
        allLoaded: results.length === 0 || results.every((q) => !q.isLoading),
      }),
      [symbols],
    ),
  });
}
