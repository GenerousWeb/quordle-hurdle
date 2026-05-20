import { describe, it, expect, beforeEach } from "vitest";
import {
  handleJoinGame,
  gamePlayers,
  gameDeadlines,
  handlePlayerDisconnect,
  handlePlayerJoinSocket,
} from "./joinGame";
import { handleCreateGame, gameSessions } from "./createGame";

function createMockIo() {
  const emitted: { room: string; event: string; data: unknown }[] = [];
  const io = {
    to: (room: string) => ({
      emit: (event: string, data?: unknown) => {
        emitted.push({ room, event, data });
      },
    }),
  };
  return { io, emitted };
}

describe("Reconnection — server-side matching", () => {
  let gameId: string;
  let playerId: string;

  beforeEach(() => {
    gameSessions.clear();
    gamePlayers.clear();
    gameDeadlines.clear();

    const createResult = handleCreateGame({
      adminName: "Alice",
      maxPlayers: 5,
      rounds: 3,
      timeLimitSeconds: 120,
    });
    if (createResult.status !== 201) throw new Error("Setup: game creation failed");
    gameId = createResult.body.gameId;

    const joinResult = handleJoinGame({ gameId, playerName: "Bob" });
    if (joinResult.status !== 200) throw new Error("Setup: join failed");
    playerId = joinResult.body.playerId;
  });

  it("1: reconnecting player matched by cookie returns same playerId", () => {
    const result = handleJoinGame({ gameId }, playerId);
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body.playerId).toBe(playerId);
  });

  it("2: slot count unchanged after reconnect", () => {
    const sizeBefore = gamePlayers.get(gameId)!.size;
    handleJoinGame({ gameId }, playerId);
    expect(gamePlayers.get(gameId)!.size).toBe(sizeBefore);
  });

  it("3: isConnected set to false on socket disconnect", () => {
    const { io } = createMockIo();
    handlePlayerDisconnect(io, gameId, playerId);
    expect(gamePlayers.get(gameId)!.get(playerId)!.isConnected).toBe(false);
  });

  it("4: isConnected set to true on join_game socket event", () => {
    const { io } = createMockIo();
    handlePlayerDisconnect(io, gameId, playerId);
    expect(gamePlayers.get(gameId)!.get(playerId)!.isConnected).toBe(false);
    handlePlayerJoinSocket(io, gameId, playerId);
    expect(gamePlayers.get(gameId)!.get(playerId)!.isConnected).toBe(true);
  });

  it("5: game_state_update fires to room on reconnect via join_game", () => {
    const { io, emitted } = createMockIo();
    handlePlayerJoinSocket(io, gameId, playerId);
    const update = emitted.find((e) => e.event === "game_state_update" && e.room === gameId);
    expect(update).toBeDefined();
  });

  it("6: game_state_update fires to room on socket disconnect", () => {
    const { io, emitted } = createMockIo();
    handlePlayerDisconnect(io, gameId, playerId);
    const update = emitted.find((e) => e.event === "game_state_update" && e.room === gameId);
    expect(update).toBeDefined();
  });

  it("7: new player without cookie creates a new slot", () => {
    const sizeBefore = gamePlayers.get(gameId)!.size;
    const result = handleJoinGame({ gameId, playerName: "Carol" });
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body.playerId).not.toBe(playerId);
    expect(gamePlayers.get(gameId)!.size).toBe(sizeBefore + 1);
  });

  it("8: reconnect to finished game returns gameStatus='finished'", () => {
    const session = gameSessions.get(gameId)!;
    session.status = "ended";
    const result = handleJoinGame({ gameId }, playerId);
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body.gameStatus).toBe("finished");
    expect(result.body.playerId).toBe(playerId);
  });
});
