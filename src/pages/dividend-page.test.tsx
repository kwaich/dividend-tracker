// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { AddonContext } from "@wealthfolio/addon-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import DividendPage from "./dividend-page";

vi.mock(
  "@wealthfolio/ui",
  async () => import("../test-utils/mock-wealthfolio-ui"),
);
vi.mock("../components/suggestions", () => ({
  default: () => <div>DividendSuggestions</div>,
}));

afterEach(() => cleanup());

function makeCtx(): AddonContext {
  return {
    api: {
      accounts: { getAll: vi.fn().mockResolvedValue([]) },
      portfolio: { getHoldings: vi.fn().mockResolvedValue([]) },
      activities: {
        search: vi
          .fn()
          .mockResolvedValue({ data: [], meta: { totalRowCount: 0 } }),
        saveMany: vi.fn().mockResolvedValue({ created: [], errors: [] }),
      },
      assets: { getProfile: vi.fn().mockResolvedValue({}) },
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
      },
      toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
      },
      query: {
        getClient: vi.fn().mockReturnValue(new QueryClient()),
        invalidateQueries: vi.fn(),
        refetchQueries: vi.fn(),
      },
    },
    sidebar: { addItem: vi.fn() },
    router: { add: vi.fn() },
    onDisable: vi.fn(),
  } as unknown as AddonContext;
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("DividendPage", () => {
  it("renders page header", () => {
    renderWithQuery(<DividendPage ctx={makeCtx()} />);
    expect(screen.getByText("Dividends Importer")).toBeInTheDocument();
  });

  it("renders the suggestions component", () => {
    renderWithQuery(<DividendPage ctx={makeCtx()} />);
    expect(screen.getByText("DividendSuggestions")).toBeInTheDocument();
  });
});
