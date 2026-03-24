// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, cleanup, waitFor } from "@testing-library/react";
import type { Account, AddonContext } from "@wealthfolio/addon-sdk";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAccounts } from "./use-accounts";

afterEach(() => cleanup());

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  return Wrapper;
}

function makeCtx(getAllFn: () => Promise<Account[]>): AddonContext {
  return {
    api: {
      accounts: { getAll: getAllFn },
    },
  } as unknown as AddonContext;
}

const fakeAccounts: Account[] = [
  {
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
  } as Account,
];

describe("useAccounts", () => {
  it("returns accounts array from API", async () => {
    const getAll = vi.fn().mockResolvedValue(fakeAccounts);
    const ctx = makeCtx(getAll);

    const { result } = renderHook(() => useAccounts(ctx), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.accounts).toEqual(fakeAccounts);
    });
  });

  it("returns isLoading while fetching", async () => {
    let resolveAccounts!: (v: Account[]) => void;
    const getAll = vi.fn().mockImplementation(
      () =>
        new Promise((r) => {
          resolveAccounts = r;
        }),
    );
    const ctx = makeCtx(getAll);

    const { result } = renderHook(() => useAccounts(ctx), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.accounts).toEqual([]);

    resolveAccounts(fakeAccounts);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
