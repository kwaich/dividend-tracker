import type { AddonContext } from "@wealthfolio/addon-sdk";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Checkbox,
  DataGrid,
  FacetedFilter,
  FacetedSearchInput,
  Icons,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  TickerAvatar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
  formatAmount,
  useBalancePrivacy,
  useDataGrid,
  useIsMobile,
} from "@wealthfolio/ui";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { format } from "date-fns";
type DateRange = { from: Date | undefined; to?: Date | undefined };
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDividendSuggestions } from "../hooks/use-dividend-suggestions";
import { useExistingDividends } from "../hooks/use-existing-dividends";
import { useLocalDividendData } from "../hooks/use-local-dividend-data";
import { useSaveDividends } from "../hooks/use-save-dividends";
import type { DividendRow } from "../types";

function DateRangePicker({
  dateRange,
  onDateChange,
}: {
  dateRange: DateRange | undefined;
  onDateChange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
}) {
  const today = new Date();

  const presets: { label: string; from: Date; to: Date }[] = [
    {
      label: "Last month",
      from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      to: new Date(today.getFullYear(), today.getMonth(), 0),
    },
    {
      label: "Last 3 months",
      from: new Date(
        today.getFullYear(),
        today.getMonth() - 3,
        today.getDate(),
      ),
      to: today,
    },
    {
      label: "Last 6 months",
      from: new Date(
        today.getFullYear(),
        today.getMonth() - 6,
        today.getDate(),
      ),
      to: today,
    },
    {
      label: "Last 12 months",
      from: new Date(
        today.getFullYear(),
        today.getMonth() - 12,
        today.getDate(),
      ),
      to: today,
    },
    {
      label: "This year",
      from: new Date(today.getFullYear(), 0, 1),
      to: today,
    },
  ];

  return (
    <div style={{ width: "180px", padding: "8px" }}>
      {presets.map(({ label, from, to }) => (
        <button
          key={label}
          type="button"
          onClick={() => onDateChange({ from, to })}
          className="hover:bg-muted w-full rounded px-2 py-1.5 text-left text-sm"
        >
          {label}
        </button>
      ))}
      <div
        style={{
          borderTop: "1px solid var(--border)",
          marginTop: "8px",
          paddingTop: "8px",
        }}
      >
        <div style={{ marginBottom: "6px" }}>
          <div className="text-muted-foreground mb-1 text-xs">From</div>
          <input
            type="date"
            value={dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : ""}
            onChange={(e) => {
              const d = e.target.value
                ? new Date(e.target.value + "T00:00:00")
                : undefined;
              onDateChange((prev) => ({ from: d, to: prev?.to }));
            }}
            className="border-input bg-background h-7 w-full rounded border px-2 text-xs outline-none"
          />
        </div>
        <div>
          <div className="text-muted-foreground mb-1 text-xs">To</div>
          <input
            type="date"
            value={dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : ""}
            onChange={(e) => {
              const d = e.target.value
                ? new Date(e.target.value + "T00:00:00")
                : undefined;
              onDateChange((prev) => ({ from: prev?.from, to: d }));
            }}
            className="border-input bg-background h-7 w-full rounded border px-2 text-xs outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function MobileRow({
  row,
  isBalanceHidden,
  accountNameMap,
  onEdit,
}: {
  row: Row<DividendRow>;
  isBalanceHidden: boolean;
  accountNameMap: Map<string, string>;
  onEdit?: (item: DividendRow) => void;
}) {
  const item = row.original;
  const accountName =
    item.accountName ?? accountNameMap.get(item.accountId) ?? item.accountId;

  return (
    <div className="flex items-center gap-2 border-b py-2.5 px-1">
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
        disabled={!row.getCanSelect()}
        aria-label="Select row"
      />
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2",
          item.status === "new" && "cursor-pointer",
        )}
        onClick={() => item.status === "new" && onEdit?.(item)}
      >
        <Badge
          variant={item.status === "new" ? "default" : "secondary"}
          className="shrink-0 font-normal capitalize"
        >
          {item.status}
        </Badge>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-sm font-medium">{item.symbol}</div>
            <div className="text-muted-foreground text-xs">
              {format(new Date(item.date + "T00:00:00"), "MMM d, yyyy")}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm tabular-nums">
              {isBalanceHidden
                ? "••••"
                : formatAmount(item.amount, item.currency)}
            </div>
            <div className="text-muted-foreground max-w-[120px] truncate text-xs">
              {accountName}
            </div>
          </div>
        </div>
        {item.status === "new" && (
          <Icons.ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
        )}
      </div>
    </div>
  );
}

