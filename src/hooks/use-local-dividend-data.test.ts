// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLocalDividendData } from "./use-local-dividend-data";
import type { DividendRow } from "../types";

afterEach(() => cleanup());

function row(
  id: string,
  date: string,
  status: "new" | "existing" = "new",
  overrides: Partial<DividendRow> = {},
): DividendRow {
  return {
    id,
    status,
    symbol: "AAPL",
    assetId: "asset-1",
    date,
    amount: 1,
    currency: "USD",
    accountId: "acct-1",
    availableAccountIds: ["acct-1"],
    ...overrides,
  };
}

describe("useLocalDividendData", () => {
  it("merges new + existing rows and sorts by date descending", () => {
    const newRows = [row("n1", "2024-03-01"), row("n2", "2024-01-01")];
    const existingRows = [row("e1", "2024-02-01", "existing")];

    const { result } = renderHook(() =>
      useLocalDividendData(newRows, existingRows),
    );

    expect(result.current.localData.map((r) => r.id)).toEqual([
      "n1",
      "e1",
      "n2",
    ]);
  });

  it("re-syncs localData when row ids change", () => {
    const initialNew = [row("n1", "2024-03-01")];
    const existing = [row("e1", "2024-02-01", "existing")];

    const { result, rerender } = renderHook(
      ({ newRows }: { newRows: DividendRow[] }) =>
        useLocalDividendData(newRows, existing),
      { initialProps: { newRows: initialNew } },
    );

    expect(result.current.localData).toHaveLength(2);

    rerender({ newRows: [...initialNew, row("n2", "2024-04-01")] });

    expect(result.current.localData.map((r) => r.id)).toEqual([
      "n2",
      "n1",
      "e1",
    ]);
  });

  it("preserves local edits across re-renders that don't change ids", () => {
    const newRows = [row("n1", "2024-03-01", "new", { amount: 1 })];
    const existing: DividendRow[] = [];

    const { result, rerender } = renderHook(() =>
      useLocalDividendData(newRows, existing),
    );

    act(() => {
      result.current.onDataChange([
        { ...result.current.localData[0], amount: 99 },
      ]);
    });

    expect(result.current.localData[0].amount).toBe(99);

    // Re-render with the same id set — local edit should survive.
    rerender();
    expect(result.current.localData[0].amount).toBe(99);
  });

  it("preserves a tax edit on a new row across re-renders that don't change ids", () => {
    const newRows = [row("n1", "2024-03-01", "new", { amount: 100 })];
    const existing: DividendRow[] = [];

    const { result, rerender } = renderHook(() =>
      useLocalDividendData(newRows, existing),
    );

    act(() => {
      result.current.onDataChange([
        { ...result.current.localData[0], tax: 15 },
      ]);
    });

    expect(result.current.localData[0].tax).toBe(15);

    rerender();
    expect(result.current.localData[0].tax).toBe(15);
  });

  it("discards a tax edit on an existing row in onDataChange", () => {
    const existing = [
      row("e1", "2024-02-01", "existing", { amount: 5, tax: 1 }),
    ];

    const { result } = renderHook(() => useLocalDividendData([], existing));

    act(() => {
      result.current.onDataChange([
        { ...result.current.localData[0], tax: 99 },
      ]);
    });

    expect(result.current.localData[0].tax).toBe(1);
  });

  it("ignores edits on existing rows in onDataChange", () => {
    const existing = [row("e1", "2024-02-01", "existing", { amount: 5 })];

    const { result } = renderHook(() => useLocalDividendData([], existing));

    act(() => {
      result.current.onDataChange([
        { ...result.current.localData[0], amount: 99 },
      ]);
    });

    expect(result.current.localData[0].amount).toBe(5);
  });

  it("exposes a dataKey that changes when ids change", () => {
    const initial = [row("n1", "2024-03-01")];
    const { result, rerender } = renderHook(
      ({ rows }: { rows: DividendRow[] }) => useLocalDividendData(rows, []),
      { initialProps: { rows: initial } },
    );

    const firstKey = result.current.dataKey;

    // Same ids — key should remain stable across re-render.
    rerender({ rows: [row("n1", "2024-03-01")] });
    expect(result.current.dataKey).toBe(firstKey);

    // Add a new row — key should change.
    rerender({ rows: [...initial, row("n2", "2024-04-01")] });
    expect(result.current.dataKey).not.toBe(firstKey);
  });
});
