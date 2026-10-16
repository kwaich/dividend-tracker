import { Input, Label } from "@wealthfolio/ui";
import { useState } from "react";
import { sanitizeWindowDays } from "../lib/is-duplicate";

interface MatchWindowInputProps {
  id: string;
  days: number;
  onCommit: (days: number) => void;
}

/**
 * Days of slack when matching a suggested dividend to an existing activity
 * (broker dates can differ from the ex-date). Only valid values are committed.
 */
export function MatchWindowInput({
  id,
  days,
  onCommit,
}: MatchWindowInputProps) {
  const [text, setText] = useState(String(days));

  const handleChange = (raw: string) => {
    setText(raw);
    if (raw === "") return;
    const v = sanitizeWindowDays(Number(raw));
    if (v !== undefined) onCommit(v);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Label
        htmlFor={id}
        className="text-muted-foreground text-xs whitespace-nowrap"
        title="Treat an existing dividend within this many days as already recorded"
      >
        Match ±days
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        max={14}
        step={1}
        className="h-8 w-16"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setText(String(days))}
      />
    </div>
  );
}