interface DividendSuggestionsProps {
  ctx: AddonContext;
}

const STATUS_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Existing", value: "existing" },
];

export default function DividendSuggestions({ ctx }: DividendSuggestionsProps) {
  const [search, setSearch] = useState("");
  const [symbolFilter, setSymbolFilter] = useState<Set<string>>(new Set());
  const [accountFilter, setAccountFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  // Local state for the filter sheet — staged, applied on "Done"
  const [localStatusFilter, setLocalStatusFilter] = useState<Set<string>>(
    new Set(),
  );
  const [localSymbolFilter, setLocalSymbolFilter] = useState<Set<string>>(
    new Set(),
  );
  const [localAccountFilter, setLocalAccountFilter] = useState<Set<string>>(
    new Set(),
  );
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(
    undefined,
  );
  const { isBalanceHidden } = useBalancePrivacy();
  const isMobile = useIsMobile();

  const {
    suggestions,
    isLoading: suggestionsLoading,
    accountNameMap,
    errors,
  } = useDividendSuggestions(ctx);

  const { existingDivs, isLoading: existingLoading } =
    useExistingDividends(ctx);

  const isLoading = suggestionsLoading || existingLoading;

  const existingRows = useMemo<DividendRow[]>(() => {
    if (!existingDivs) return [];
    return existingDivs.map((a) => ({
      id: `existing-${a.id}`,
      status: "existing" as const,
      symbol: a.assetSymbol,
      assetId: a.assetId,
      date: new Date(a.date).toISOString().slice(0, 10),
      amount: Number(a.amount ?? 0),
      currency: a.currency,
      accountId: a.accountId,
      accountName: a.accountName,
      availableAccountIds: [a.accountId],
    }));
  }, [existingDivs]);

  const newRows = useMemo<DividendRow[]>(
    () =>
      suggestions.map((s) => ({
        id: `new-${s.id}`,
        status: "new" as const,
        symbol: s.symbol,
        assetId: s.assetId,
        date: s.date,
        shares: s.shares,
        dividendPerShare: s.dividendPerShare,
        amount: s.amount,
        currency: s.currency,
        payDate: s.payDate,
        accountId: s.accountId,
        accountName: accountNameMap.get(s.accountId),
        availableAccountIds: s.availableAccountIds,
      })),
    [suggestions, accountNameMap],
  );

  const { localData, setLocalData, onDataChange, dataKey } =
    useLocalDividendData(newRows, existingRows);

  const { save, saving } = useSaveDividends(ctx);

  const symbolOptions = useMemo(() => {
    const symbols = Array.from(new Set(localData.map((s) => s.symbol))).sort();
    return symbols.map((sym) => ({ label: sym, value: sym }));
  }, [localData]);

  const accountOptions = useMemo(() => {
    const accounts = new Map<string, string>();
    for (const r of localData) {
      const name =
        r.accountName ?? accountNameMap.get(r.accountId) ?? r.accountId;
      if (!accounts.has(r.accountId)) accounts.set(r.accountId, name);
    }
    return Array.from(accounts.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [localData, accountNameMap]);

  const columns = useMemo<ColumnDef<DividendRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllRowsSelected() ||
              (table.getIsSomeRowsSelected() && "indeterminate")
            }
            onCheckedChange={(checked) =>
              table.toggleAllRowsSelected(Boolean(checked))
            }
            aria-label="Select all rows"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
            disabled={!row.getCanSelect()}
            aria-label="Select row"
          />
        ),
        size: 32,
        minSize: 32,
        maxSize: 32,
        enableSorting: false,
        enableResizing: false,
      },
      {
        id: "status",
        accessorKey: "status",
        header: () => null,
        size: 90,
        minSize: 90,
        maxSize: 90,
        enableSorting: false,
        enableResizing: false,
        filterFn: (row, _id, filterValue: string[]) =>
          filterValue.includes(row.original.status),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Badge
              variant={row.original.status === "new" ? "default" : "secondary"}
              className="font-normal capitalize"
            >
              {row.original.status}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: "symbol",
        header: "Symbol",
        size: 140,
        filterFn: (row, _id, filterValue: string[]) =>
          filterValue.includes(row.original.symbol),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <TickerAvatar symbol={row.original.symbol} />
            <span className="font-mono text-sm font-medium">
              {row.original.symbol}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "date",
        header: "Ex-Date",
        size: 120,
        filterFn: (row, _id, filterValue: DateRange) => {
          if (!filterValue?.from && !filterValue?.to) return true;
          const d = new Date(row.original.date + "T00:00:00");
          if (filterValue.from && d < filterValue.from) return false;
          if (filterValue.to && d > filterValue.to) return false;
          return true;
        },
        cell: ({ row }) => (
          <span className="text-sm">
            {format(new Date(row.original.date + "T00:00:00"), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "payDate",
        header: "Pay-Date",
        size: 140,
        meta: { cell: { variant: "date-input" as const } },
      },
      {
        accessorKey: "shares",
        header: "Shares",
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.shares != null ? row.original.shares : "—"}
          </span>
        ),
      },
      {
        accessorKey: "dividendPerShare",
        header: "Dividend",
        size: 100,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.dividendPerShare != null
              ? row.original.dividendPerShare.toFixed(4)
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        size: 120,
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.status === "existing") {
            return isBalanceHidden ? (
              <span>••••</span>
            ) : (
              <span className="text-sm tabular-nums">
                {formatAmount(row.original.amount, row.original.currency)}
              </span>
            );
          }
          return undefined;
        },
        meta: { cell: { variant: "number" as const, step: 0.0001 } },
      },
      {
        accessorKey: "currency",
        header: "Currency",
        size: 90,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.currency}</span>
        ),
      },
      {
        accessorKey: "accountId",
        header: "Account",
        size: 180,
        enableSorting: false,
        filterFn: (row, _id, filterValue: string[]) =>
          filterValue.includes(row.original.accountId),
        cell: ({ row }) => {
          if (row.original.status === "existing") {
            return (
              <span className="text-sm">
                {row.original.accountName ?? row.original.accountId}
              </span>
            );
          }
          return undefined;
        },
        meta: {
          cell: {
            variant: "select" as const,
            options: ((rowData: unknown) => {
              const r = rowData as DividendRow;
              return r.availableAccountIds.map((aid) => ({
                value: aid,
                label: accountNameMap.get(aid) ?? aid,
              }));
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any,
          },
        },
      },
    ],
    [accountNameMap, isBalanceHidden],
  );

  const tableRef = useRef<ReturnType<typeof useDataGrid<DividendRow>>["table"]>(
    null!,
  );

  const getCellState = useCallback((rowIndex: number, _columnId: string) => {
    // DataGrid calls this with the virtualizer's index, which matches the
    // position in `table.getRowModel().rows` — the post-filter/sort model.
    const row = tableRef.current?.getRowModel().rows[rowIndex]?.original;
    if (!row || row.status !== "existing") return null;
    return { type: "success" as const, messages: [] };
  }, []);

  const dataGrid = useDataGrid<DividendRow>({
    data: localData,
    columns,
    getRowId: (row) => row.id,
    enableRowSelection: (row) => row.original.status === "new",
    enableMultiRowSelection: true,
    enableSorting: true,
    enableSearch: true,
    enableColumnFilters: true,
    enableGlobalFilter: true,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const q = filterValue.toLowerCase();
      return (
        row.original.symbol.toLowerCase().includes(q) ||
        (row.original.accountName ?? "").toLowerCase().includes(q) ||
        (accountNameMap.get(row.original.accountId) ?? "")
          .toLowerCase()
          .includes(q)
      );
    },
    onDataChange,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta: { getCellState } as any,
    initialState: {
      sorting: [{ id: "date", desc: true }],
    },
  });

  const { table } = dataGrid;
  tableRef.current = table;

  useEffect(() => {
    table
      .getColumn("symbol")
      ?.setFilterValue(
        symbolFilter.size > 0 ? Array.from(symbolFilter) : undefined,
      );
  }, [symbolFilter, table]);

  useEffect(() => {
    table
      .getColumn("accountId")
      ?.setFilterValue(
        accountFilter.size > 0 ? Array.from(accountFilter) : undefined,
      );
  }, [accountFilter, table]);

  useEffect(() => {
    table
      .getColumn("status")
      ?.setFilterValue(
        statusFilter.size > 0 ? Array.from(statusFilter) : undefined,
      );
  }, [statusFilter, table]);

  useEffect(() => {
    table.setGlobalFilter(search || undefined);
  }, [search, table]);

  useEffect(() => {
    table
      .getColumn("date")
      ?.setFilterValue(
        dateRange?.from || dateRange?.to ? dateRange : undefined,
      );
  }, [dateRange, table]);

  // Auto-select all new rows when the underlying data set changes.
  // `dataKey` is a string hash of all row ids — it changes only when rows are
  // added/removed (not when the user edits a row), so per-row edits don't
  // reset the selection. Including `localData` would re-run on every edit.
  useEffect(() => {
    if (localData.length > 0) {
      const selection: Record<string, boolean> = {};
      for (const r of localData) {
        if (r.status === "new") selection[r.id] = true;
      }
      table.setRowSelection(selection);
    }
  }, [dataKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hide low-priority columns on mobile to keep the grid readable
  useEffect(() => {
    table.setColumnVisibility({
      payDate: !isMobile,
      shares: !isMobile,
      dividendPerShare: !isMobile,
      currency: !isMobile,
    });
  }, [isMobile, table]);

  // Seed the staged (draft) filters from the committed filters only when the
  // sheet opens — we deliberately don't re-sync on every committed-filter
  // change, otherwise the user's in-progress edits would be clobbered.
  useEffect(() => {
    if (filterSheetOpen) {
      setLocalStatusFilter(new Set(statusFilter));
      setLocalSymbolFilter(new Set(symbolFilter));
      setLocalAccountFilter(new Set(accountFilter));
      setLocalDateRange(dateRange);
    }
  }, [filterSheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilters = () => {
    setStatusFilter(localStatusFilter);
    setSymbolFilter(localSymbolFilter);
    setAccountFilter(localAccountFilter);
    setDateRange(localDateRange);
    setFilterSheetOpen(false);
  };

  const [editRow, setEditRow] = useState<DividendRow | null>(null);
  const [editLocal, setEditLocal] = useState<Partial<DividendRow>>({});

  const openEditRow = (item: DividendRow) => {
    setEditRow(item);
    setEditLocal({
      accountId: item.accountId,
      amount: item.amount,
      payDate: item.payDate,
    });
  };

  const handleSaveEdit = () => {
    if (!editRow) return;
    setLocalData((prev) =>
      prev.map((r) => (r.id === editRow.id ? { ...r, ...editLocal } : r)),
    );
    setEditRow(null);
  };

  const handleSave = async () => {
    const selected = table
      .getSelectedRowModel()
      .rows.map((r) => r.original)
      .filter((r) => r.status === "new");
    if (selected.length === 0) return;
    await save(selected);
  };

  const selectedCount = table.getSelectedRowModel().rows.length;
  const newCount = localData.filter((r) => r.status === "new").length;
  const hasActiveFilters =
    symbolFilter.size > 0 ||
    accountFilter.size > 0 ||
    statusFilter.size > 0 ||
    search.length > 0 ||
    !!(dateRange?.from || dateRange?.to);

  const errorBanner =
    errors.length > 0 ? (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>
          Failed to fetch dividend data for:{" "}
          {errors.map((e) => e.symbol).join(", ")}.
          <Button
            variant="link"
            size="sm"
            className="ml-2 h-auto p-0 text-inherit underline"
            onClick={() =>
              ctx.api.query.invalidateQueries(["market-dividends"])
            }
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    ) : null;

  if (isLoading) {
    return (
      <>
        {errorBanner}
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
          <Icons.Loader size={16} className="animate-spin" />
          Loading dividend data...
        </div>
      </>
    );
  }

  if (localData.length === 0) {
    return (
      <>
        {errorBanner}
        <div className="text-muted-foreground py-12 text-center text-sm">
          <Icons.Check size={20} className="mx-auto mb-2 opacity-50" />
          No dividends found.
        </div>
      </>
    );
  }

  if (isMobile) {
    const DATE_PRESETS_MOBILE = [
      {
        label: "Last month",
        from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
        to: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
      },
      {
        label: "Last 3 months",
        from: new Date(
          new Date().getFullYear(),
          new Date().getMonth() - 3,
          new Date().getDate(),
        ),
        to: new Date(),
      },
      {
        label: "Last 6 months",
        from: new Date(
          new Date().getFullYear(),
          new Date().getMonth() - 6,
          new Date().getDate(),
        ),
        to: new Date(),
      },
      {
        label: "Last 12 months",
        from: new Date(
          new Date().getFullYear(),
          new Date().getMonth() - 12,
          new Date().getDate(),
        ),
        to: new Date(),
      },
      {
        label: "This year",
        from: new Date(new Date().getFullYear(), 0, 1),
        to: new Date(),
      },
    ];

    return (
      <TooltipProvider>
        <div className="flex min-h-0 flex-1 flex-col space-y-3">
          {errorBanner}

          {/* Mobile toolbar: search + filter icon + actions */}
          <div className="flex shrink-0 items-center gap-2">
            <FacetedSearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch("")}
              placeholder="Search..."
              className="h-10 min-w-0 flex-1 rounded-full border-none"
            />
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => setFilterSheetOpen(true)}
            >
              <div className="relative">
                <Icons.ListFilter className="h-4 w-4" />
                {hasActiveFilters && (
                  <span className="bg-primary absolute -left-[1.5px] -top-1 h-2 w-2 rounded-full" />
                )}
              </div>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              onClick={() =>
                ctx.api.query.invalidateQueries(["market-dividends"])
              }
              disabled={isLoading}
            >
              <Icons.RefreshCw
                size={14}
                className={isLoading ? "animate-spin" : ""}
              />
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              disabled={saving || selectedCount === 0}
            >
              {saving ? (
                <Icons.Loader size={14} className="animate-spin" />
              ) : (
                <>
                  <Icons.Plus size={14} />
                  {selectedCount}
                </>
              )}
            </Button>
          </div>

          {/* Filter sheet — activity-style bottom sheet */}
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetContent
              side="bottom"
              className="rounded-t-4xl mx-1 flex h-[80vh] flex-col"
            >
              <SheetHeader className="text-left">
                <SheetTitle>Filter Dividends</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 py-4">
                <div className="space-y-6 pr-4">
                  {/* Status */}
                  <div>
                    <h4 className="mb-3 font-medium">Status</h4>
                    <ul className="space-y-1">
                      <li
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-md p-2 text-sm",
                          localStatusFilter.size === 0
                            ? "bg-accent"
                            : "hover:bg-accent/50",
                        )}
                        onClick={() => setLocalStatusFilter(new Set())}
                      >
                        <span>All</span>
                        {localStatusFilter.size === 0 && (
                          <Icons.Check className="h-4 w-4" />
                        )}
                      </li>
                      {STATUS_OPTIONS.map(({ label, value }) => (
                        <li
                          key={value}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-md p-2 text-sm",
                            localStatusFilter.has(value)
                              ? "bg-accent"
                              : "hover:bg-accent/50",
                          )}
                          onClick={() => {
                            const next = new Set(localStatusFilter);
                            if (next.has(value)) next.delete(value);
                            else next.add(value);
                            setLocalStatusFilter(next);
                          }}
                        >
                          <span>{label}</span>
                          {localStatusFilter.has(value) && (
                            <Icons.Check className="h-4 w-4" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Symbol */}
                  <div>
                    <h4 className="mb-3 font-medium">Symbol</h4>
                    <ul className="space-y-1">
                      <li
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-md p-2 text-sm",
                          localSymbolFilter.size === 0
                            ? "bg-accent"
                            : "hover:bg-accent/50",
                        )}
                        onClick={() => setLocalSymbolFilter(new Set())}
                      >
                        <span>All Symbols</span>
                        {localSymbolFilter.size === 0 && (
                          <Icons.Check className="h-4 w-4" />
                        )}
                      </li>
                      {symbolOptions.map(({ label, value }) => (
                        <li
                          key={value}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-md p-2 text-sm",
                            localSymbolFilter.has(value)
                              ? "bg-accent"
                              : "hover:bg-accent/50",
                          )}
                          onClick={() => {
                            const next = new Set(localSymbolFilter);
                            if (next.has(value)) next.delete(value);
                            else next.add(value);
                            setLocalSymbolFilter(next);
                          }}
                        >
                          <span>{label}</span>
                          {localSymbolFilter.has(value) && (
                            <Icons.Check className="h-4 w-4" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Account */}
                  <div>
                    <h4 className="mb-3 font-medium">Account</h4>
                    <ul className="space-y-1">
                      <li
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-md p-2 text-sm",
                          localAccountFilter.size === 0
                            ? "bg-accent"
                            : "hover:bg-accent/50",
                        )}
                        onClick={() => setLocalAccountFilter(new Set())}
                      >
                        <span>All Accounts</span>
                        {localAccountFilter.size === 0 && (
                          <Icons.Check className="h-4 w-4" />
                        )}
                      </li>
                      {accountOptions.map(({ label, value }) => (
                        <li
                          key={value}
                          className={cn(
                            "flex cursor-pointer items-center justify-between rounded-md p-2 text-sm",
                            localAccountFilter.has(value)
                              ? "bg-accent"
                              : "hover:bg-accent/50",
                          )}
                          onClick={() => {
                            const next = new Set(localAccountFilter);
                            if (next.has(value)) next.delete(value);
                            else next.add(value);
                            setLocalAccountFilter(next);
                          }}
                        >
                          <span>{label}</span>
                          {localAccountFilter.has(value) && (
                            <Icons.Check className="h-4 w-4" />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Date */}
                  <div>
                    <h4 className="mb-3 font-medium">Date</h4>
                    <ul className="space-y-1">
                      <li
                        className={cn(
                          "flex cursor-pointer items-center justify-between rounded-md p-2 text-sm",
                          !localDateRange?.from
                            ? "bg-accent"
                            : "hover:bg-accent/50",
                        )}
                        onClick={() => setLocalDateRange(undefined)}
                      >
                        <span>All Dates</span>
                        {!localDateRange?.from && (
                          <Icons.Check className="h-4 w-4" />
                        )}
                      </li>
                      {DATE_PRESETS_MOBILE.map(({ label, from, to }) => {
                        const isActive =
                          localDateRange?.from?.getTime() === from.getTime() &&
                          localDateRange?.to?.getTime() === to.getTime();
                        return (
                          <li
                            key={label}
                            className={cn(
                              "flex cursor-pointer items-center justify-between rounded-md p-2 text-sm",
                              isActive ? "bg-accent" : "hover:bg-accent/50",
                            )}
                            onClick={() => setLocalDateRange({ from, to })}
                          >
                            <span>{label}</span>
                            {isActive && <Icons.Check className="h-4 w-4" />}
                          </li>
                        );
                      })}
                    </ul>
                    <div
                      style={{ marginTop: "12px", display: "flex", gap: "8px" }}
                    >
                      <div style={{ flex: 1 }}>
                        <div className="text-muted-foreground mb-1 text-xs">
                          From
                        </div>
                        <input
                          type="date"
                          value={
                            localDateRange?.from
                              ? format(localDateRange.from, "yyyy-MM-dd")
                              : ""
                          }
                          onChange={(e) => {
                            const d = e.target.value
                              ? new Date(e.target.value + "T00:00:00")
                              : undefined;
                            setLocalDateRange((prev) => ({
                              from: d,
                              to: prev?.to,
                            }));
                          }}
                          className="border-input bg-background h-8 w-full rounded border px-2 text-xs outline-none"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="text-muted-foreground mb-1 text-xs">
                          To
                        </div>
                        <input
                          type="date"
                          value={
                            localDateRange?.to
                              ? format(localDateRange.to, "yyyy-MM-dd")
                              : ""
                          }
                          onChange={(e) => {
                            const d = e.target.value
                              ? new Date(e.target.value + "T00:00:00")
                              : undefined;
                            setLocalDateRange((prev) => ({
                              from: prev?.from,
                              to: d,
                            }));
                          }}
                          className="border-input bg-background h-8 w-full rounded border px-2 text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <SheetFooter className="mt-auto">
                <Button className="w-full" onClick={handleApplyFilters}>
                  Done
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Edit row sheet */}
          <Sheet
            open={editRow !== null}
            onOpenChange={(open) => !open && setEditRow(null)}
          >
            <SheetContent
              side="bottom"
              className="rounded-t-4xl mx-1 flex flex-col"
            >
              <SheetHeader className="text-left">
                <SheetTitle>{editRow?.symbol} — Edit</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label>Account</Label>
                  <Select
                    value={editLocal.accountId ?? ""}
                    onValueChange={(v) =>
                      setEditLocal((prev) => ({ ...prev, accountId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {editRow?.availableAccountIds.map((id) => (
                        <SelectItem key={id} value={id}>
                          {accountNameMap.get(id) ?? id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount ({editRow?.currency})</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={editLocal.amount ?? ""}
                    onChange={(e) =>
                      setEditLocal((prev) => ({
                        ...prev,
                        amount:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Pay Date (optional)</Label>
                  <Input
                    type="date"
                    value={editLocal.payDate ?? ""}
                    onChange={(e) =>
                      setEditLocal((prev) => ({
                        ...prev,
                        payDate: e.target.value || undefined,
                      }))
                    }
                  />
                </div>
              </div>
              <SheetFooter className="mt-auto">
                <Button className="w-full" onClick={handleSaveEdit}>
                  Save
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Mobile list */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {table.getFilteredRowModel().rows.map((row) => (
              <MobileRow
                key={row.id}
                row={row}
                isBalanceHidden={isBalanceHidden}
                accountNameMap={accountNameMap}
                onEdit={openEditRow}
              />
            ))}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-0 flex-1 flex-col space-y-3">
        {errorBanner}

        {/* Toolbar — row 1: primary actions */}
        <div className="flex items-center justify-end gap-2">
          <span className="text-muted-foreground mr-auto text-xs">
            {localData.length} total · {newCount} new
            {selectedCount > 0 && ` · ${selectedCount} selected`}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() =>
                  ctx.api.query.invalidateQueries(["market-dividends"])
                }
                disabled={isLoading}
              >
                <Icons.RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : ""}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh suggestions</TooltipContent>
          </Tooltip>
          <Button
            onClick={handleSave}
            size="sm"
            disabled={saving || selectedCount === 0}
          >
            {saving ? (
              <>
                <Icons.Loader size={14} className="mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Icons.Plus size={14} className="mr-1.5" />
                <span className="hidden sm:inline">
                  Add Selected ({selectedCount})
                </span>
                <span className="sm:hidden">{selectedCount}</span>
              </>
            )}
          </Button>
        </div>

        {/* Toolbar — row 2: all filters */}
        <div className="flex flex-wrap items-center gap-2">
          <FacetedSearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch("")}
            placeholder="Search..."
            className="h-8 min-w-0 w-[240px]"
          />
          <FacetedFilter
            title="Status"
            options={STATUS_OPTIONS}
            selectedValues={statusFilter}
            onFilterChange={setStatusFilter}
          />
          <FacetedFilter
            title="Symbol"
            options={symbolOptions}
            selectedValues={symbolFilter}
            onFilterChange={setSymbolFilter}
          />
          <FacetedFilter
            title="Account"
            options={accountOptions}
            selectedValues={accountFilter}
            onFilterChange={setAccountFilter}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5 rounded-md border-none px-3 py-1 text-sm font-medium",
                  dateRange?.from
                    ? "bg-muted/40"
                    : "shadow-inner-xs bg-muted/90",
                )}
              >
                <Icons.CalendarIcon className="h-4 w-4" />
                Date
                {dateRange?.from && (
                  <>
                    <Separator orientation="vertical" className="mx-2 h-4" />
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {format(dateRange.from, "MMM d")}
                      {dateRange.to
                        ? ` – ${format(dateRange.to, "MMM d")}`
                        : ""}
                    </Badge>
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <DateRangePicker
                dateRange={dateRange}
                onDateChange={setDateRange}
              />
            </PopoverContent>
          </Popover>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => {
                setSymbolFilter(new Set());
                setAccountFilter(new Set());
                setStatusFilter(new Set());
                setSearch("");
                setDateRange(undefined);
              }}
            >
              Reset
              <Icons.Close className="ml-1" size={14} />
            </Button>
          )}
        </div>

        {/* DataGrid */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <DataGrid {...dataGrid} stretchColumns height="calc(100vh - 260px)" />
        </div>
      </div>
    </TooltipProvider>
  );
}
