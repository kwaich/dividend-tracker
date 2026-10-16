import type { ActivityDetails } from "@wealthfolio/addon-sdk";

const DAY_MS = 24 * 60 * 60 * 1000;
export const THREE_DAYS_MS = 3 * DAY_MS;

export const MATCH_WINDOW_STORAGE_KEY = "dividend-tracker:match-window-days";
const DEFAULT_WINDOW_DAYS = 3;
// Matches aren't consumed, so a wide window could hide the next payout of a
// weekly/monthly payer; cap it.
const MAX_WINDOW_DAYS = 14;

interface DuplicateMatchOptions {
  allowSymbolFallback?: boolean;
  windowDays?: number;
}

export function sanitizeWindowDays(value: number): number | undefined {
  return Number.isInteger(value) && value >= 1 && value <= MAX_WINDOW_DAYS
    ? value
    : undefined;
}

export function loadMatchWindowDays(): number {
  try {
    const raw = localStorage.getItem(MATCH_WINDOW_STORAGE_KEY);
    if (raw === null) return DEFAULT_WINDOW_DAYS;
    return sanitizeWindowDays(Number(raw)) ?? DEFAULT_WINDOW_DAYS;
  } catch {
    // localStorage unavailable (e.g. sandboxed iframe) — use the default.
    return DEFAULT_WINDOW_DAYS;
  }
}

export function saveMatchWindowDays(days: number): void {
  try {
    localStorage.setItem(MATCH_WINDOW_STORAGE_KEY, String(days));
  } catch {
    // localStorage unavailable (e.g. sandboxed iframe) — setting is non-persistent.
  }
}

function getEffectiveDateMs(a: ActivityDetails): number {
  // If saved with a pay-date override, the ex-date is stored in comment as "ex-date:YYYY-MM-DD"
  const match =
    typeof a.comment === "string"
      ? /ex-date:(\d{4}-\d{2}-\d{2})/.exec(a.comment)
      : null;
  if (match) return new Date(match[1] + "T00:00:00").getTime();
  return new Date(a.date).getTime();
}

export function isDuplicate(
  assetId: string,
  symbol: string,
  dateMs: number,
  accountId: string,
  existing: ActivityDetails[],
  options: DuplicateMatchOptions = {},
): boolean {
  const { allowSymbolFallback = true, windowDays = DEFAULT_WINDOW_DAYS } =
    options;
  const windowMs = windowDays * DAY_MS;

  return existing.some((a) => {
    if (a.accountId !== accountId) return false;

    const sameAssetId = typeof a.assetId === "string" && a.assetId === assetId;
    const sameSymbol =
      (a.assetSymbol ?? "").toUpperCase() === symbol.toUpperCase();
    const sameAsset = sameAssetId || (allowSymbolFallback && sameSymbol);
    if (!sameAsset) return false;

    const actMs = getEffectiveDateMs(a);
    return Math.abs(actMs - dateMs) <= windowMs;
  });
}
