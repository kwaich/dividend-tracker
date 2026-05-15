import type { AddonContext } from "@wealthfolio/addon-sdk";
import { useState } from "react";
import type { DividendRow } from "../types";

export function useSaveDividends(ctx: AddonContext) {
  const [saving, setSaving] = useState(false);

  const save = async (rows: DividendRow[]) => {
    const valid = rows.filter((r) => r.accountId !== "TOTAL");
    const skipped = rows.length - valid.length;

    const byAccount = new Map<string, DividendRow[]>();
    for (const s of valid) {
      if (!byAccount.has(s.accountId)) byAccount.set(s.accountId, []);
      byAccount.get(s.accountId)!.push(s);
    }

    setSaving(true);
    let totalCreated = 0;
    let totalErrors = skipped;
    const errorMessages: string[] = [];

    try {
      for (const [, group] of byAccount) {
        const result = await ctx.api.activities.saveMany({
          creates: group.map((s) => ({
            accountId: s.accountId,
            activityType: "DIVIDEND",
            activityDate: s.payDate ?? s.date,
            assetId: s.assetId,
            asset: { id: s.assetId },
            amount: s.amount,
            currency: s.currency,
            isDraft: false,
            comment: s.payDate ? `ex-date:${s.date}` : null,
          })),
        });
        totalCreated += result.created.length;
        totalErrors += result.errors.length;
        for (const err of result.errors) {
          ctx.api.logger.error(`Failed to create dividend: ${err.message}`);
          errorMessages.push(err.message);
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

      ctx.api.query.invalidateQueries(["activities"]);
      ctx.api.query.invalidateQueries(["yahoo-dividends"]);
    } catch (err) {
      ctx.api.toast.error("Failed to save: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return { save, saving };
}
