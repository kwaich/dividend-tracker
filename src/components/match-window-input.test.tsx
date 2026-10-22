// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchWindowInput } from "./match-window-input";

vi.mock(
  "@wealthfolio/ui",
  async () => import("../test-utils/mock-wealthfolio-ui"),
);

afterEach(() => cleanup());

describe("MatchWindowInput", () => {
  it("does not commit while typing", () => {
    const onCommit = vi.fn();
    render(<MatchWindowInput id="w" days={3} onCommit={onCommit} />);

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "1" },
    });

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("commits on blur", () => {
    const onCommit = vi.fn();
    render(<MatchWindowInput id="w" days={3} onCommit={onCommit} />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "10" } });
    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledExactlyOnceWith(10);
  });

  it("commits on Enter", () => {
    const onCommit = vi.fn();
    render(<MatchWindowInput id="w" days={3} onCommit={onCommit} />);

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onCommit).toHaveBeenCalledWith(5);
  });

  it("does not commit an unchanged value", () => {
    const onCommit = vi.fn();
    render(<MatchWindowInput id="w" days={3} onCommit={onCommit} />);

    fireEvent.blur(screen.getByRole("spinbutton"));

    expect(onCommit).not.toHaveBeenCalled();
  });

  it.each(["0", "32", "2.5", ""])(
    "reverts invalid value %j on blur",
    (value) => {
      const onCommit = vi.fn();
      render(<MatchWindowInput id="w" days={3} onCommit={onCommit} />);

      const input = screen.getByRole<HTMLInputElement>("spinbutton");
      fireEvent.change(input, { target: { value } });
      fireEvent.blur(input);

      expect(onCommit).not.toHaveBeenCalled();
      expect(input.value).toBe("3");
    },
  );
});
