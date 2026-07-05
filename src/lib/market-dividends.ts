import type {
  DividendEvent,
  FetchDividendsOptions,
  HostAPI,
} from "@wealthfolio/addon-sdk";

// Re-exported so consumers keep a single import site for dividend types.
export type { DividendEvent, FetchDividendsOptions };

export interface DividendRequest {
  symbol: string;
  options?: FetchDividendsOptions;
}

export async function fetchMarketDividends(
  request: DividendRequest,
  market: HostAPI["market"],
): Promise<DividendEvent[]> {
  return market.fetchDividends(request.symbol, request.options);
}
