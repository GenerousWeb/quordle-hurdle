// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerDot } from "./PlayerDot";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyPlayerDot = PlayerDot as any;

describe("PlayerDot — score badge", () => {
  it("1: score badge shows player score", () => {
    render(<AnyPlayerDot name="Alex" score={158} isMe={false} />);
    expect(screen.getByTestId("player-score-badge")).toHaveTextContent("158");
  });

  it("3: current player dot has distinct styling when isMe=true", () => {
    const { container } = render(<AnyPlayerDot name="Alex" score={158} isMe={true} />);
    const dot = container.firstChild as HTMLElement;
    expect(dot).toHaveAttribute("data-me", "true");
  });
});
