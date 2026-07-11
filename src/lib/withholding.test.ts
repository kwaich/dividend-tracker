import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeWithholdingTax,
  loadWithholdingRate,
  sanitizeRate,
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
