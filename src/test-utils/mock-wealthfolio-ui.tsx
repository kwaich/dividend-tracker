/**
 * Lightweight mock factory for @wealthfolio/ui components.
 * Avoids importing real Radix UI (which brings a second React instance).
 */
import { createContext, useContext, type ReactNode } from "react";

// ── Table ──────────────────────────────────────────────────────
export const Table = ({ children }: { children: ReactNode }) => (
  <table>{children}</table>
);
export const TableHeader = ({ children }: { children: ReactNode }) => (
  <thead>{children}</thead>
);
export const TableBody = ({ children }: { children: ReactNode }) => (
  <tbody>{children}</tbody>
);
export const TableHead = ({
  children,
  ...props
}: {
  children?: ReactNode;
  [k: string]: unknown;
}) => <th {...props}>{children}</th>;
export const TableRow = ({
  children,
  ...props
}: {
  children?: ReactNode;
  [k: string]: unknown;
}) => <tr {...props}>{children}</tr>;
export const TableCell = ({
  children,
  ...props
}: {
  children?: ReactNode;
  [k: string]: unknown;
}) => <td {...props}>{children}</td>;

// ── Badge ──────────────────────────────────────────────────────
export const Badge = ({
  children,
}: {
  children?: ReactNode;
  [k: string]: unknown;
}) => <span>{children}</span>;

// ── Alert ──────────────────────────────────────────────────────
export const Alert = ({ children }: { children: ReactNode }) => (
  <div role="alert">{children}</div>
);
export const AlertDescription = ({ children }: { children: ReactNode }) => (
  <p>{children}</p>
);

// ── Button ─────────────────────────────────────────────────────
export const Button = (
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) => <button {...props} />;

// ── Checkbox ───────────────────────────────────────────────────
export const Checkbox = ({
  checked,
  onCheckedChange,
  ...props
}: {
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  [k: string]: unknown;
}) => (
  <input
    type="checkbox"
    checked={checked}
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    {...props}
  />
);

// ── Input ──────────────────────────────────────────────────────
export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} />
);

// ── DatePickerInput ────────────────────────────────────────────
export const DatePickerInput = ({
  value,
  onChange,
  placeholder,
}: {
  value?: Date | string;
  onChange?: (d: Date | undefined) => void;
  placeholder?: string;
}) => (
  <input
    type="date"
    value={
      value
        ? typeof value === "string"
          ? value
          : value.toISOString().slice(0, 10)
        : ""
    }
    onChange={(e) =>
      onChange?.(e.target.value ? new Date(e.target.value) : undefined)
    }
    placeholder={placeholder}
  />
);

// ── Select ─────────────────────────────────────────────────────
interface SelectCtx {
  value?: string;
  onValueChange?: (v: string) => void;
}
const SelectContext = createContext<SelectCtx>({});

export const Select = ({
  children,
  value,
  onValueChange,
}: {
  children: ReactNode;
  value?: string;
  onValueChange?: (v: string) => void;
}) => (
  <SelectContext.Provider value={{ value, onValueChange }}>
    {children}
  </SelectContext.Provider>
);
export const SelectTrigger = ({
  children,
  ...props
}: {
  children?: ReactNode;
  [k: string]: unknown;
}) => (
  <button role="combobox" aria-haspopup="listbox" {...props}>
    {children}
  </button>
);
export const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <span>{placeholder}</span>
);
export const SelectContent = ({ children }: { children: ReactNode }) => (
  <div>{children}</div>
);
export const SelectItem = ({
  children,
  value,
}: {
  children: ReactNode;
  value: string;
}) => {
  const { onValueChange } = useContext(SelectContext);
  return (
    <div role="option" onClick={() => onValueChange?.(value)}>
      {children}
    </div>
  );
};

// ── Tabs ───────────────────────────────────────────────────────
interface TabsCtx {
  value: string;
  onValueChange?: (v: string) => void;
}
const TabsContext = createContext<TabsCtx>({ value: "" });

export const Tabs = ({
  children,
  value,
  defaultValue,
  onValueChange,
}: {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
}) => (
  <TabsContext.Provider
    value={{ value: value ?? defaultValue ?? "", onValueChange }}
  >
    {children}
  </TabsContext.Provider>
);
export const TabsList = ({ children }: { children: ReactNode }) => (
  <div role="tablist">{children}</div>
);
export const TabsTrigger = ({
  children,
  value,
}: {
  children: ReactNode;
  value: string;
}) => {
  const { value: active, onValueChange } = useContext(TabsContext);
  return (
    <button
      role="tab"
      data-state={active === value ? "active" : "inactive"}
      onClick={() => onValueChange?.(value)}
    >
      {children}
    </button>
  );
};
export const TabsContent = ({
  children,
  value,
}: {
  children: ReactNode;
  value: string;
  [k: string]: unknown;
}) => {
  const { value: active } = useContext(TabsContext);
  return active === value ? <div>{children}</div> : null;
};

// ── Page layout ────────────────────────────────────────────────
export const Page = ({ children }: { children: ReactNode }) => (
  <div>{children}</div>
);
export const PageContent = ({ children }: { children: ReactNode }) => (
  <div>{children}</div>
);
export const PageHeader = ({ heading }: { heading?: string }) => (
  <h1>{heading}</h1>
);

// ── Icons stub ─────────────────────────────────────────────────
export const Icons = new Proxy({}, { get: () => () => null });

// ── Utility functions ──────────────────────────────────────────
export const formatAmount = (
  amount: number | string | null,
  currency: string,
) => (amount == null ? "-" : `${currency}:${Number(amount).toFixed(2)}`);

export const useBalancePrivacy = () => ({ isBalanceHidden: false });
