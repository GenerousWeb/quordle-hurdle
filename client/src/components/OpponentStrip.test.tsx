// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OpponentStrip } from "./OpponentStrip";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyOpponentStrip = OpponentStrip as any;

const opponents = [
  { playerId: "abc", name: "Alex", score: 100, boardsSolved: 2, isConnected: true },
  { playerId: "def", name: "Jordan", score: 50, boardsSolved: 1, isConnected: true },
];

describe("OpponentStrip — static UI", () => {
  it("8: strip excludes current player", () => {
    render(<AnyOpponentStrip opponents={opponents} myPlayerId="abc" />);
    expect(screen.queryByText("Alex")).not.toBeInTheDocument();
    expect(screen.getByText("Jordan")).toBeInTheDocument();
  });

  it("9: strip with 0 opponents renders nothing", () => {
    const { container } = render(<AnyOpponentStrip opponents={[]} myPlayerId="abc" />);
    expect(container.firstChild).toBeNull();
  });
});
