// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeaderboardTable } from "./LeaderboardTable";

type Entry = {
  playerId: string;
  name: string;
  roundScore: number;
  totalScore: number;
};

describe("LeaderboardTable", () => {
  it("6: rows sorted by total score descending", () => {
    const entries: Entry[] = [
      { playerId: "p1", name: "Alice", roundScore: 30, totalScore: 100 },
      { playerId: "p2", name: "Bob", roundScore: 90, totalScore: 300 },
      { playerId: "p3", name: "Carol", roundScore: 60, totalScore: 200 },
      { playerId: "p4", name: "Dave", roundScore: 10, totalScore: 50 },
    ];
    render(<LeaderboardTable entries={entries} myPlayerId="p1" />);
    const rows = screen.getAllByTestId("leaderboard-row");
    expect(rows[0]).toHaveAttribute("data-player-id", "p2");
    expect(rows[1]).toHaveAttribute("data-player-id", "p3");
    expect(rows[2]).toHaveAttribute("data-player-id", "p1");
    expect(rows[3]).toHaveAttribute("data-player-id", "p4");
  });

  it("7: round score shown with + prefix", () => {
    const entries: Entry[] = [
      { playerId: "p1", name: "Alice", roundScore: 64, totalScore: 200 },
    ];
    render(<LeaderboardTable entries={entries} myPlayerId="p1" />);
    expect(screen.getByText("+64")).toBeInTheDocument();
  });

  it("8: current player row has data-highlighted=true", () => {
    const entries: Entry[] = [
      { playerId: "p1", name: "Alice", roundScore: 50, totalScore: 150 },
      { playerId: "p2", name: "Bob", roundScore: 80, totalScore: 250 },
    ];
    render(<LeaderboardTable entries={entries} myPlayerId="p1" />);
    const rows = screen.getAllByTestId("leaderboard-row");
    const myRow = rows.find((r) => r.getAttribute("data-player-id") === "p1");
    expect(myRow).toHaveAttribute("data-highlighted", "true");
    const otherRow = rows.find((r) => r.getAttribute("data-player-id") === "p2");
    expect(otherRow).not.toHaveAttribute("data-highlighted");
  });
});
