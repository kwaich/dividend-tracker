// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ActivityDetails, AddonContext } from "@wealthfolio/addon-sdk";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useExistingDividends } from "./use-existing-dividends";

const mockSearch = vi.fn();

function makeCtx(): AddonContext {
  return {
    api: {
      activities: { search: mockSearch },
    },
  } as unknown as AddonContext;
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

function makeDividend(id: string): ActivityDetails {
  return {
    id,
    activityType: "DIVIDEND",
    date: new Date("2024-06-01"),
    quantity: "100",
    unitPrice: "0.50",
    amount: "50",
    fee: null,
    currency: "USD",
    needsReview: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    accountId: "acct1",
    accountName: "Main",
    accountCurrency: "USD",
    assetId: "asset1",
    assetSymbol: "AAPL",
  } as ActivityDetails;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useExistingDividends", () => {
  it("returns empty array when no dividends exist", async () => {
    mockSearch.mockResolvedValue({
      data: [],
      meta: { totalRowCount: 0 },
    });

    const ctx = makeCtx();
    const { result } = renderHook(() => useExistingDividends(ctx), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.existingDivs).toEqual([]);
  });

  it("fetches single page of results correctly", async () => {
    const divs = [makeDividend("d1"), makeDividend("d2")];
    mockSearch.mockResolvedValue({
      data: divs,
      meta: { totalRowCount: 2 },
    });

    const ctx = makeCtx();
    const { result } = renderHook(() => useExistingDividends(ctx), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.existingDivs).toHaveLength(2);
    expect(result.current.existingDivs![0].id).toBe("d1");
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  it("paginates across multiple pages until all data collected", async () => {
    const page0 = Array.from({ length: 1000 }, (_, i) =>
      makeDividend(`d-${i}`),
    );
    const page1 = [makeDividend("d-1000"), makeDividend("d-1001")];

    mockSearch
      .mockResolvedValueOnce({ data: page0, meta: { totalRowCount: 1002 } })
      .mockResolvedValueOnce({ data: page1, meta: { totalRowCount: 1002 } });

    const ctx = makeCtx();
    const { result } = renderHook(() => useExistingDividends(ctx), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.existingDivs).toHaveLength(1002);
    expect(mockSearch).toHaveBeenCalledTimes(2);
  });

  it("passes correct search parameters", async () => {
    mockSearch.mockResolvedValue({
      data: [],
      meta: { totalRowCount: 0 },
    });

    const ctx = makeCtx();
    const { result } = renderHook(() => useExistingDividends(ctx), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockSearch).toHaveBeenCalledWith(
      0, // page
      1000, // pageSize
      { activityTypes: ["DIVIDEND"] }, // filters
      "", // sort
    );
  });
});
