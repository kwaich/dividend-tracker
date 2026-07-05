// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { AddonContext } from "@wealthfolio/addon-sdk";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DividendEvent } from "../lib/market-dividends";
import { useMarketDividends } from "./use-market-dividends";

vi.mock("../lib/market-dividends", () => ({
  fetchMarketDividends: vi.fn(),
}));

import { fetchMarketDividends } from "../lib/market-dividends";
const mockFetch = vi.mocked(fetchMarketDividends);

function makeCtx(): AddonContext {
  return {
    api: {
      market: { fetchDividends: vi.fn() },
    },
  } as unknown as AddonContext;
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useMarketDividends", () => {
  it("returns empty data Map and allLoaded:true when symbols is empty", () => {
    const ctx = makeCtx();
    const { result } = renderHook(
      () => useMarketDividends(ctx, [], new Map(), true),
      { wrapper },
    );

    expect(result.current.data.size).toBe(0);
    expect(result.current.allLoaded).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it("fetches dividends for each symbol and populates data Map keyed by original symbol", async () => {
    const divs: DividendEvent[] = [{ amount: 1.5, date: 1700000000 }];
    mockFetch.mockResolvedValue(divs);

    const ctx = makeCtx();
    const symbols = ["AAPL", "MSFT"];
    const { result } = renderHook(
      () => useMarketDividends(ctx, symbols, new Map(), true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allLoaded).toBe(true));

    expect(result.current.data.get("AAPL")).toEqual(divs);
    expect(result.current.data.get("MSFT")).toEqual(divs);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("uses dividendRequestMap for provider-neutral options", async () => {
    mockFetch.mockResolvedValue([]);

    const ctx = makeCtx();
    const symbols = ["RY", "AAPL"];
    const requestMap = new Map([
      [
        "RY",
        {
          symbol: "RY",
          options: {
            exchangeMic: "XTSE",
            instrumentType: "EQUITY",
            quoteCcy: "CAD",
          },
        },
      ],
    ]);

    const { result } = renderHook(
      () => useMarketDividends(ctx, symbols, requestMap, true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allLoaded).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      {
        symbol: "RY",
        options: {
          exchangeMic: "XTSE",
          instrumentType: "EQUITY",
          quoteCcy: "CAD",
        },
      },
      ctx.api.market,
    );
    expect(mockFetch).toHaveBeenCalledWith({ symbol: "AAPL" }, ctx.api.market);
  });

  it("collects errors for failed queries into errors array", async () => {
    const err = new Error("network failure");
    mockFetch.mockRejectedValue(err);

    const ctx = makeCtx();
    const symbols = ["FAIL"];
    const { result } = renderHook(
      () => useMarketDividends(ctx, symbols, new Map(), true),
      { wrapper },
    );

    // Hook sets retry:1, so the query retries before settling to error
    await waitFor(() => expect(result.current.errors).toHaveLength(1), {
      timeout: 5000,
    });

    expect(result.current.allLoaded).toBe(true);
    expect(result.current.errors[0].symbol).toBe("FAIL");
    expect(result.current.errors[0].error).toBe(err);
  });

  it("does not fire queries when enabled is false", () => {
    const ctx = makeCtx();
    const symbols = ["AAPL"];
    const { result } = renderHook(
      () => useMarketDividends(ctx, symbols, new Map(), false),
      { wrapper },
    );

    expect(mockFetch).not.toHaveBeenCalled();
    // Disabled queries have isLoading=false in TanStack Query v5,
    // so data Map has empty fallback for the symbol
    expect(result.current.data.get("AAPL")).toEqual([]);
  });
});
