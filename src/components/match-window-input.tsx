import { Input, Label } from "@wealthfolio/ui";
import { useState } from "react";
import { sanitizeWindowDays } from "../lib/is-duplicate";

interface MatchWindowInputProps {
  id: string;
  days: number;
  onCommit: (days: number) => void;
}

/**
 * Days after the ex-date an existing activity can fall and still match a
 * suggested dividend (brokers usually record the pay date). Only valid values
 * are committed.
 */
export function MatchWindowInput({
  id,
  days,
  onCommit,
}: MatchWindowInputProps) {
  const [text, setText] = useState(String(days));

  // Commit on blur/Enter, not per keystroke: each new window re-derives the
  // suggestion rows, which resets unsaved row edits.
  const commit = () => {
    const v = sanitizeWindowDays(Number(text));
    if (text !== "" && v !== undefined && v !== days) onCommit(v);
    else setText(String(days));
  };

  return (
    <div className="flex items-center gap-1.5">
      <Label
        htmlFor={id}
        className="text-muted-foreground text-xs whitespace-nowrap"
        title="Treat an existing dividend up to this many days after the ex-date as already recorded"
      >
        Match days
      </Label>
      <Input
        id={id}
        type="number"
        min={1}
        max={31}
        step={1}
        className="h-8 w-16"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
      />
    </div>
  );
}
