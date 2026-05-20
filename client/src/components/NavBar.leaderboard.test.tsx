// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useStore } from "zustand/react";
import { gameStore } from "../store/gameStore";
import { PlayerDot } from "./PlayerDot";
import type { LeaderboardEntry } from "shared/types/game";

beforeEach(() => {
  gameStore.setState({ leaderboard: [] });
});

function NavPlayerDots({ myPlayerId }: { myPlayerId: string }) {
  const leaderboard = useStore(gameStore, (s) => s.leaderboard);
  return (
    <div data-testid="nav-leaderboard">
      {leaderboard.map((entry) => (
        <PlayerDot
          key={entry.playerId}
          name={entry.name}
          score={entry.score}
          isMe={entry.playerId === myPlayerId}
        />
      ))}
    </div>
  );
}

describe("NavBar — leaderboard integration", () => {
  it("2: score badge updates when leaderboard_update received", () => {
    const initial: LeaderboardEntry[] = [
      { playerId: "p1", name: "Alex", score: 100, boardsSolved: 1 },
    ];
    act(() => {
      gameStore.getState().handleLeaderboardUpdate({ leaderboard: initial });
    });

    render(<NavPlayerDots myPlayerId="p2" />);
    expect(screen.getByTestId("player-score-badge")).toHaveTextContent("100");

    const updated: LeaderboardEntry[] = [
      { playerId: "p1", name: "Alex", score: 200, boardsSolved: 2 },
    ];
    act(() => {
      gameStore.getState().handleLeaderboardUpdate({ leaderboard: updated });
    });

    expect(screen.getByTestId("player-score-badge")).toHaveTextContent("200");
  });

  it("4: all players rendered as dots when 4-player leaderboard received", () => {
    const entries: LeaderboardEntry[] = [
      { playerId: "p1", name: "Alex", score: 100, boardsSolved: 1 },
      { playerId: "p2", name: "Sam", score: 80, boardsSolved: 1 },
      { playerId: "p3", name: "Jo", score: 60, boardsSolved: 0 },
      { playerId: "p4", name: "Kim", score: 40, boardsSolved: 0 },
    ];
    act(() => {
      gameStore.getState().handleLeaderboardUpdate({ leaderboard: entries });
    });

    render(<NavPlayerDots myPlayerId="p1" />);
    expect(screen.getAllByTestId("player-score-badge")).toHaveLength(4);
  });

  it("5: new player dot appears when added to leaderboard update", () => {
    const initial: LeaderboardEntry[] = [
      { playerId: "p1", name: "Alex", score: 100, boardsSolved: 1 },
    ];
    act(() => {
      gameStore.getState().handleLeaderboardUpdate({ leaderboard: initial });
    });

    render(<NavPlayerDots myPlayerId="p1" />);
    expect(screen.getAllByTestId("player-score-badge")).toHaveLength(1);

    const withNew: LeaderboardEntry[] = [
      { playerId: "p1", name: "Alex", score: 100, boardsSolved: 1 },
      { playerId: "p2", name: "Sam", score: 50, boardsSolved: 0 },
    ];
    act(() => {
      gameStore.getState().handleLeaderboardUpdate({ leaderboard: withNew });
    });

    expect(screen.getAllByTestId("player-score-badge")).toHaveLength(2);
  });
});
