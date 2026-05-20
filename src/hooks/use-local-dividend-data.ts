import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DividendRow } from "../types";

export function useLocalDividendData(
  newRows: DividendRow[],
  existingRows: DividendRow[],
) {
  const [localData, setLocalData] = useState<DividendRow[]>([]);
  const prevIdsRef = useRef<string>("");

  const mergedRows = useMemo(() => {
    const all = [...newRows, ...existingRows];
    all.sort((a, b) => b.date.localeCompare(a.date));
    return all;
  }, [newRows, existingRows]);

  useEffect(() => {
    const ids = mergedRows.map((r) => r.id).join(",");
    if (ids !== prevIdsRef.current) {
      prevIdsRef.current = ids;
      setLocalData(mergedRows);
    }
  }, [mergedRows]);

  const mergedRowsRef = useRef(mergedRows);
  mergedRowsRef.current = mergedRows;

  const onDataChange = useCallback((nextData: DividendRow[]) => {
    const origById = new Map(mergedRowsRef.current.map((r) => [r.id, r]));
    setLocalData(
      nextData.map((row) =>
        row.status === "existing" ? (origById.get(row.id) ?? row) : row,
      ),
    );
  }, []);

  // Returned as a primitive so callers can use it in effect dependency arrays.
  // It updates when mergedRows change (same timing as localData sync).
  return { localData, setLocalData, onDataChange, dataKey: prevIdsRef.current };
}
