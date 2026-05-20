// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PodiumEntry, LeaderboardEntry } from "shared/types/game";
import { EndGame } from "./EndGame";

const PODIUM_3: PodiumEntry[] = [
  { rank: 1, name: "Alex", score: 317 },
  { rank: 2, name: "Sam", score: 252 },
  { rank: 3, name: "Jordan", score: 185 },
];

const LEADERBOARD_4: LeaderboardEntry[] = [
  { playerId: "abc", name: "Alex", score: 317, boardsSolved: 4 },
  { playerId: "def", name: "Sam", score: 252, boardsSolved: 3 },
  { playerId: "ghi", name: "Jordan", score: 185, boardsSolved: 2 },
  { playerId: "jkl", name: "Riley", score: 42, boardsSolved: 1 },
];

describe("EndGame — podium", () => {
  it("1: renders 3 podium slots for 3+ players", () => {
    render(
      <EndGame
        podium={PODIUM_3}
        finalLeaderboard={LEADERBOARD_4}
        myPlayerId="abc"
        isAdmin={false}
      />,
    );
    expect(screen.getAllByTestId("podium-slot")).toHaveLength(3);
  });

  it("2: renders 1 podium slot for 1 player", () => {
    const podium: PodiumEntry[] = [{ rank: 1, name: "Solo", score: 100 }];
    const leaderboard: LeaderboardEntry[] = [
      { playerId: "solo", name: "Solo", score: 100, boardsSolved: 4 },
    ];
    render(
      <EndGame
        podium={podium}
        finalLeaderboard={leaderboard}
        myPlayerId="solo"
        isAdmin={false}
      />,
    );
    expect(screen.getAllByTestId("podium-slot")).toHaveLength(1);
  });

  it("3: 1st place slot is visually distinct (has scale-110 styling)", () => {
    render(
      <EndGame
        podium={PODIUM_3}
        finalLeaderboard={LEADERBOARD_4}
        myPlayerId="abc"
        isAdmin={false}
      />,
    );
    const slots = screen.getAllByTestId("podium-slot");
    const firstSlot = slots.find((el) => el.getAttribute("data-rank") === "1");
    expect(firstSlot?.className).toMatch(/scale-110/);
  });

  it("4: correct player name appears in 1st podium slot", () => {
    render(
      <EndGame
        podium={PODIUM_3}
        finalLeaderboard={LEADERBOARD_4}
        myPlayerId="abc"
        isAdmin={false}
      />,
    );
    const slots = screen.getAllByTestId("podium-slot");
    const firstSlot = slots.find((el) => el.getAttribute("data-rank") === "1");
    expect(firstSlot).toHaveTextContent("Alex");
  });
});

describe("EndGame — leaderboard", () => {
  it("5: full leaderboard sorted by total score descending", () => {
    const leaderboard: LeaderboardEntry[] = [
      { playerId: "p1", name: "Charlie", score: 100, boardsSolved: 1 },
      { playerId: "p2", name: "Alice", score: 317, boardsSolved: 4 },
      { playerId: "p3", name: "Bob", score: 200, boardsSolved: 2 },
    ];
    render(
      <EndGame
        podium={PODIUM_3}
        finalLeaderboard={leaderboard}
        myPlayerId="p1"
        isAdmin={false}
      />,
    );
    const rows = screen.getAllByTestId("leaderboard-row");
    expect(rows[0]).toHaveAttribute("data-player-id", "p2");
    expect(rows[1]).toHaveAttribute("data-player-id", "p3");
    expect(rows[2]).toHaveAttribute("data-player-id", "p1");
  });

  it("6: current player row is highlighted in table", () => {
    render(
      <EndGame
        podium={PODIUM_3}
        finalLeaderboard={LEADERBOARD_4}
        myPlayerId="abc"
        isAdmin={false}
      />,
    );
    const rows = screen.getAllByTestId("leaderboard-row");
    const myRow = rows.find((r) => r.getAttribute("data-player-id") === "abc");
    expect(myRow).toHaveAttribute("data-highlighted", "true");
  });
});

describe("EndGame — admin controls", () => {
  it("7: admin sees Play Again button", () => {
    render(
      <EndGame
        podium={PODIUM_3}
        finalLeaderboard={LEADERBOARD_4}
        myPlayerId="abc"
        isAdmin={true}
        onRestartGame={vi.fn()}
      />,
    );
    expect(screen.getByTestId("play-again-button")).toBeInTheDocument();
  });

  it("8: non-admin does not see Play Again button", () => {
    render(
      <EndGame
        podium={PODIUM_3}
        finalLeaderboard={LEADERBOARD_4}
        myPlayerId="abc"
        isAdmin={false}
      />,
    );
    expect(screen.queryByTestId("play-again-button")).not.toBeInTheDocument();
  });

  it("9: Play Again button calls onRestartGame when clicked", async () => {
    const onRestartGame = vi.fn();
    render(
      <EndGame
        podium={PODIUM_3}
        finalLeaderboard={LEADERBOARD_4}
        myPlayerId="abc"
        isAdmin={true}
        onRestartGame={onRestartGame}
      />,
    );
    await userEvent.click(screen.getByTestId("play-again-button"));
    expect(onRestartGame).toHaveBeenCalledOnce();
  });
});
