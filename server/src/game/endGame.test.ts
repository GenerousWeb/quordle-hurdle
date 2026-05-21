import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildGameEndedPayload } from "./endGame";
import { adminGames, registerAdminHandlers } from "../socket/handlers/adminHandlers";
import type { AdminGameState } from "../socket/handlers/adminHandlers";
import { games } from "./submitGuess";
import type { GameState } from "./submitGuess";
import { gamePlayers } from "../routes/joinGame";

type EmittedRoom = { room: string; event: string; data: unknown };
type EmittedSocket = { event: string; data: unknown };

function createMockIo() {
  const emitted: EmittedRoom[] = [];
  const io = {
    to: (room: string) => ({
      emit: (event: string, data?: unknown) => {
        emitted.push({ room, event, data });
      },
    }),
  };
  return { io, emitted };
}

function createSocket(playerId: string, role: "admin" | "player") {
  const emitted: EmittedSocket[] = [];
  const handlers: Record<string, (payload: Record<string, string>) => void> = {};
  const socket = {
    handshake: { auth: { playerId, role } },
    emit: (event: string, data?: unknown) => {
      emitted.push({ event, data });
    },
    on: (event: string, handler: (payload: Record<string, string>) => void) => {
      handlers[event] = handler;
    },
  };
  return { socket, handlers, emitted };
}

function makeAdminGameState(overrides: Partial<AdminGameState> = {}): AdminGameState {
  return {
    status: "waiting",
    totalRounds: 3,
    roundNumber: 0,
    timeLimitSeconds: 120,
    currentWords: [],
    usedWords: new Set(),
    adminPlayerId: "admin1",
    roundStartScores: new Map(),
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    status: "waiting",
    roundNumber: 0,
    deadline: 0,
    players: new Map(),
    ...overrides,
  };
}

const GAME_ID = "endgame-test-game";

beforeEach(() => {
  vi.useFakeTimers();
  adminGames.clear();
  games.clear();
  gamePlayers.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildGameEndedPayload — pure function", () => {
  it("builds podium with top 3 players sorted by score descending", () => {
    const result = buildGameEndedPayload([
      { playerId: "p1", name: "Alice", totalScore: 100, boardsSolved: 1 },
      { playerId: "p2", name: "Bob", totalScore: 300, boardsSolved: 4 },
      { playerId: "p3", name: "Carol", totalScore: 200, boardsSolved: 3 },
      { playerId: "p4", name: "Dave", totalScore: 50, boardsSolved: 0 },
    ]);
    expect(result.podium).toHaveLength(3);
    expect(result.podium[0]).toMatchObject({ rank: 1, name: "Bob", score: 300 });
    expect(result.podium[1]).toMatchObject({ rank: 2, name: "Carol", score: 200 });
    expect(result.podium[2]).toMatchObject({ rank: 3, name: "Alice", score: 100 });
  });

  it("builds podium with 1 slot for 1 player", () => {
    const result = buildGameEndedPayload([
      { playerId: "p1", name: "Solo", totalScore: 100, boardsSolved: 4 },
    ]);
    expect(result.podium).toHaveLength(1);
    expect(result.podium[0]).toMatchObject({ rank: 1, name: "Solo" });
  });

  it("finalLeaderboard contains all players sorted by score descending", () => {
    const result = buildGameEndedPayload([
      { playerId: "p1", name: "Alice", totalScore: 100, boardsSolved: 1 },
      { playerId: "p2", name: "Bob", totalScore: 300, boardsSolved: 4 },
    ]);
    expect(result.finalLeaderboard).toHaveLength(2);
    expect(result.finalLeaderboard[0].playerId).toBe("p2");
    expect(result.finalLeaderboard[1].playerId).toBe("p1");
  });
});

