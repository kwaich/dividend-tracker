// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { AddonContext, DividendEvent } from "@wealthfolio/addon-sdk";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DividendRequest } from "../types";
import {
  MARKET_DIVIDENDS_QUERY_KEY,
  useMarketDividends,
} from "./use-market-dividends";

function makeCtx() {
  const fetchDividends = vi.fn();
  const ctx = {
    api: { market: { fetchDividends } },
  } as unknown as AddonContext;
  return { ctx, fetchDividends };
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useMarketDividends", () => {
  it("returns empty data Map and allLoaded:true when requests is empty", () => {
    const { ctx } = makeCtx();
    const { wrapper } = makeWrapper();
    const { result } = renderHook(
      () => useMarketDividends(ctx, new Map(), true),
      { wrapper },
    );

    expect(result.current.data.size).toBe(0);
    expect(result.current.allLoaded).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it("fetches dividends for each request and keys data Map by asset ID", async () => {
    const divs: DividendEvent[] = [{ amount: 1.5, date: 1700000000 }];
    const { ctx, fetchDividends } = makeCtx();
    fetchDividends.mockResolvedValue(divs);
    const { wrapper } = makeWrapper();

    const requests = new Map<string, DividendRequest>([
      ["asset-aapl", { symbol: "AAPL" }],
      ["asset-msft", { symbol: "MSFT" }],
    ]);
    const { result } = renderHook(
      () => useMarketDividends(ctx, requests, true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allLoaded).toBe(true));

    expect(result.current.data.get("asset-aapl")).toEqual(divs);
    expect(result.current.data.get("asset-msft")).toEqual(divs);
    expect(fetchDividends).toHaveBeenCalledTimes(2);
  });

  it("passes symbol and provider-neutral options to fetchDividends", async () => {
    const { ctx, fetchDividends } = makeCtx();
    fetchDividends.mockResolvedValue([]);
    const { wrapper } = makeWrapper();

    const options = {
      exchangeMic: "XTSE",
      instrumentType: "EQUITY",
      quoteCcy: "CAD",
    };
    const requests = new Map<string, DividendRequest>([
      ["asset-ry", { symbol: "RY", options }],
      ["asset-aapl", { symbol: "AAPL" }],
    ]);

    const { result } = renderHook(
      () => useMarketDividends(ctx, requests, true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allLoaded).toBe(true));

    expect(fetchDividends).toHaveBeenCalledWith("RY", options);
    expect(fetchDividends).toHaveBeenCalledWith("AAPL", undefined);
  });

  it("collects errors for failed queries into errors array", async () => {
    const err = new Error("network failure");
    const { ctx, fetchDividends } = makeCtx();
    fetchDividends.mockRejectedValue(err);
    const { wrapper } = makeWrapper();

    const requests = new Map<string, DividendRequest>([
      ["asset-fail", { symbol: "FAIL" }],
    ]);
    const { result } = renderHook(
      () => useMarketDividends(ctx, requests, true),
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

  it("reflects refetched data after query invalidation", async () => {
    const initial: DividendEvent[] = [{ amount: 1, date: 1700000000 }];
    const updated: DividendEvent[] = [
      { amount: 1, date: 1700000000 },
      { amount: 2, date: 1710000000 },
    ];
    const { ctx, fetchDividends } = makeCtx();
    fetchDividends.mockResolvedValue(initial);
    const { client, wrapper } = makeWrapper();

    const requests = new Map<string, DividendRequest>([
      ["asset-aapl", { symbol: "AAPL" }],
    ]);
    const { result } = renderHook(
      () => useMarketDividends(ctx, requests, true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allLoaded).toBe(true));
    expect(result.current.data.get("asset-aapl")).toEqual(initial);

    fetchDividends.mockResolvedValue(updated);
    await client.invalidateQueries({
      queryKey: [MARKET_DIVIDENDS_QUERY_KEY],
    });

    await waitFor(() =>
      expect(result.current.data.get("asset-aapl")).toEqual(updated),
    );
  });

  it("does not fire queries when enabled is false", () => {
    const { ctx, fetchDividends } = makeCtx();
    const { wrapper } = makeWrapper();

    const requests = new Map<string, DividendRequest>([
      ["asset-aapl", { symbol: "AAPL" }],
    ]);
    const { result } = renderHook(
      () => useMarketDividends(ctx, requests, false),
      { wrapper },
    );

    expect(fetchDividends).not.toHaveBeenCalled();
    // Disabled queries have isLoading=false in TanStack Query v5,
    // so data Map has empty fallback for the asset ID
    expect(result.current.data.get("asset-aapl")).toEqual([]);
  });
});
