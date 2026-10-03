import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeWithholdingTax,
  effectiveTax,
  loadWithholdingRate,
  parseExistingTax,
  sanitizeRate,
  sanitizeTax,
  saveWithholdingRate,
  WITHHOLDING_RATE_STORAGE_KEY,
} from "./withholding";

describe("computeWithholdingTax", () => {
  it("computes 15% of 100 as 15", () => {
    expect(computeWithholdingTax(100, 15)).toBe(15);
  });

  it("rounds to 2 decimal places", () => {
    expect(computeWithholdingTax(33.3333, 15)).toBe(5);
  });

  it("returns 0 for a 0% rate", () => {
    expect(computeWithholdingTax(100, 0)).toBe(0);
  });

  it("returns the full amount for a 100% rate", () => {
    expect(computeWithholdingTax(42.5, 100)).toBe(42.5);
  });

  it("returns 0 for non-finite amount", () => {
    expect(computeWithholdingTax(NaN, 15)).toBe(0);
    expect(computeWithholdingTax(Infinity, 15)).toBe(0);
  });

  it("returns 0 for non-finite rate", () => {
    expect(computeWithholdingTax(100, NaN)).toBe(0);
  });
});

describe("sanitizeRate", () => {
  it("accepts values within [0, 100]", () => {
    expect(sanitizeRate(0)).toBe(0);
    expect(sanitizeRate(15)).toBe(15);
    expect(sanitizeRate(100)).toBe(100);
    expect(sanitizeRate(30.5)).toBe(30.5);
  });

  it("rejects out-of-range values", () => {
    expect(sanitizeRate(-1)).toBeUndefined();
    expect(sanitizeRate(101)).toBeUndefined();
  });

  it("rejects non-numeric values", () => {
    expect(sanitizeRate(NaN)).toBeUndefined();
    expect(sanitizeRate("abc")).toBeUndefined();
    expect(sanitizeRate(undefined)).toBeUndefined();
    expect(sanitizeRate(null)).toBeUndefined();
  });
});

describe("effectiveTax", () => {
  it("derives tax from amount and rate when there is no override", () => {
    expect(effectiveTax(100, 15, undefined)).toBe(15);
  });

  it("re-derives when the amount changes (no override)", () => {
    expect(effectiveTax(1000, 15, undefined)).toBe(150);
  });

  it("returns undefined when no rate and no override", () => {
    expect(effectiveTax(100, undefined, undefined)).toBeUndefined();
  });

  it("prefers a per-row override over the derived value", () => {
    expect(effectiveTax(100, 15, 20)).toBe(20);
  });

  it("treats a zero override as an explicit value, not absent", () => {
    expect(effectiveTax(100, 15, 0)).toBe(0);
  });
});

describe("sanitizeTax", () => {
  it("keeps a positive tax rounded to 2dp", () => {
    expect(sanitizeTax(15.5)).toBe(15.5);
    expect(sanitizeTax(15.1234)).toBe(15.12);
  });

  it("maps undefined, zero, and negative to null", () => {
    expect(sanitizeTax(undefined)).toBeNull();
    expect(sanitizeTax(0)).toBeNull();
    expect(sanitizeTax(-5)).toBeNull();
  });

  it("maps non-finite values to null", () => {
    expect(sanitizeTax(Infinity)).toBeNull();
    expect(sanitizeTax(NaN)).toBeNull();
  });
});

describe("parseExistingTax", () => {
  it("parses a positive numeric string", () => {
    expect(parseExistingTax("15")).toBe(15);
    expect(parseExistingTax(15)).toBe(15);
  });

  it("collapses empty, zero, non-numeric, and nullish to undefined", () => {
    expect(parseExistingTax("")).toBeUndefined();
    expect(parseExistingTax("0")).toBeUndefined();
    expect(parseExistingTax("abc")).toBeUndefined();
    expect(parseExistingTax(null)).toBeUndefined();
    expect(parseExistingTax(undefined)).toBeUndefined();
  });

  it("rejects negative stored values", () => {
    expect(parseExistingTax("-5")).toBeUndefined();
  });
});

describe("withholding rate persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("round-trips a saved rate", () => {
    saveWithholdingRate(15);
    expect(loadWithholdingRate()).toBe(15);
  });

  it("returns undefined when nothing is stored", () => {
    expect(loadWithholdingRate()).toBeUndefined();
  });

  it("returns undefined for garbage stored values", () => {
    localStorage.setItem(WITHHOLDING_RATE_STORAGE_KEY, "not-a-number");
    expect(loadWithholdingRate()).toBeUndefined();
  });

  it("removes the key when saving undefined", () => {
    saveWithholdingRate(15);
    saveWithholdingRate(undefined);
    expect(localStorage.getItem(WITHHOLDING_RATE_STORAGE_KEY)).toBeNull();
    expect(loadWithholdingRate()).toBeUndefined();
  });
});
