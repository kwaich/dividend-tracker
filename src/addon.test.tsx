// @vitest-environment jsdom
import { cleanup } from "@testing-library/react";
import type { AddonContext } from "@wealthfolio/addon-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import enable from "./addon";

vi.mock(
  "@wealthfolio/ui",
  async () => import("./test-utils/mock-wealthfolio-ui"),
);
vi.mock("./pages/dividend-page", () => ({ default: () => null }));

afterEach(() => cleanup());

function makeCtx(): AddonContext {
  return {
    api: {
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        trace: vi.fn(),
      },
      query: { getClient: vi.fn() },
    },
    sidebar: {
      addItem: vi.fn().mockReturnValue({ remove: vi.fn() }),
    },
    router: { add: vi.fn() },
    onDisable: vi.fn(),
  } as unknown as AddonContext;
}

describe("addon enable", () => {
  it("calls ctx.sidebar.addItem with expected arguments", () => {
    const ctx = makeCtx();
    enable(ctx);

    expect(ctx.sidebar.addItem).toHaveBeenCalledOnce();
    expect(ctx.sidebar.addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "dividend-tracker",
        label: "Dividends",
        route: "/addons/dividend-tracker",
        order: 160,
      }),
    );
  });

  it("calls ctx.router.add to register the dividend page route", () => {
    const ctx = makeCtx();
    enable(ctx);

    expect(ctx.router.add).toHaveBeenCalledOnce();
    expect(ctx.router.add).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/addons/dividend-tracker",
      }),
    );
  });

  it("catches sidebar.addItem error and logs via ctx.api.logger.error", () => {
    const ctx = makeCtx();
    const error = new Error("sidebar exploded");
    vi.mocked(ctx.sidebar.addItem).mockImplementation(() => {
      throw error;
    });

    expect(() => enable(ctx)).toThrow(error);
    expect(ctx.api.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("sidebar exploded"),
    );
  });

  it("onDisable callback calls item.remove() and catches remove errors", () => {
    const ctx = makeCtx();
    const removeFn = vi.fn();
    vi.mocked(ctx.sidebar.addItem).mockReturnValue({ remove: removeFn });

    enable(ctx);

    // Extract the onDisable callback and invoke it
    const onDisableCb = vi.mocked(ctx.onDisable).mock.calls[0][0] as () => void;
    onDisableCb();

    expect(removeFn).toHaveBeenCalledOnce();

    // Now test that remove errors are caught and logged
    removeFn.mockImplementation(() => {
      throw new Error("remove failed");
    });
    onDisableCb();

    expect(ctx.api.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("remove failed"),
    );
  });
});
