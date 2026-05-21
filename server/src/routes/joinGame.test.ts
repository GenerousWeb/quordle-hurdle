import { describe, it, expect, beforeEach } from "vitest";
import { handleJoinGame, gamePlayers, gameDeadlines } from "./joinGame";
import { handleCreateGame, gameSessions } from "./createGame";

const validGameBody = {
  adminName: "Alice",
  maxPlayers: 2,
  rounds: 3,
  timeLimitSeconds: 120,
} as const;

describe("POST /game/join handler", () => {
  let gameId: string;

  beforeEach(() => {
    gameSessions.clear();
    gamePlayers.clear();
    gameDeadlines.clear();

    const result = handleCreateGame(validGameBody);
    if (result.status !== 201) throw new Error("Setup: game creation failed");
    gameId = result.body.gameId;
  });

  it("1: valid join to waiting game returns 200 with gameStatus='waiting'", () => {
    const result = handleJoinGame({ gameId, playerName: "Bob" });
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body.gameStatus).toBe("waiting");
    expect(result.body.playerId).toBeDefined();
    expect(typeof result.body.playerId).toBe("string");
  });

  it("2: valid join to active game returns deadline", () => {
    const session = gameSessions.get(gameId)!;
    session.status = "active";
    const expectedDeadline = Date.now() + 60000;
    gameDeadlines.set(gameId, expectedDeadline);

    const result = handleJoinGame({ gameId, playerName: "Bob" });
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.body.gameStatus).toBe("active");
    expect(result.body.deadline).toBe(expectedDeadline);
  });

  it("3: join to full game returns 403 with game_full", () => {
    // maxPlayers=2: admin occupies slot 1 (added by socket handler at runtime)
    const session = gameSessions.get(gameId)!;
    if (!gamePlayers.has(gameId)) gamePlayers.set(gameId, new Map());
    gamePlayers.get(gameId)!.set(session.adminPlayerId, { name: "Alice", isConnected: true, role: "admin" });
    // Bob fills slot 2 — game is now full
    handleJoinGame({ gameId, playerName: "Bob" });
    const result = handleJoinGame({ gameId, playerName: "Carol" });
    expect(result.status).toBe(403);
    if (result.status !== 403) return;
    expect(result.body.error).toBe("game_full");
  });

  it("4: join to finished game returns 409 with game_finished", () => {
    const session = gameSessions.get(gameId)!;
    session.status = "ended";

    const result = handleJoinGame({ gameId, playerName: "Bob" });
    expect(result.status).toBe(409);
    if (result.status !== 409) return;
    expect(result.body.error).toBe("game_finished");
  });

  it("5: session cookie set on successful join", () => {
    const result = handleJoinGame({ gameId, playerName: "Bob" });
    expect(result.status).toBe(200);
    if (result.status !== 200) return;
    expect(result.cookie).toBeDefined();
    expect(result.cookie).toContain("HttpOnly");
    expect(result.cookie).toContain(result.body.playerId);
  });
});
