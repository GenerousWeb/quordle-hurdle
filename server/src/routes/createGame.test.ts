import { describe, it, expect, beforeEach } from "vitest";
import { handleCreateGame, gameSessions } from "./createGame";

const validBody = {
  adminName: "Alice",
  maxPlayers: 10,
  rounds: 3,
  timeLimitSeconds: 120,
} as const;

describe("POST /game/create handler", () => {
  beforeEach(() => {
    gameSessions.clear();
  });

  it("11: valid body returns status 201 with gameId and inviteLink", () => {
    const result = handleCreateGame(validBody);
    expect(result.status).toBe(201);
    if (result.status !== 201) return;
    expect(result.body.gameId).toBeDefined();
    expect(typeof result.body.gameId).toBe("string");
    expect(result.body.inviteLink).toContain(result.body.gameId);
  });

  it("12: two requests produce different gameIds", () => {
    const r1 = handleCreateGame(validBody);
    const r2 = handleCreateGame({ ...validBody, adminName: "Bob" });
    if (r1.status !== 201 || r2.status !== 201) return;
    expect(r1.body.gameId).not.toBe(r2.body.gameId);
  });

  it("13: successful creation sets a session cookie header value", () => {
    const result = handleCreateGame(validBody);
    expect(result.cookie).toBeDefined();
    expect(result.cookie).toContain("HttpOnly");
    expect(result.cookie).toContain("admin");
  });

  it("14: missing adminName returns 400 with invalid_config", () => {
    const result = handleCreateGame({ maxPlayers: 10, rounds: 3, timeLimitSeconds: 120 });
    expect(result.status).toBe(400);
    if (result.status !== 400) return;
    expect(result.body.error).toBe("invalid_config");
  });

  it("15: maxPlayers=21 (out of range) returns 400", () => {
    const result = handleCreateGame({ ...validBody, maxPlayers: 21 });
    expect(result.status).toBe(400);
  });

  it("16: game session is stored after successful creation", () => {
    const result = handleCreateGame(validBody);
    if (result.status !== 201) return;
    expect(gameSessions.has(result.body.gameId)).toBe(true);
    const session = gameSessions.get(result.body.gameId);
    expect(session?.status).toBe("waiting");
    expect(session?.config.maxPlayers).toBe(10);
  });
});
