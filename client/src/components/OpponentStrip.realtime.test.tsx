// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useStore } from "zustand/react";
import { OpponentStrip } from "./OpponentStrip";
import { gameStore } from "../store/gameStore";
import type { LeaderboardEntry, Player } from "shared/types/game";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyOpponentStrip = OpponentStrip as any;

const MY_PLAYER_ID = "me";

beforeEach(() => {
  gameStore.setState({ players: [], leaderboard: [], gameStatus: "", settings: null });
});

type Opponent = LeaderboardEntry & { isConnected: boolean };

function computeOpponents(
  leaderboard: LeaderboardEntry[],
  players: Player[],
  myPlayerId: string,
): Opponent[] {
  const leaderboardMap = new Map(leaderboard.map((e) => [e.playerId, e]));
  return players
    .filter((p) => p.playerId !== myPlayerId)
    .map((p) => {
      const lb = leaderboardMap.get(p.playerId);
      return {
        playerId: p.playerId,
        name: p.name,
        score: lb?.score ?? 0,
        boardsSolved: lb?.boardsSolved ?? 0,
        isConnected: p.isConnected,
      };
    });
}

function OpponentStripFromStore({ myPlayerId }: { myPlayerId: string }) {
  const leaderboard = useStore(gameStore, (s) => s.leaderboard);
  const players = useStore(gameStore, (s) => s.players);
  const opponents = computeOpponents(leaderboard, players, myPlayerId);
  return <AnyOpponentStrip opponents={opponents} myPlayerId={myPlayerId} />;
}

describe("OpponentStrip — real-time updates", () => {
  it("10: pip count updates on leaderboard_update", () => {
    act(() => {
      gameStore.getState().handleGameStateUpdate({
        players: [{ playerId: "opp1", name: "Sam", role: "player", isConnected: true }],
        status: "active",
        settings: { maxPlayers: 4, rounds: 3, timeLimitSeconds: 120 },
      });
      gameStore.getState().handleLeaderboardUpdate({
        leaderboard: [{ playerId: "opp1", name: "Sam", score: 50, boardsSolved: 0 }],
      });
    });

    render(<OpponentStripFromStore myPlayerId={MY_PLAYER_ID} />);
    expect(document.querySelectorAll('[data-pip="filled"]')).toHaveLength(0);

    act(() => {
      gameStore.getState().handleLeaderboardUpdate({
        leaderboard: [{ playerId: "opp1", name: "Sam", score: 50, boardsSolved: 2 }],
      });
    });

    expect(document.querySelectorAll('[data-pip="filled"]')).toHaveLength(2);
  });

  it("11: score updates on leaderboard_update", () => {
    act(() => {
      gameStore.getState().handleGameStateUpdate({
        players: [{ playerId: "opp1", name: "Sam", role: "player", isConnected: true }],
        status: "active",
        settings: { maxPlayers: 4, rounds: 3, timeLimitSeconds: 120 },
      });
      gameStore.getState().handleLeaderboardUpdate({
        leaderboard: [{ playerId: "opp1", name: "Sam", score: 50, boardsSolved: 0 }],
      });
    });

    render(<OpponentStripFromStore myPlayerId={MY_PLAYER_ID} />);
    expect(screen.getByText("50")).toBeInTheDocument();

    act(() => {
      gameStore.getState().handleLeaderboardUpdate({
        leaderboard: [{ playerId: "opp1", name: "Sam", score: 200, boardsSolved: 0 }],
      });
    });

    expect(screen.getByText("200")).toBeInTheDocument();
  });

  it("12: card goes muted on game_state_update disconnect", () => {
    act(() => {
      gameStore.getState().handleGameStateUpdate({
        players: [{ playerId: "opp1", name: "Sam", role: "player", isConnected: true }],
        status: "active",
        settings: { maxPlayers: 4, rounds: 3, timeLimitSeconds: 120 },
      });
      gameStore.getState().handleLeaderboardUpdate({
        leaderboard: [{ playerId: "opp1", name: "Sam", score: 50, boardsSolved: 0 }],
      });
    });

    render(<OpponentStripFromStore myPlayerId={MY_PLAYER_ID} />);
    expect(document.querySelector('[data-connected="false"]')).not.toBeInTheDocument();

    act(() => {
      gameStore.getState().handleGameStateUpdate({
        players: [{ playerId: "opp1", name: "Sam", role: "player", isConnected: false }],
        status: "active",
        settings: { maxPlayers: 4, rounds: 3, timeLimitSeconds: 120 },
      });
    });

    expect(document.querySelector('[data-connected="false"]')).toBeInTheDocument();
  });

  it("13: new opponent appears on game_state_update", () => {
    act(() => {
      gameStore.getState().handleGameStateUpdate({
        players: [{ playerId: "opp1", name: "Sam", role: "player", isConnected: true }],
        status: "active",
        settings: { maxPlayers: 4, rounds: 3, timeLimitSeconds: 120 },
      });
    });

    render(<OpponentStripFromStore myPlayerId={MY_PLAYER_ID} />);
    expect(screen.getByText("Sam")).toBeInTheDocument();
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();

    act(() => {
      gameStore.getState().handleGameStateUpdate({
        players: [
          { playerId: "opp1", name: "Sam", role: "player", isConnected: true },
          { playerId: "opp2", name: "Jordan", role: "player", isConnected: true },
        ],
        status: "active",
        settings: { maxPlayers: 4, rounds: 3, timeLimitSeconds: 120 },
      });
    });

    expect(screen.getByText("Jordan")).toBeInTheDocument();
  });
});
