// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useStore } from "zustand/react";
import { WaitingRoom } from "./WaitingRoom";
import { gameStore } from "../store/gameStore";
import type { Player, GameConfig } from "shared/types/game";

const adminPlayer: Player = { playerId: "p1", name: "Alex", role: "admin", isConnected: true };
const newPlayer: Player = { playerId: "p2", name: "Jordan", role: "player", isConnected: true };
const settings: GameConfig = { maxPlayers: 8, rounds: 3, timeLimitSeconds: 120 };

beforeEach(() => {
  gameStore.setState({ players: [], gameStatus: "", settings: null });
});

function WaitingRoomFromStore({
  isAdmin,
  onStart,
}: {
  isAdmin: boolean;
  onStart: () => void;
}) {
  const { players, settings: s } = useStore(gameStore);
  return (
    <WaitingRoom
      inviteLink="https://game.app/play/test"
      players={players}
      isAdmin={isAdmin}
      rounds={s?.rounds ?? 3}
      timeLimitSeconds={s?.timeLimitSeconds ?? 120}
      maxPlayers={s?.maxPlayers ?? 8}
      onStart={onStart}
    />
  );
}

describe("WaitingRoom — live updates", () => {
  it("11: new player appears on game_state_update", () => {
    act(() => {
      gameStore.getState().handleGameStateUpdate({
        players: [adminPlayer],
        status: "waiting",
        settings,
      });
    });

    render(<WaitingRoomFromStore isAdmin={true} onStart={vi.fn()} />);
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.queryByText("Jordan")).not.toBeInTheDocument();

    act(() => {
      gameStore.getState().handleGameStateUpdate({
        players: [adminPlayer, newPlayer],
        status: "waiting",
        settings,
      });
    });

    expect(screen.getByText("Jordan")).toBeInTheDocument();
  });

  it("12: Start Game calls onStart handler", async () => {
    const onStart = vi.fn();
    render(
      <WaitingRoom
        inviteLink="https://game.app/play/test"
        players={[adminPlayer]}
        isAdmin={true}
        rounds={3}
        timeLimitSeconds={120}
        maxPlayers={8}
        onStart={onStart}
      />,
    );
    await userEvent.click(screen.getByTestId("start-game-button"));
    expect(onStart).toHaveBeenCalled();
  });

  it("13: store updates from game_state_update", () => {
    expect(gameStore.getState().players).toHaveLength(0);

    act(() => {
      gameStore.getState().handleGameStateUpdate({
        players: [adminPlayer, newPlayer],
        status: "waiting",
        settings,
      });
    });

    expect(gameStore.getState().players).toHaveLength(2);
    expect(gameStore.getState().players[0].name).toBe("Alex");
    expect(gameStore.getState().players[1].name).toBe("Jordan");
    expect(gameStore.getState().gameStatus).toBe("waiting");
  });
});
