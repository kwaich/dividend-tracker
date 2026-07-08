// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, cleanup, waitFor } from "@testing-library/react";
import type { ActivityDetails, AddonContext } from "@wealthfolio/addon-sdk";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePositionActivities } from "./use-position-activities";

afterEach(() => cleanup());

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
}

function makeCtx(
  searchFn: (...args: unknown[]) => Promise<{ data: ActivityDetails[] }>,
): AddonContext {
  return {
    api: {
      activities: { search: searchFn },
    },
  } as unknown as AddonContext;
}

const buyActivity: ActivityDetails = {
  id: "buy-1",
  activityType: "BUY",
  date: new Date("2024-01-01"),
  quantity: "10",
  unitPrice: "50",
  amount: "500",
  fee: null,
  currency: "USD",
  needsReview: false,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  accountId: "acct1",
  accountName: "Main",
  accountCurrency: "USD",
  assetId: "asset-1",
  assetSymbol: "AAPL",
} as ActivityDetails;

describe("usePositionActivities", () => {
  it("returns empty Map and allLoaded:true when symbols is empty", () => {
    const ctx = makeCtx(vi.fn());
    const { result } = renderHook(
      () => usePositionActivities(ctx, [], new Map()),
      { wrapper: makeWrapper().wrapper },
    );

    expect(result.current.data.size).toBe(0);
    expect(result.current.allLoaded).toBe(true);
  });

  it("maps symbols via symbolMap using assetId when available", async () => {
    const search = vi.fn().mockResolvedValue({ data: [buyActivity] });
    const ctx = makeCtx(search);
    const symbolMap = new Map([
      [
        "AAPL",
        {
          symbol: "AAPL",
          accountIds: ["acct1"],
          currency: "USD",
          assetId: "asset-id-aapl",
        },
      ],
    ]);

    renderHook(() => usePositionActivities(ctx, ["AAPL"], symbolMap), {
      wrapper: makeWrapper().wrapper,
    });

    await waitFor(() => {
      expect(search).toHaveBeenCalledWith(
        0,
        5000,
        expect.objectContaining({ symbol: "asset-id-aapl" }),
        "",
        { id: "date", desc: false },
      );
    });
  });

  it("returns data Map keyed by original symbol with ActivityDetails arrays", async () => {
    const search = vi.fn().mockResolvedValue({ data: [buyActivity] });
    const ctx = makeCtx(search);

    const { result } = renderHook(
      () => usePositionActivities(ctx, ["AAPL"], new Map()),
      { wrapper: makeWrapper().wrapper },
    );

    await waitFor(() => {
      expect(result.current.allLoaded).toBe(true);
      expect(result.current.data.get("AAPL")).toEqual([buyActivity]);
    });
  });

  it("reflects refetched data after query invalidation", async () => {
    const search = vi.fn().mockResolvedValue({ data: [buyActivity] });
    const ctx = makeCtx(search);
    const { client, wrapper } = makeWrapper();

    // Stable references — fresh ones each render would recompute the memos
    // and mask the stale-data bug this test guards against.
    const symbols = ["AAPL"];
    const symbolMap = new Map<
      string,
      {
        symbol: string;
        accountIds: string[];
        currency: string;
        assetId: string;
      }
    >();
    const { result } = renderHook(
      () => usePositionActivities(ctx, symbols, symbolMap),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.data.get("AAPL")).toEqual([buyActivity]);
    });

    const sellActivity = {
      ...buyActivity,
      id: "sell-1",
      activityType: "SELL",
    } as ActivityDetails;
    search.mockResolvedValue({ data: [buyActivity, sellActivity] });

    await client.invalidateQueries({ queryKey: ["position-activities"] });

    await waitFor(() => {
      expect(result.current.data.get("AAPL")).toEqual([
        buyActivity,
        sellActivity,
      ]);
    });
  });

  it("allLoaded is false while queries are loading, true when settled", async () => {
    let resolveSearch!: (v: { data: ActivityDetails[] }) => void;
    const search = vi.fn().mockImplementation(
      () =>
        new Promise((r) => {
          resolveSearch = r;
        }),
    );
    const ctx = makeCtx(search);

    const { result } = renderHook(
      () => usePositionActivities(ctx, ["AAPL"], new Map()),
      { wrapper: makeWrapper().wrapper },
    );

    expect(result.current.allLoaded).toBe(false);

    resolveSearch({ data: [buyActivity] });

    await waitFor(() => {
      expect(result.current.allLoaded).toBe(true);
    });
  });
});
