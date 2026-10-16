import type { ActivityDetails } from "@wealthfolio/addon-sdk";
import { afterEach, describe, expect, it } from "vitest";
import {
  isDuplicate,
  loadMatchWindowDays,
  MATCH_WINDOW_STORAGE_KEY,
  sanitizeWindowDays,
  saveMatchWindowDays,
  THREE_DAYS_MS,
} from "./is-duplicate";

/** Helper to create a minimal ActivityDetails stub for testing. */
function makeActivity(
  overrides: Partial<ActivityDetails> &
    Pick<ActivityDetails, "assetSymbol" | "accountId" | "date">,
): ActivityDetails {
  return {
    id: "test",
    activityType: "DIVIDEND",
    quantity: null,
    unitPrice: null,
    amount: "1.00",
    fee: null,
    currency: "USD",
    needsReview: false,
    createdAt: overrides.date,
    updatedAt: overrides.date,
    accountName: "Test Account",
    accountCurrency: "USD",
    assetId: "test-asset",
    ...overrides,
  } as ActivityDetails;
}

describe("isDuplicate", () => {
  const baseDate = new Date("2025-06-15T00:00:00Z");
  const baseDateMs = baseDate.getTime();

  const existing = [
    makeActivity({
      assetId: "aapl-us",
      assetSymbol: "AAPL",
      accountId: "acct1",
      date: baseDate,
    }),
  ];

  it("returns true for exact match (same symbol, account, date)", () => {
    expect(isDuplicate("aapl-us", "AAPL", baseDateMs, "acct1", existing)).toBe(
      true,
    );
  });

  it("returns true within 3-day window (1 day before)", () => {
    const oneDayBefore = baseDateMs - 1 * 24 * 60 * 60 * 1000;
    expect(
      isDuplicate("aapl-us", "AAPL", oneDayBefore, "acct1", existing),
    ).toBe(true);
  });

  it("returns true within 3-day window (2 days after)", () => {
    const twoDaysAfter = baseDateMs + 2 * 24 * 60 * 60 * 1000;
    expect(
      isDuplicate("aapl-us", "AAPL", twoDaysAfter, "acct1", existing),
    ).toBe(true);
  });

  it("returns true at exact boundary (exactly 3 days)", () => {
    const exactBoundary = baseDateMs + THREE_DAYS_MS;
    expect(
      isDuplicate("aapl-us", "AAPL", exactBoundary, "acct1", existing),
    ).toBe(true);
  });

  it("returns false just past boundary (3 days + 1ms)", () => {
    const pastBoundary = baseDateMs + THREE_DAYS_MS + 1;
    expect(
      isDuplicate("aapl-us", "AAPL", pastBoundary, "acct1", existing),
    ).toBe(false);
  });

  it("returns false outside 3-day window (4 days)", () => {
    const fourDaysAfter = baseDateMs + 4 * 24 * 60 * 60 * 1000;
    expect(
      isDuplicate("aapl-us", "AAPL", fourDaysAfter, "acct1", existing),
    ).toBe(false);
  });

  it("returns false for same symbol but different asset id", () => {
    expect(
      isDuplicate("aapl-lse", "AAPL", baseDateMs, "acct1", existing, {
        allowSymbolFallback: false,
      }),
    ).toBe(false);
  });

  it("returns true for same symbol with different asset id when fallback is enabled", () => {
    expect(isDuplicate("aapl-lse", "AAPL", baseDateMs, "acct1", existing)).toBe(
      true,
    );
  });

  it("returns false for different symbol", () => {
    expect(isDuplicate("msft-us", "MSFT", baseDateMs, "acct1", existing)).toBe(
      false,
    );
  });

  it("returns false for different account", () => {
    expect(isDuplicate("aapl-us", "AAPL", baseDateMs, "acct2", existing)).toBe(
      false,
    );
  });

  it("returns false for empty existing array", () => {
    expect(isDuplicate("aapl-us", "AAPL", baseDateMs, "acct1", [])).toBe(false);
  });

  it("falls back to case-insensitive symbol matching when existing assetId is missing", () => {
    const withNull = [
      makeActivity({
        assetId: undefined,
        assetSymbol: "aapl",
        accountId: "acct1",
        date: baseDate,
      }),
    ];
    expect(isDuplicate("aapl-us", "AAPL", baseDateMs, "acct1", withNull)).toBe(
      true,
    );
  });

  it("handles multiple existing activities correctly", () => {
    const multi = [
      makeActivity({
        assetId: "msft-us",
        assetSymbol: "MSFT",
        accountId: "acct1",
        date: baseDate,
      }),
      makeActivity({
        assetId: "aapl-us",
        assetSymbol: "AAPL",
        accountId: "acct2",
        date: baseDate,
      }),
      makeActivity({
        assetId: "aapl-us",
        assetSymbol: "AAPL",
        accountId: "acct1",
        date: baseDate,
      }),
    ];
    expect(isDuplicate("aapl-us", "AAPL", baseDateMs, "acct1", multi)).toBe(
      true,
    );
    expect(isDuplicate("aapl-us", "AAPL", baseDateMs, "acct2", multi)).toBe(
      true,
    );
    expect(isDuplicate("msft-us", "MSFT", baseDateMs, "acct1", multi)).toBe(
      true,
    );
    expect(isDuplicate("msft-us", "MSFT", baseDateMs, "acct2", multi)).toBe(
      false,
    );
  });
});

describe("isDuplicate windowDays option", () => {
  const baseDateMs = new Date("2025-06-15T00:00:00Z").getTime();
  const DAY = 24 * 60 * 60 * 1000;
  const existing = [
    makeActivity({
      assetId: "aapl-us",
      assetSymbol: "AAPL",
      accountId: "acct1",
      date: new Date("2025-06-15T00:00:00Z"),
    }),
  ];

  it("matches a 5-day gap with a 5-day window", () => {
    expect(
      isDuplicate("aapl-us", "AAPL", baseDateMs + 5 * DAY, "acct1", existing, {
        windowDays: 5,
      }),
    ).toBe(true);
  });

  it("does not match a 6-day gap with a 5-day window", () => {
    expect(
      isDuplicate("aapl-us", "AAPL", baseDateMs + 6 * DAY, "acct1", existing, {
        windowDays: 5,
      }),
    ).toBe(false);
  });
});

describe("match window persistence", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to 3 when nothing is stored", () => {
    expect(loadMatchWindowDays()).toBe(3);
  });

  it("round-trips a saved window", () => {
    saveMatchWindowDays(7);
    expect(loadMatchWindowDays()).toBe(7);
  });

  it("falls back to 3 for out-of-range stored values", () => {
    localStorage.setItem(MATCH_WINDOW_STORAGE_KEY, "99");
    expect(loadMatchWindowDays()).toBe(3);
  });

  it("accepts only whole days from 1 to 14", () => {
    // 0 would require millisecond-equal timestamps, which never happens.
    expect(sanitizeWindowDays(0)).toBeUndefined();
    expect(sanitizeWindowDays(1)).toBe(1);
    expect(sanitizeWindowDays(14)).toBe(14);
    expect(sanitizeWindowDays(15)).toBeUndefined();
    expect(sanitizeWindowDays(-1)).toBeUndefined();
    expect(sanitizeWindowDays(2.5)).toBeUndefined();
  });
});
