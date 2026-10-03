// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ActivityDetails, AddonContext } from "@wealthfolio/addon-sdk";
import { describe, expect, it, vi } from "vitest";
import { useDividendSuggestions } from "./use-dividend-suggestions";
import { useMarketDividends } from "./use-market-dividends";

vi.mock("./use-accounts", () => ({
  useAccounts: vi.fn(() => ({
    accounts: [{ id: "acct1", name: "Main" }],
    isLoading: false,
  })),
}));

vi.mock("./use-holdings-by-account", () => ({
  useHoldingsByAccount: vi.fn(() => ({
    holdings: [
      {
        holdingType: "security",
        accountId: "acct1",
        instrument: { id: "abc-nyse", symbol: "ABC", currency: "USD" },
      },
      {
        holdingType: "security",
        accountId: "acct1",
        instrument: { id: "abc-tsx", symbol: "ABC", currency: "CAD" },
      },
    ],
    isLoading: false,
  })),
}));

vi.mock("./use-existing-dividends", () => ({
  useExistingDividends: vi.fn(() => ({
    existingDivs: [],
    isLoading: false,
  })),
}));

vi.mock("./use-asset-profiles", () => ({
  useAssetProfiles: vi.fn(() => ({
    profiles: [
      { instrumentSymbol: "ABC", instrumentExchangeMic: "XNYS" },
      { instrumentSymbol: "ABC", instrumentExchangeMic: "XTSE" },
    ],
    allLoaded: true,
  })),
}));

vi.mock("./use-market-dividends", () => ({
  MARKET_DIVIDENDS_QUERY_KEY: "market-dividends",
  useMarketDividends: vi.fn((_: unknown, requests: Map<string, unknown>) => {
    const data = new Map<string, { amount: number; date: number }[]>();
    for (const assetId of requests.keys()) {
      data.set(assetId, [{ amount: 0.5, date: 1733011200 }]); // 2024-12-01 UTC
    }
    return { data, allLoaded: true, errors: [] };
  }),
}));

vi.mock("./use-position-activities", () => ({
  usePositionActivities: vi.fn((_: unknown, symbols: string[]) => {
    const buy: ActivityDetails = {
      id: "buy-1",
      activityType: "BUY",
      date: new Date("2024-01-01"),
      quantity: "10",
      unitPrice: "1",
      amount: "10",
      fee: null,
      currency: "USD",
      needsReview: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      accountId: "acct1",
      accountName: "Main",
      accountCurrency: "USD",
      assetId: "ignored",
      assetSymbol: "ABC",
    } as ActivityDetails;

    const data = new Map<string, ActivityDetails[]>();
    for (const symbol of symbols) {
      data.set(symbol, [buy]);
    }

    return { data, allLoaded: true };
  }),
}));

function makeCtx(): AddonContext {
  return {
    api: {
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
      },
    },
  } as unknown as AddonContext;
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe("useDividendSuggestions", () => {
  it("keeps same ticker suggestions separate by asset id", () => {
    const { result } = renderHook(() => useDividendSuggestions(makeCtx()), {
      wrapper,
    });

    expect(result.current.suggestions).toHaveLength(2);
    expect(result.current.suggestions.map((s) => s.assetId).sort()).toEqual([
      "abc-nyse",
      "abc-tsx",
    ]);
    expect(new Set(result.current.suggestions.map((s) => s.id)).size).toBe(2);
  });

  it("logs a fetch summary once loading settles", () => {
    const ctx = makeCtx();
    renderHook(() => useDividendSuggestions(ctx), { wrapper });

    expect(ctx.api.logger.info).toHaveBeenCalledTimes(1);
    expect(ctx.api.logger.info).toHaveBeenCalledWith(
      "Dividend fetch complete: 2 eligible holdings, 2 with dividends, 2 suggestions",
    );
  });

  it("includes failed symbols in the fetch summary", () => {
    vi.mocked(useMarketDividends).mockReturnValue({
      data: new Map(),
      allLoaded: true,
      errors: [{ symbol: "ABC", error: new Error("boom") }],
    });
    const ctx = makeCtx();
    renderHook(() => useDividendSuggestions(ctx), { wrapper });

    expect(ctx.api.logger.info).toHaveBeenCalledWith(
      "Dividend fetch complete: 2 eligible holdings, 0 with dividends, 0 suggestions; failed: ABC",
    );
  });
});
