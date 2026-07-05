import { useQueries } from "@tanstack/react-query";
import type { AddonContext } from "@wealthfolio/addon-sdk";
import { useMemo } from "react";
import {
  fetchMarketDividends,
  type DividendEvent,
  type DividendRequest,
} from "../lib/market-dividends";

interface MarketDividendError {
  symbol: string;
  error: Error;
}

export function useMarketDividends(
  ctx: AddonContext,
  symbols: string[],
  dividendRequestMap: Map<string, DividendRequest>,
  enabled: boolean,
): {
  data: Map<string, DividendEvent[]>;
  allLoaded: boolean;
  errors: MarketDividendError[];
} {
  const queries = useQueries({
    queries: useMemo(
      () =>
        symbols.map((symbol) => ({
          // eslint-disable-next-line @tanstack/query/exhaustive-deps
          queryKey: ["market-dividends", symbol],
          queryFn: () =>
            fetchMarketDividends(
              dividendRequestMap.get(symbol) ?? { symbol },
              ctx.api.market,
            ),
          enabled,
          staleTime: 30 * 60 * 1000,
          retry: 1,
        })),
      // dividendRequestMap is rebuilt when profiles load; symbols drives query count
      [symbols, dividendRequestMap, ctx.api.market, enabled],
    ),
  });

  const allLoaded = queries.length === 0 || queries.every((q) => !q.isLoading);

  const data = useMemo(() => {
    const map = new Map<string, DividendEvent[]>();
    symbols.forEach((symbol, i) => {
      map.set(symbol, queries[i]?.data ?? []);
    });
    return map;
    // Recompute only when loading state settles or the symbol list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLoaded, symbols]);

  const errors: MarketDividendError[] = queries
    .map((q, i) => ({
      symbol: dividendRequestMap.get(symbols[i])?.symbol ?? symbols[i],
      error: q.error!,
    }))
    .filter((e) => e.error != null);

  return { data, allLoaded, errors };
}
