// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, cleanup, waitFor } from "@testing-library/react";
import type { Account, AddonContext, Holding } from "@wealthfolio/addon-sdk";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHoldingsByAccount } from "./use-holdings-by-account";

afterEach(() => cleanup());

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  return Wrapper;
}

function makeCtx(
  getHoldingsFn: (accountId: string) => Promise<Holding[]>,
): AddonContext {
  return {
    api: {
      portfolio: { getHoldings: getHoldingsFn },
    },
  } as unknown as AddonContext;
}

const fakeAccount: Account = {
  id: "acct1",
  name: "Main",
  accountType: "SECURITIES",
  balance: 1000,
  currency: "USD",
  isDefault: true,
  isActive: true,
  isArchived: false,
  trackingMode: "TRANSACTIONS",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
} as Account;

const fakeHoldings: Holding[] = [
  {
    id: "h1",
    holdingType: "security",
    accountId: "acct1",
    quantity: 10,
    localCurrency: "USD",
    baseCurrency: "USD",
    marketValue: { amount: 500, currency: "USD" },
  } as unknown as Holding,
  {
    id: "h2",
    holdingType: "security",
    accountId: "acct1",
    quantity: 5,
    localCurrency: "USD",
    baseCurrency: "USD",
    marketValue: { amount: 250, currency: "USD" },
  } as unknown as Holding,
];

describe("useHoldingsByAccount", () => {
  it("returns empty holdings and isLoading:false when accounts is empty", () => {
    const ctx = makeCtx(vi.fn());
    const { result } = renderHook(() => useHoldingsByAccount(ctx, []), {
      wrapper: makeWrapper(),
    });

    expect(result.current.holdings).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("flattens holdings from all account queries", async () => {
    const secondAccount = {
      ...fakeAccount,
      id: "acct2",
      name: "Second",
    } as Account;
    const secondHoldings: Holding[] = [
      {
        id: "h3",
        holdingType: "security",
        accountId: "acct2",
        quantity: 20,
        localCurrency: "CAD",
        baseCurrency: "CAD",
        marketValue: { amount: 1000, currency: "CAD" },
      } as unknown as Holding,
    ];

    const getHoldings = vi.fn().mockImplementation((accountId: string) => {
      if (accountId === "acct1") return Promise.resolve(fakeHoldings);
      return Promise.resolve(secondHoldings);
    });
    const ctx = makeCtx(getHoldings);

    const { result } = renderHook(
      () => useHoldingsByAccount(ctx, [fakeAccount, secondAccount]),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.holdings).toHaveLength(3);
      expect(result.current.holdings).toEqual([
        ...fakeHoldings,
        ...secondHoldings,
      ]);
    });
  });

  it("isLoading true while any query is loading", async () => {
    let resolveHoldings!: (v: Holding[]) => void;
    const getHoldings = vi.fn().mockImplementation(
      () =>
        new Promise((r) => {
          resolveHoldings = r;
        }),
    );
    const ctx = makeCtx(getHoldings);

    const { result } = renderHook(
      () => useHoldingsByAccount(ctx, [fakeAccount]),
      { wrapper: makeWrapper() },
    );

    expect(result.current.isLoading).toBe(true);

    resolveHoldings(fakeHoldings);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
