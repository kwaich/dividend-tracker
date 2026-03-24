// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { AddonContext } from "@wealthfolio/addon-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDividendSuggestions } from "../hooks/use-dividend-suggestions";
import type { DividendSuggestion } from "../types";
import SuggestionsTab from "./suggestions-tab";

vi.mock(
  "@wealthfolio/ui",
  async () => import("../test-utils/mock-wealthfolio-ui"),
);
vi.mock("../hooks/use-dividend-suggestions", () => ({
  useDividendSuggestions: vi.fn(),
}));

const mockHook = vi.mocked(useDividendSuggestions);

afterEach(() => cleanup());

function makeSuggestion(
  overrides: Partial<DividendSuggestion> = {},
): DividendSuggestion {
  return {
    id: "s1",
    symbol: "AAPL",
    assetId: "aapl-id",
    date: "2025-06-15",
    shares: 10,
    dividendPerShare: 0.25,
    amount: 2.5,
    currency: "USD",
    accountId: "acct1",
    availableAccountIds: ["acct1"],
    ...overrides,
  };
}

function makeCtx(): AddonContext {
  return {
    api: {
      activities: {
        saveMany: vi.fn().mockResolvedValue({ created: [{}], errors: [] }),
      },
      toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
      query: { invalidateQueries: vi.fn() },
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
      },
    },
  } as unknown as AddonContext;
}

function setupMock(
  suggestions: DividendSuggestion[] = [],
  opts: {
    isLoading?: boolean;
    errors?: { symbol: string; error: Error }[];
  } = {},
) {
  mockHook.mockReturnValue({
    suggestions,
    isLoading: opts.isLoading ?? false,
    accountNameMap: new Map([
      ["acct1", "Main Brokerage"],
      ["acct2", "TFSA"],
    ]),
    errors: opts.errors ?? [],
  });
}

function renderTab(ctx = makeCtx(), onSaved = vi.fn()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={qc}>
      <SuggestionsTab ctx={ctx} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return { ...result, ctx, onSaved };
}

