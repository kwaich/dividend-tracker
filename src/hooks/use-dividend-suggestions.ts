import type { AddonContext } from "@wealthfolio/addon-sdk";
import { useMemo } from "react";
import { isDuplicate } from "../lib/is-duplicate";
import {
  buildQuantityTimeline,
  getQuantityAtDate,
} from "../lib/quantity-timeline";
import { toYahooSymbol } from "../lib/yahoo-dividends";
import type { DividendSuggestion } from "../types";
import { useAccounts } from "./use-accounts";
import { useAssetProfiles } from "./use-asset-profiles";
import { useExistingDividends } from "./use-existing-dividends";
import { useHoldingsByAccount } from "./use-holdings-by-account";
import { usePositionActivities } from "./use-position-activities";
import { useYahooDividends } from "./use-yahoo-dividends";

export function useDividendSuggestions(ctx: AddonContext): {
  suggestions: DividendSuggestion[];
  isLoading: boolean;
  accountNameMap: Map<string, string>;
  errors: { symbol: string; error: Error }[];
} {
  const { accounts, isLoading: accountsLoading } = useAccounts(ctx);
  const { holdings, isLoading: holdingsLoading } = useHoldingsByAccount(
    ctx,
    accounts,
  );
  const { existingDivs, isLoading: existingDivsLoading } =
    useExistingDividends(ctx);

  // Build assetId-keyed entries to avoid same ticker collisions across exchanges
  const { symbolMap, symbols, instrumentIds } = useMemo(() => {
    const securityHoldings = holdings.filter(
      (h) => h.holdingType === "security" && h.instrument?.symbol,
    );

    const map = new Map<
      string,
      {
        symbol: string;
        accountIds: string[];
        currency: string;
        assetId: string;
      }
    >();
    for (const h of securityHoldings) {
      const assetId = h.instrument!.id;
      const symbol = h.instrument!.symbol;
      if (!map.has(assetId)) {
        map.set(assetId, {
          symbol,
          accountIds: [],
          currency: h.instrument!.currency,
          assetId,
        });
      }
      const entry = map.get(assetId)!;
      if (!entry.accountIds.includes(h.accountId)) {
        entry.accountIds.push(h.accountId);
      }
    }

    const ids = Array.from(map.keys());
    return {
      symbolMap: map,
      symbols: ids,
      instrumentIds: ids,
    };
  }, [holdings]);

  const { profiles, allLoaded: allProfilesLoaded } = useAssetProfiles(
    ctx,
    instrumentIds,
  );

  // Map assetId key → Yahoo symbol (adjusted for exchange suffix)
  const yahooSymbolMap = useMemo(() => {
    const map = new Map<string, string>();
    instrumentIds.forEach((instrumentId, i) => {
      const asset = profiles[i];
      if (!asset?.instrumentSymbol) return;
      const yahooSymbol = toYahooSymbol(
        asset.instrumentSymbol,
        asset.instrumentExchangeMic,
      );
      if (yahooSymbol !== asset.instrumentSymbol) {
        ctx.api.logger.debug(
          `Mapped ${asset.instrumentSymbol} → ${yahooSymbol} (MIC: ${asset.instrumentExchangeMic})`,
        );
      }
      map.set(instrumentId, yahooSymbol);
    });
    return map;
  }, [instrumentIds, profiles, ctx.api.logger]);

  const {
    data: yahooData,
    allLoaded: allYahooLoaded,
    errors,
  } = useYahooDividends(ctx, symbols, yahooSymbolMap, allProfilesLoaded);

  const { data: positionData, allLoaded: allPositionLoaded } =
    usePositionActivities(ctx, symbols, symbolMap);

  // Build (symbol::accountId) → QuantityCheckpoint[] timelines
  const quantityTimelines = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildQuantityTimeline>>();
    symbols.forEach((symbolKey) => {
      const activities = positionData.get(symbolKey) ?? [];
      const entry = symbolMap.get(symbolKey);
      if (!entry) return;
      for (const accountId of entry.accountIds) {
        map.set(
          `${symbolKey}::${accountId}`,
          buildQuantityTimeline(activities, accountId),
        );
      }
    });
    return map;
  }, [positionData, symbols, symbolMap]);

  const symbolAccountCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of symbolMap.values()) {
      const symbolKey = entry.symbol.toUpperCase();
      for (const accountId of entry.accountIds) {
        const key = `${symbolKey}::${accountId}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }, [symbolMap]);

  const suggestions = useMemo(() => {
    if (!allYahooLoaded || !existingDivs || !allPositionLoaded) return [];

    const result: DividendSuggestion[] = [];

    symbols.forEach((symbolKey) => {
      const divs = yahooData.get(symbolKey);
      if (!divs) return;

      const entry = symbolMap.get(symbolKey);
      if (!entry) return;

      for (const div of divs) {
        const dateMs = div.date * 1000;
        const dateStr = new Date(dateMs).toISOString().slice(0, 10);

        for (const accountId of entry.accountIds) {
          const timeline = quantityTimelines.get(`${symbolKey}::${accountId}`);
          const shares = getQuantityAtDate(timeline ?? [], dateStr);

          if (shares <= 0) continue;

          const symbolAccountKey = `${entry.symbol.toUpperCase()}::${accountId}`;
          const hasAmbiguousSymbolInAccount =
            (symbolAccountCounts.get(symbolAccountKey) ?? 0) > 1;

          if (
            !isDuplicate(
              entry.assetId,
              entry.symbol,
              dateMs,
              accountId,
              existingDivs,
              {
                allowSymbolFallback: !hasAmbiguousSymbolInAccount,
              },
            )
          ) {
            result.push({
              id: `${entry.assetId}-${dateStr}-${accountId}`,
              symbol: entry.symbol,
              assetId: entry.assetId,
              date: dateStr,
              shares,
              dividendPerShare: div.amount,
              amount: parseFloat((div.amount * shares).toFixed(4)),
              currency: entry.currency,
              accountId,
              availableAccountIds: [...entry.accountIds],
            });
          }
        }
      }
    });

    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [
    allYahooLoaded,
    allPositionLoaded,
    existingDivs,
    symbols,
    symbolMap,
    symbolAccountCounts,
    yahooData,
    quantityTimelines,
  ]);

  const isLoading =
    accountsLoading ||
    holdingsLoading ||
    existingDivsLoading ||
    !allProfilesLoaded ||
    !allYahooLoaded ||
    !allPositionLoaded;

  const accountNameMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts],
  );

  return { suggestions, isLoading, accountNameMap, errors };
}
