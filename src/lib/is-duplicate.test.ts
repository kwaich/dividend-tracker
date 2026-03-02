import type { ActivityDetails } from "@wealthfolio/addon-sdk";
import { describe, expect, it } from "vitest";
import { isDuplicate, THREE_DAYS_MS } from "./is-duplicate";

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