describe("game_ended — event firing", () => {
  it("10: game_ended fires after final round timer expires", () => {
    adminGames.set(
      GAME_ID,
      makeAdminGameState({ status: "waiting", timeLimitSeconds: 60, totalRounds: 1 }),
    );
    games.set(GAME_ID, makeGameState({ status: "waiting" }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_game"]({ gameId: GAME_ID });
    vi.advanceTimersByTime(60_000 + 100);

    expect(emitted.some((e) => e.event === "game_ended")).toBe(true);
  });

  it("11: game_ended payload includes podium array with correct top players", () => {
    gamePlayers.set(
      GAME_ID,
      new Map([
        ["p1", { name: "Alice", isConnected: true, role: "player" as const }],
        ["p2", { name: "Bob", isConnected: true, role: "player" as const }],
        ["p3", { name: "Carol", isConnected: true, role: "player" as const }],
      ]),
    );
    const players = new Map([
      [
        "p1",
        {
          score: 100,
          boards: [] as {
            targetWord: string;
            attemptCount: number;
            status: "unsolved" | "solved" | "failed";
          }[],
        },
      ],
      [
        "p2",
        {
          score: 300,
          boards: [] as {
            targetWord: string;
            attemptCount: number;
            status: "unsolved" | "solved" | "failed";
          }[],
        },
      ],
      [
        "p3",
        {
          score: 200,
          boards: [] as {
            targetWord: string;
            attemptCount: number;
            status: "unsolved" | "solved" | "failed";
          }[],
        },
      ],
    ]);
    adminGames.set(
      GAME_ID,
      makeAdminGameState({ status: "waiting", timeLimitSeconds: 60, totalRounds: 1 }),
    );
    games.set(GAME_ID, makeGameState({ status: "active", players }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_game"]({ gameId: GAME_ID });
    vi.advanceTimersByTime(60_000 + 100);

    const gameEndedEvent = emitted.find((e) => e.event === "game_ended");
    expect(gameEndedEvent).toBeDefined();
    const payload = gameEndedEvent!.data as { podium: unknown[] };
    expect(Array.isArray(payload.podium)).toBe(true);
    expect(payload.podium.length).toBeGreaterThan(0);
  });

  it("12: game status becomes finished after end_game", () => {
    adminGames.set(
      GAME_ID,
      makeAdminGameState({ status: "active", totalRounds: 1, roundNumber: 1 }),
    );
    games.set(GAME_ID, makeGameState({ status: "active" }));

    const { io } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["end_game"]({ gameId: GAME_ID });

    expect(adminGames.get(GAME_ID)?.status).toBe("finished");
  });

  it("13: admin end_game mid-round fires game_ended immediately", () => {
    adminGames.set(
      GAME_ID,
      makeAdminGameState({ status: "active", roundNumber: 2, totalRounds: 3 }),
    );
    games.set(GAME_ID, makeGameState({ status: "active", deadline: Date.now() + 60000 }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["end_game"]({ gameId: GAME_ID });

    expect(emitted.some((e) => e.event === "game_ended")).toBe(true);
    expect(adminGames.get(GAME_ID)?.status).toBe("finished");
  });
});

describe("restart_game", () => {
  it("14: restart_game clears all game score data", () => {
    const players = new Map([
      ["p1", { score: 150, boards: [] as { targetWord: string; attemptCount: number; status: "unsolved" | "solved" | "failed" }[] }],
      ["p2", { score: 200, boards: [] as { targetWord: string; attemptCount: number; status: "unsolved" | "solved" | "failed" }[] }],
    ]);
    adminGames.set(GAME_ID, makeAdminGameState({ status: "finished" }));
    games.set(GAME_ID, makeGameState({ status: "ended", players }));

    const { io } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["restart_game"]({ gameId: GAME_ID });

    expect(games.has(GAME_ID)).toBe(false);
  });

  it("15: restart_game sets adminGame status to waiting", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "finished" }));
    games.set(GAME_ID, makeGameState({ status: "ended" }));

    const { io } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["restart_game"]({ gameId: GAME_ID });

    expect(adminGames.get(GAME_ID)?.status).toBe("waiting");
  });

  it("16: restart_game clears usedWords", () => {
    adminGames.set(
      GAME_ID,
      makeAdminGameState({
        status: "finished",
        usedWords: new Set(["apple", "grape", "crane", "flame"]),
      }),
    );
    games.set(GAME_ID, makeGameState({ status: "ended" }));

    const { io } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["restart_game"]({ gameId: GAME_ID });

    expect(adminGames.get(GAME_ID)?.usedWords.size).toBe(0);
  });

  it("17: non-admin restart_game is rejected with not_authorized", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "finished" }));

    const { io } = createMockIo();
    const { socket, handlers, emitted } = createSocket("player1", "player");
    registerAdminHandlers(io, socket);

    handlers["restart_game"]({ gameId: GAME_ID });

    expect(emitted.some((e) => e.event === "not_authorized")).toBe(true);
  });
});
