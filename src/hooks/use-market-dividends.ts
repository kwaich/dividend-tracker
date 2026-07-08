import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import type { AddonContext, DividendEvent } from "@wealthfolio/addon-sdk";
import { useCallback, useMemo } from "react";
import type { DividendRequest } from "../types";

export const MARKET_DIVIDENDS_QUERY_KEY = "market-dividends";

interface MarketDividendError {
  symbol: string;
  error: Error;
}

export function useMarketDividends(
  ctx: AddonContext,
  requests: Map<string, DividendRequest>,
  enabled: boolean,
): {
  data: Map<string, DividendEvent[]>;
  allLoaded: boolean;
  errors: MarketDividendError[];
} {
  const entries = useMemo(() => Array.from(requests.entries()), [requests]);

  return useQueries({
    queries: useMemo(
      () =>
        entries.map(([assetId, request]) => ({
          queryKey: [
            MARKET_DIVIDENDS_QUERY_KEY,
            assetId,
            request.options ?? null,
          ],
          queryFn: () =>
            ctx.api.market.fetchDividends(request.symbol, request.options),
          enabled,
          staleTime: 30 * 60 * 1000,
          retry: 1,
        })),
      [entries, ctx.api.market, enabled],
    ),
    // combine recomputes whenever query results change (including refetches
    // after invalidation), unlike an allLoaded-gated memo which goes stale
    // because settled queries keep isLoading === false while refetching.
    combine: useCallback(
      (results: UseQueryResult<DividendEvent[], Error>[]) => ({
        data: new Map(
          entries.map(([assetId], i) => [assetId, results[i]?.data ?? []]),
        ),
        allLoaded: results.length === 0 || results.every((q) => !q.isLoading),
        errors: entries.flatMap(([, request], i): MarketDividendError[] => {
          const error = results[i]?.error;
          return error ? [{ symbol: request.symbol, error }] : [];
        }),
      }),
      [entries],
    ),
  });
}
