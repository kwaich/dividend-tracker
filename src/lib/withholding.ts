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

export function loadWithholdingRate(): number | undefined {
  try {
    const raw = localStorage.getItem(WITHHOLDING_RATE_STORAGE_KEY);
    if (raw === null) return undefined;
    return sanitizeRate(Number(raw));
  } catch {
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
