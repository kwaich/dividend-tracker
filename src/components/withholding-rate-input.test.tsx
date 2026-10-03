// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WithholdingRateInput } from "./withholding-rate-input";

vi.mock(
  "@wealthfolio/ui",
  async () => import("../test-utils/mock-wealthfolio-ui"),
);

afterEach(() => cleanup());

describe("WithholdingRateInput", () => {
  it("commits a valid in-range rate", () => {
    const onCommit = vi.fn();
    render(
      <WithholdingRateInput id="r" ratePct={undefined} onCommit={onCommit} />,
    );

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "15" },
    });

    expect(onCommit).toHaveBeenCalledWith(15);
  });

  it("keeps an out-of-range keystroke visible without clearing the rate", () => {
    const onCommit = vi.fn();
    render(<WithholdingRateInput id="r" ratePct={10} onCommit={onCommit} />);

    const input = screen.getByRole<HTMLInputElement>("spinbutton");
    fireEvent.change(input, { target: { value: "150" } });

    // The committed rate is untouched — no wipe of the persisted value…
    expect(onCommit).not.toHaveBeenCalled();
    // …but the user still sees what they typed.
    expect(input.value).toBe("150");
  });

  it("commits undefined when the field is cleared", () => {
    const onCommit = vi.fn();
    render(<WithholdingRateInput id="r" ratePct={15} onCommit={onCommit} />);

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "" },
    });

    expect(onCommit).toHaveBeenCalledWith(undefined);
  });

  it("does not clear the rate on unparseable partial input", () => {
    const onCommit = vi.fn();
    render(<WithholdingRateInput id="r" ratePct={15} onCommit={onCommit} />);

    // A number input reports "" for partial text like "-" or "1e", flagging
    // it via validity.badInput (which jsdom doesn't implement).
    const input = screen.getByRole<HTMLInputElement>("spinbutton");
    Object.defineProperty(input, "validity", { value: { badInput: true } });
    fireEvent.change(input, { target: { value: "" } });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("reverts to the committed rate on blur", () => {
    render(<WithholdingRateInput id="r" ratePct={15} onCommit={vi.fn()} />);

    const input = screen.getByRole<HTMLInputElement>("spinbutton");
    fireEvent.change(input, { target: { value: "200" } });
    fireEvent.blur(input);

    expect(input.value).toBe("15");
  });
});
