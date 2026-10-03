import { Input, Label } from "@wealthfolio/ui";
import { useState } from "react";
import { sanitizeRate } from "../lib/withholding";

interface WithholdingRateInputProps {
  id: string;
  ratePct: number | undefined;
  onCommit: (rate: number | undefined) => void;
}

/**
 * Withholding-rate field shared by the mobile and desktop toolbars. Holds the
 * raw text locally so an out-of-range intermediate value (e.g. "150" while
 * typing 15.0) stays visible without clearing the committed rate; only valid,
 * in-range rates (or an empty field) are committed upstream.
 */
export function WithholdingRateInput({
  id,
  ratePct,
  onCommit,
}: WithholdingRateInputProps) {
  const [text, setText] = useState(ratePct != null ? String(ratePct) : "");

  const handleChange = (raw: string, badInput: boolean) => {
    setText(raw);
    // A number input reports "" for unparseable partial text ("-", "1e");
    // only a genuinely empty field clears the rate.
    if (badInput) return;
    if (raw === "") {
      onCommit(undefined);
      return;
    }
    const v = sanitizeRate(Number(raw));
    if (v !== undefined) onCommit(v);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Label
        htmlFor={id}
        className="text-muted-foreground text-xs whitespace-nowrap"
      >
        Withholding %
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        max={100}
        step={0.01}
        className="h-8 w-20"
        value={text}
        onChange={(e) =>
          handleChange(e.target.value, e.target.validity.badInput)
        }
        // Drop any rejected text so the field shows the rate actually applied.
        onBlur={() => setText(ratePct != null ? String(ratePct) : "")}
      />
    </div>
  );
}