describe("SuggestionsTab", () => {
  it("shows loading indicator when loading", () => {
    setupMock([], { isLoading: true });
    renderTab();
    expect(screen.getByText("Loading dividend data...")).toBeInTheDocument();
  });

  it("shows empty state when no suggestions", () => {
    setupMock([]);
    renderTab();
    expect(
      screen.getByText("No missing dividends found for your current holdings."),
    ).toBeInTheDocument();
  });

  it("renders suggestion rows with symbol, amount, date, account", () => {
    setupMock([makeSuggestion()]);
    renderTab();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Jun 15, 2025")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(2.5);
    expect(screen.getByText("Main Brokerage")).toBeInTheDocument();
  });

  it("toggles row checkbox on click", () => {
    setupMock([makeSuggestion()]);
    renderTab();
    const checkboxes = screen.getAllByRole("checkbox");
    // [0] = select-all, [1] = row (auto-checked by useEffect)
    expect(checkboxes[1]).toBeChecked();
    fireEvent.click(checkboxes[1]);
    expect(checkboxes[1]).not.toBeChecked();
  });

  it("select-all checks all when some unchecked", () => {
    setupMock([
      makeSuggestion({ id: "s1" }),
      makeSuggestion({ id: "s2", symbol: "MSFT" }),
    ]);
    renderTab();
    const checkboxes = screen.getAllByRole("checkbox");
    // Uncheck first row
    fireEvent.click(checkboxes[1]);
    expect(checkboxes[1]).not.toBeChecked();
    // Click select-all to re-check all
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });

  it("select-all unchecks all when all are checked", () => {
    setupMock([
      makeSuggestion({ id: "s1" }),
      makeSuggestion({ id: "s2", symbol: "MSFT" }),
    ]);
    renderTab();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
    // All checked → toggleAll unchecks all
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
  });

  it("typing in amount input updates the override", () => {
    setupMock([makeSuggestion()]);
    renderTab();
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "99.99" } });
    expect(input).toHaveValue(99.99);
  });

  it("selecting a different account updates the override", async () => {
    setupMock([makeSuggestion({ availableAccountIds: ["acct1", "acct2"] })]);
    const { ctx } = renderTab();
    fireEvent.click(screen.getByRole("option", { name: "TFSA" }));
    fireEvent.click(screen.getByRole("button", { name: /Add Selected/ }));
    await waitFor(() => {
      expect(ctx.api.activities.saveMany).toHaveBeenCalledWith(
        expect.objectContaining({
          creates: [expect.objectContaining({ accountId: "acct2" })],
        }),
      );
    });
  });

  it("changing pay date updates the override", async () => {
    setupMock([makeSuggestion()]);
    const { container, ctx } = renderTab();
    const dateInput = container.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: "2025-07-01" } });
    fireEvent.click(screen.getByRole("button", { name: /Add Selected/ }));
    await waitFor(() => {
      expect(ctx.api.activities.saveMany).toHaveBeenCalledWith(
        expect.objectContaining({
          creates: [
            expect.objectContaining({
              activityDate: "2025-07-01",
              comment: "ex-date:2025-06-15",
            }),
          ],
        }),
      );
    });
  });

  it("save calls saveMany with correct activity shape", async () => {
    setupMock([makeSuggestion()]);
    const { ctx } = renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Add Selected/ }));
    await waitFor(() => {
      expect(ctx.api.activities.saveMany).toHaveBeenCalledWith({
        creates: [
          {
            accountId: "acct1",
            activityType: "DIVIDEND",
            activityDate: "2025-06-15",
            assetId: "aapl-id",
            symbol: { id: "aapl-id" },
            amount: 2.5,
            currency: "USD",
            isDraft: false,
            comment: null,
          },
        ],
      });
    });
  });

  it("save groups activities by accountId", async () => {
    setupMock([
      makeSuggestion({ id: "s1", accountId: "acct1" }),
      makeSuggestion({ id: "s2", accountId: "acct2", symbol: "MSFT" }),
    ]);
    const { ctx } = renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Add Selected/ }));
    await waitFor(() => {
      expect(ctx.api.activities.saveMany).toHaveBeenCalledTimes(2);
    });
  });

  it("save filters out TOTAL virtual account", async () => {
    setupMock([
      makeSuggestion({ id: "s1", accountId: "acct1" }),
      makeSuggestion({ id: "s2", accountId: "TOTAL", symbol: "MSFT" }),
    ]);
    const { ctx } = renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Add Selected/ }));
    await waitFor(() => {
      expect(ctx.api.activities.saveMany).toHaveBeenCalledTimes(1);
      expect(ctx.api.activities.saveMany).toHaveBeenCalledWith(
        expect.objectContaining({
          creates: [expect.objectContaining({ accountId: "acct1" })],
        }),
      );
    });
  });

  it("shows success toast and calls onSaved on full success", async () => {
    setupMock([makeSuggestion()]);
    const { ctx, onSaved } = renderTab();
    fireEvent.click(screen.getByRole("button", { name: /Add Selected/ }));
    await waitFor(() => {
      expect(ctx.api.toast.success).toHaveBeenCalledWith("1 dividend added");
      expect(ctx.api.query.invalidateQueries).toHaveBeenCalledWith([
        "activities",
      ]);
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it("shows warning toast on partial failure", async () => {
    setupMock([makeSuggestion()]);
    const { ctx } = renderTab();
    vi.mocked(ctx.api.activities.saveMany).mockResolvedValueOnce({
      created: [{}],
      errors: [{ message: "Duplicate" }],
    } as never);
    fireEvent.click(screen.getByRole("button", { name: /Add Selected/ }));
    await waitFor(() => {
      expect(ctx.api.toast.warning).toHaveBeenCalled();
    });
  });

  it("shows error toast on full failure", async () => {
    setupMock([makeSuggestion()]);
    const { ctx } = renderTab();
    vi.mocked(ctx.api.activities.saveMany).mockRejectedValueOnce(
      new Error("Network error"),
    );
    fireEvent.click(screen.getByRole("button", { name: /Add Selected/ }));
    await waitFor(() => {
      expect(ctx.api.toast.error).toHaveBeenCalledWith(
        "Failed to save: Network error",
      );
    });
  });

  it("save button disabled when nothing checked or while saving", async () => {
    setupMock([makeSuggestion()]);
    const { ctx } = renderTab();
    const checkboxes = screen.getAllByRole("checkbox");

    // Uncheck the row → button disabled
    fireEvent.click(checkboxes[1]);
    expect(
      screen.getByRole("button", { name: /Add Selected \(0\)/ }),
    ).toBeDisabled();

    // Re-check → button enabled
    fireEvent.click(checkboxes[1]);
    const saveBtn = screen.getByRole("button", { name: /Add Selected \(1\)/ });
    expect(saveBtn).not.toBeDisabled();

    // Start saving with never-resolving promise → button disabled
    vi.mocked(ctx.api.activities.saveMany).mockReturnValueOnce(
      new Promise(() => {}) as never,
    );
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    });
  });
});
