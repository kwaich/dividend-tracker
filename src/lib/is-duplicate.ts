import type { ActivityDetails } from "@wealthfolio/addon-sdk";

export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

interface DuplicateMatchOptions {
  allowSymbolFallback?: boolean;
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
  const { allowSymbolFallback = true } = options;

  return existing.some((a) => {
    if (a.accountId !== accountId) return false;

    const sameAssetId = typeof a.assetId === "string" && a.assetId === assetId;
    const sameSymbol =
      (a.assetSymbol ?? "").toUpperCase() === symbol.toUpperCase();
    const sameAsset = sameAssetId || (allowSymbolFallback && sameSymbol);
    if (!sameAsset) return false;

    const actMs = getEffectiveDateMs(a);
    return Math.abs(actMs - dateMs) <= THREE_DAYS_MS;
  });
}
