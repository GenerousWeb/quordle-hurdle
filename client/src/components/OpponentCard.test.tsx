// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OpponentCard } from "./OpponentCard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyOpponentCard = OpponentCard as any;

describe("OpponentCard — static UI", () => {
  it("1: shows opponent name", () => {
    render(<AnyOpponentCard name="Sam" score={0} boardsSolved={0} isConnected={true} />);
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });

  it("2: shows current score", () => {
    render(<AnyOpponentCard name="Sam" score={124} boardsSolved={0} isConnected={true} />);
    expect(screen.getByText("124")).toBeInTheDocument();
  });

  it("3: 0 pips filled for 0 boards solved", () => {
    const { container } = render(
      <AnyOpponentCard name="Sam" score={0} boardsSolved={0} isConnected={true} />,
    );
    expect(container.querySelectorAll('[data-pip="filled"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-pip="empty"]')).toHaveLength(4);
  });

  it("4: 2 pips filled for 2 boards solved", () => {
    const { container } = render(
      <AnyOpponentCard name="Sam" score={0} boardsSolved={2} isConnected={true} />,
    );
    expect(container.querySelectorAll('[data-pip="filled"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-pip="empty"]')).toHaveLength(2);
  });

  it("5: 4 pips filled for 4 boards solved", () => {
    const { container } = render(
      <AnyOpponentCard name="Sam" score={0} boardsSolved={4} isConnected={true} />,
    );
    expect(container.querySelectorAll('[data-pip="filled"]')).toHaveLength(4);
  });

  it("6: disconnected card has muted styling", () => {
    const { container } = render(
      <AnyOpponentCard name="Sam" score={0} boardsSolved={0} isConnected={false} />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveAttribute("data-connected", "false");
  });

  it("7: connected card has normal styling", () => {
    const { container } = render(
      <AnyOpponentCard name="Sam" score={0} boardsSolved={0} isConnected={true} />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card).not.toHaveAttribute("data-connected", "false");
  });
});
