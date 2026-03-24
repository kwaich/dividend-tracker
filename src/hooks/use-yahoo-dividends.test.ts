// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { AddonContext } from "@wealthfolio/addon-sdk";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { YahooDividend } from "../lib/yahoo-dividends";
import { useYahooDividends } from "./use-yahoo-dividends";

vi.mock("../lib/yahoo-dividends", () => ({
  fetchYahooDividends: vi.fn(),
}));

import { fetchYahooDividends } from "../lib/yahoo-dividends";
const mockFetch = vi.mocked(fetchYahooDividends);

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

describe("useYahooDividends", () => {
  it("returns empty data Map and allLoaded:true when symbols is empty", () => {
    const ctx = makeCtx();
    const { result } = renderHook(
      () => useYahooDividends(ctx, [], new Map(), true),
      { wrapper },
    );

    expect(result.current.data.size).toBe(0);
    expect(result.current.allLoaded).toBe(true);
    expect(result.current.errors).toEqual([]);
  });

  it("fetches dividends for each symbol and populates data Map keyed by original symbol", async () => {
    const divs: YahooDividend[] = [{ amount: 1.5, date: 1700000000 }];
    mockFetch.mockResolvedValue(divs);

    const ctx = makeCtx();
    const symbols = ["AAPL", "MSFT"];
    const { result } = renderHook(
      () => useYahooDividends(ctx, symbols, new Map(), true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allLoaded).toBe(true));

    expect(result.current.data.get("AAPL")).toEqual(divs);
    expect(result.current.data.get("MSFT")).toEqual(divs);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("uses yahooSymbolMap for symbol translation", async () => {
    mockFetch.mockResolvedValue([]);

    const ctx = makeCtx();
    const symbols = ["RY", "AAPL"];
    const yahooMap = new Map([["RY", "RY.TO"]]);

    const { result } = renderHook(
      () => useYahooDividends(ctx, symbols, yahooMap, true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.allLoaded).toBe(true));

    // RY should be translated to RY.TO via the map
    expect(mockFetch).toHaveBeenCalledWith("RY.TO", ctx.api.market);
    // AAPL not in map, should use raw symbol
    expect(mockFetch).toHaveBeenCalledWith("AAPL", ctx.api.market);
  });

  it("collects errors for failed queries into errors array", async () => {
    const err = new Error("network failure");
    mockFetch.mockRejectedValue(err);

    const ctx = makeCtx();
    const symbols = ["FAIL"];
    const { result } = renderHook(
      () => useYahooDividends(ctx, symbols, new Map(), true),
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
      () => useYahooDividends(ctx, symbols, new Map(), false),
      { wrapper },
    );

    expect(mockFetch).not.toHaveBeenCalled();
    // Disabled queries have isLoading=false in TanStack Query v5,
    // so data Map has empty fallback for the symbol
    expect(result.current.data.get("AAPL")).toEqual([]);
  });
});
