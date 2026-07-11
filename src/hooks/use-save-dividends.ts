import { useQueryClient } from "@tanstack/react-query";
import type { AddonContext } from "@wealthfolio/addon-sdk";
import { useState } from "react";
import type { DividendRow } from "../types";
import { MARKET_DIVIDENDS_QUERY_KEY } from "./use-market-dividends";

export function useSaveDividends(ctx: AddonContext) {
  const [saving, setSaving] = useState(false);
  // Invalidate via the provider's client, not ctx.api.query: in the iframe
  // sandbox the API proxy only reaches the host's cache, while the client
  // invalidates locally and mirrors to the host.
  const queryClient = useQueryClient();

  const save = async (rows: DividendRow[]) => {
    const valid = rows.filter((r) => r.status === "new");
    if (valid.length === 0) return;

    const byAccount = new Map<string, DividendRow[]>();
    for (const s of valid) {
      if (!byAccount.has(s.accountId)) byAccount.set(s.accountId, []);
      byAccount.get(s.accountId)!.push(s);
    }

    setSaving(true);
    let totalCreated = 0;
    let totalErrors = 0;
    const errorMessages: string[] = [];

    try {
      const results = await Promise.allSettled(
        Array.from(byAccount.values()).map((group) =>
          ctx.api.activities.saveMany({
            creates: group.map((s) => ({
              accountId: s.accountId,
              activityType: "DIVIDEND",
              activityDate: s.payDate ?? s.date,
              assetId: s.assetId,
              asset: { id: s.assetId },
              amount: s.amount,
              currency: s.currency,
              tax: s.tax || null,
              comment: s.payDate ? `ex-date:${s.date}` : null,
            })),
          }),
        ),
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          totalCreated += r.value.created.length;
          totalErrors += r.value.errors.length;
          for (const err of r.value.errors) {
            ctx.api.logger.error(`Failed to create dividend: ${err.message}`);
            errorMessages.push(err.message);
          }
        } else {
          totalErrors += 1;
          const msg =
            r.reason instanceof Error ? r.reason.message : String(r.reason);
          ctx.api.logger.error(`Failed to save dividend group: ${msg}`);
          errorMessages.push(msg);
        }
      }

      if (totalErrors > 0) {
        const detail =
          errorMessages.length > 0
            ? `\n${errorMessages.slice(0, 3).join("\n")}`
            : "";
        ctx.api.toast.warning(
          `${totalCreated} added, ${totalErrors} failed${detail}`,
        );
      } else {
        ctx.api.toast.success(
          `${totalCreated} dividend${totalCreated !== 1 ? "s" : ""} added`,
        );
      }

      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({
        queryKey: [MARKET_DIVIDENDS_QUERY_KEY],
      });
    } finally {
      setSaving(false);
    }
  };

  return { save, saving };
}
