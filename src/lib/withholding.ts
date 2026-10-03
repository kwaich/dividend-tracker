export const WITHHOLDING_RATE_STORAGE_KEY = "dividend-tracker:withholding-rate";

/** Computes withholding tax as a percentage of the gross amount, rounded to 2dp. */
export function computeWithholdingTax(amount: number, ratePct: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(ratePct)) return 0;
  return parseFloat(((amount * ratePct) / 100).toFixed(2));
}

/** Coerces a value to a valid withholding rate percentage (0-100), or undefined. */
export function sanitizeRate(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0 || num > 100) return undefined;
  return num;
}

/**
 * Effective withholding tax for a new row: a per-row override wins; otherwise
 * the tax is derived from the current amount and rate. Returning a derived
 * value (rather than materialising it into state) keeps tax in sync when the
 * amount or rate change.
 */
export function effectiveTax(
  amount: number,
  ratePct: number | undefined,
  override: number | undefined,
): number | undefined {
  if (override != null) return override;
  if (ratePct == null) return undefined;
  return computeWithholdingTax(amount, ratePct);
}

/**
 * Clamps a per-row tax to a non-negative amount rounded to 2dp for
 * persistence, or null. Guards the save boundary against negative or
 * non-finite values that the number inputs don't reject (e.g. a typed "-5" or
 * "1e999"). A zero tax means "no withholding", persisted as null.
 */
export function sanitizeTax(value: number | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return parseFloat(value.toFixed(2));
}

/**
 * Coerces a host activity's tax (typed `string | null` by the SDK) to a
 * positive number, or undefined. Empty, zero, and non-numeric values all
 * collapse to undefined so the column shows "—" instead of "0.00" or "$NaN".
 */
export function parseExistingTax(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function loadWithholdingRate(): number | undefined {
  try {
    const raw = localStorage.getItem(WITHHOLDING_RATE_STORAGE_KEY);
    if (raw === null) return undefined;
    return sanitizeRate(Number(raw));
  } catch {
    // localStorage unavailable (e.g. sandboxed iframe) — treat as no stored rate.
    return undefined;
  }
}

export function saveWithholdingRate(rate: number | undefined): void {
  try {
    if (rate === undefined) {
      localStorage.removeItem(WITHHOLDING_RATE_STORAGE_KEY);
    } else {
      localStorage.setItem(WITHHOLDING_RATE_STORAGE_KEY, String(rate));
    }
  } catch {
    // localStorage unavailable (e.g. sandboxed iframe) — feature degrades to non-persistent rate.
  }
}
