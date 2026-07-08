// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { AddonContext } from "@wealthfolio/addon-sdk";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MARKET_DIVIDENDS_QUERY_KEY } from "./use-market-dividends";
import { useSaveDividends } from "./use-save-dividends";
import type { DividendRow } from "../types";

afterEach(() => cleanup());

// The addon mounts its React tree with the client from
// ctx.api.query.getClient(); invalidations must go through that client
// (not the ctx.api.query proxy, which only reaches the host's cache in iframe sandbox)
function makeWrapper() {
  const client = new QueryClient();
  const invalidateQueries = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidateQueries };
}

function makeRow(overrides: Partial<DividendRow> = {}): DividendRow {
  return {
    id: "n1",
    status: "new",
    symbol: "AAPL",
    assetId: "asset-1",
    date: "2024-03-01",
    amount: 1.23,
    currency: "USD",
    accountId: "acct-1",
    availableAccountIds: ["acct-1"],
    ...overrides,
  };
}

type SaveManyArg = Parameters<AddonContext["api"]["activities"]["saveMany"]>[0];

interface MockCtx {
  ctx: AddonContext;
  saveMany: ReturnType<typeof vi.fn>;
  toast: {
    success: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  invalidateQueries: ReturnType<typeof vi.fn>;
}

function makeCtx(): MockCtx {
  const saveMany = vi.fn();
  const toast = {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };
  const invalidateQueries = vi.fn();
  const ctx = {
    api: {
      activities: { saveMany },
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
      },
      toast,
      query: { invalidateQueries, refetchQueries: vi.fn() },
    },
  } as unknown as AddonContext;
  return { ctx, saveMany, toast, invalidateQueries };
}

describe("useSaveDividends", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves rows grouped by account and toasts success", async () => {
    const { ctx, saveMany, toast, invalidateQueries } = makeCtx();
    saveMany.mockImplementation((arg: SaveManyArg) =>
      Promise.resolve({
        created: (arg.creates ?? []).map((c, i) => ({
          id: `created-${i}`,
          ...c,
        })),
        errors: [],
      }),
    );

    const { wrapper, invalidateQueries: clientInvalidate } = makeWrapper();
    const { result } = renderHook(() => useSaveDividends(ctx), { wrapper });

    await act(async () => {
      await result.current.save([
        makeRow({ id: "n1", accountId: "acct-1" }),
        makeRow({ id: "n2", accountId: "acct-1" }),
        makeRow({ id: "n3", accountId: "acct-2" }),
      ]);
    });

    expect(saveMany).toHaveBeenCalledTimes(2);
    expect(toast.success).toHaveBeenCalledWith("3 dividends added");
    expect(toast.warning).not.toHaveBeenCalled();
    expect(clientInvalidate).toHaveBeenCalledWith({
      queryKey: ["activities"],
    });
    expect(clientInvalidate).toHaveBeenCalledWith({
      queryKey: [MARKET_DIVIDENDS_QUERY_KEY],
    });
    // The API-proxy path only reaches the host cache in the sandbox.
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("skips non-new rows without counting them as failures", async () => {
    const { ctx, saveMany, toast } = makeCtx();
    saveMany.mockImplementation((arg: SaveManyArg) =>
      Promise.resolve({
        created: (arg.creates ?? []).map((c) => ({ id: "x", ...c })),
        errors: [],
      }),
    );

    const { result } = renderHook(() => useSaveDividends(ctx), {
      wrapper: makeWrapper().wrapper,
    });

    await act(async () => {
      await result.current.save([
        makeRow({ id: "n1", status: "new" }),
        makeRow({ id: "e1", status: "existing" }),
        // Synthetic aggregation row from the grid (e.g. a TOTAL row).
        makeRow({ id: "total", status: "existing", accountId: "TOTAL" }),
      ]);
    });

    expect(saveMany).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("1 dividend added");
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("reports partial failures with up to 3 error messages", async () => {
    const { ctx, saveMany, toast } = makeCtx();
    saveMany.mockResolvedValue({
      created: [{ id: "ok" }],
      errors: [
        { message: "boom-1" },
        { message: "boom-2" },
        { message: "boom-3" },
        { message: "boom-4" },
      ],
    });

    const { result } = renderHook(() => useSaveDividends(ctx), {
      wrapper: makeWrapper().wrapper,
    });

    await act(async () => {
      await result.current.save([makeRow()]);
    });

    expect(toast.warning).toHaveBeenCalledTimes(1);
    const msg = toast.warning.mock.calls[0][0] as string;
    expect(msg).toContain("1 added, 4 failed");
    expect(msg).toContain("boom-1");
    expect(msg).toContain("boom-3");
    expect(msg).not.toContain("boom-4");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("counts rejected groups as failures and continues with others", async () => {
    const { ctx, saveMany, toast } = makeCtx();
    saveMany
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ created: [{ id: "ok" }], errors: [] });

    const { result } = renderHook(() => useSaveDividends(ctx), {
      wrapper: makeWrapper().wrapper,
    });

    await act(async () => {
      await result.current.save([
        makeRow({ id: "n1", accountId: "acct-1" }),
        makeRow({ id: "n2", accountId: "acct-2" }),
      ]);
    });

    expect(saveMany).toHaveBeenCalledTimes(2);
    expect(toast.warning).toHaveBeenCalledTimes(1);
    const msg = toast.warning.mock.calls[0][0] as string;
    expect(msg).toContain("1 added, 1 failed");
    expect(msg).toContain("network down");
  });

  it("no-ops when no new rows are provided", async () => {
    const { ctx, saveMany, toast } = makeCtx();

    const { result } = renderHook(() => useSaveDividends(ctx), {
      wrapper: makeWrapper().wrapper,
    });

    await act(async () => {
      await result.current.save([makeRow({ status: "existing" })]);
    });

    expect(saveMany).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("sets saving=true during the request and clears it afterwards", async () => {
    const { ctx, saveMany } = makeCtx();
    let resolveSave!: (v: { created: unknown[]; errors: unknown[] }) => void;
    saveMany.mockReturnValue(
      new Promise((r) => {
        resolveSave = r;
      }),
    );

    const { result } = renderHook(() => useSaveDividends(ctx), {
      wrapper: makeWrapper().wrapper,
    });

    let savePromise!: Promise<void>;
    act(() => {
      savePromise = result.current.save([makeRow()]);
    });

    await waitFor(() => expect(result.current.saving).toBe(true));

    await act(async () => {
      resolveSave({ created: [{ id: "ok" }], errors: [] });
      await savePromise;
    });

    expect(result.current.saving).toBe(false);
  });
});
