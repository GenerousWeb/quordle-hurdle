import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildRoundEndedPayload } from "./roundEnd";
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

const GAME_ID = "round-end-test-game";

beforeEach(() => {
  vi.useFakeTimers();
  adminGames.clear();
  games.clear();
  gamePlayers.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("buildRoundEndedPayload — pure function", () => {
  it("sorts leaderboard by total score descending", () => {
    const payload = buildRoundEndedPayload(1, ["w1", "w2", "w3", "w4"], [
      { playerId: "p1", name: "Alice", totalScore: 100, roundStartScore: 50 },
      { playerId: "p2", name: "Bob", totalScore: 300, roundStartScore: 100 },
      { playerId: "p3", name: "Carol", totalScore: 200, roundStartScore: 75 },
    ]);
    expect(payload.leaderboard[0].playerId).toBe("p2");
    expect(payload.leaderboard[1].playerId).toBe("p3");
    expect(payload.leaderboard[2].playerId).toBe("p1");
  });

  it("computes roundScore as totalScore minus roundStartScore", () => {
    const payload = buildRoundEndedPayload(1, ["w1", "w2", "w3", "w4"], [
      { playerId: "p1", name: "Alice", totalScore: 150, roundStartScore: 80 },
    ]);
    expect(payload.leaderboard[0].roundScore).toBe(70);
    expect(payload.leaderboard[0].totalScore).toBe(150);
  });
});

describe("round_ended — timer integration (tests 9–12)", () => {
  it("9: round_ended fires to game room at deadline", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "waiting", timeLimitSeconds: 60 }));
    games.set(GAME_ID, makeGameState({ status: "waiting" }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_game"]({ gameId: GAME_ID });
    vi.advanceTimersByTime(60_000 + 100);

    const roundEndedEvents = emitted.filter((e) => e.event === "round_ended");
    expect(roundEndedEvents).toHaveLength(1);
    expect(roundEndedEvents[0].room).toBe(GAME_ID);
  });

  it("10: round_ended payload contains the current round words", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "waiting", timeLimitSeconds: 60 }));
    games.set(GAME_ID, makeGameState({ status: "waiting" }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_game"]({ gameId: GAME_ID });

    const selectedWords = adminGames.get(GAME_ID)!.currentWords;
    vi.advanceTimersByTime(60_000 + 100);

    const roundEndedEvent = emitted.find((e) => e.event === "round_ended");
    expect(roundEndedEvent).toBeDefined();
    const payload = roundEndedEvent!.data as { words: string[] };
    expect(payload.words).toEqual(selectedWords);
  });

  it("11: round_ended leaderboard sorted by totalScore descending", () => {
    const players = new Map([
      ["p1", { score: 100, boards: [] as { targetWord: string; attemptCount: number; status: "unsolved" | "solved" | "failed"; guessedWords: Set<string> }[] }],
      ["p2", { score: 300, boards: [] as { targetWord: string; attemptCount: number; status: "unsolved" | "solved" | "failed"; guessedWords: Set<string> }[] }],
      ["p3", { score: 200, boards: [] as { targetWord: string; attemptCount: number; status: "unsolved" | "solved" | "failed"; guessedWords: Set<string> }[] }],
    ]);
    gamePlayers.set(GAME_ID, new Map([
      ["p1", { name: "Alice", isConnected: true, role: "player" as const }],
      ["p2", { name: "Bob", isConnected: true, role: "player" as const }],
      ["p3", { name: "Carol", isConnected: true, role: "player" as const }],
    ]));

    adminGames.set(GAME_ID, makeAdminGameState({ status: "waiting", timeLimitSeconds: 60 }));
    games.set(GAME_ID, makeGameState({ status: "active", players }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_game"]({ gameId: GAME_ID });
    vi.advanceTimersByTime(60_000 + 100);

    const roundEndedEvent = emitted.find((e) => e.event === "round_ended");
    const payload = roundEndedEvent!.data as { leaderboard: Array<{ playerId: string; totalScore: number }> };
    expect(payload.leaderboard[0].playerId).toBe("p2");
    expect(payload.leaderboard[1].playerId).toBe("p3");
    expect(payload.leaderboard[2].playerId).toBe("p1");
  });

  it("12: adminGame status becomes between_rounds after round_ended", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "waiting", timeLimitSeconds: 60 }));
    games.set(GAME_ID, makeGameState({ status: "waiting" }));

    const { io } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_game"]({ gameId: GAME_ID });
    vi.advanceTimersByTime(60_000 + 100);

    expect(adminGames.get(GAME_ID)?.status).toBe("between_rounds");
  });
});

describe("start_next_round — state guard (tests 13–14)", () => {
  it("13: start_next_round from between_rounds fires round_started", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "between_rounds", roundNumber: 1 }));
    games.set(GAME_ID, makeGameState({ status: "active" }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_next_round"]({ gameId: GAME_ID });

    expect(emitted.some((e) => e.event === "round_started")).toBe(true);
    expect(adminGames.get(GAME_ID)?.status).toBe("active");
  });

  it("14: start_next_round rejected when not in between_rounds", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "active", roundNumber: 1 }));

    const { io } = createMockIo();
    const { socket, handlers, emitted } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_next_round"]({ gameId: GAME_ID });

    expect(emitted.some((e) => e.event === "invalid_state")).toBe(true);
    expect(adminGames.get(GAME_ID)?.status).toBe("active");
  });
});

describe("final round routing (test 15)", () => {
  it("15: end_game on final round fires game_ended", () => {
    adminGames.set(
      GAME_ID,
      makeAdminGameState({ status: "between_rounds", roundNumber: 3, totalRounds: 3 }),
    );
    games.set(GAME_ID, makeGameState({ status: "active" }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["end_game"]({ gameId: GAME_ID });

    expect(emitted.some((e) => e.event === "game_ended")).toBe(true);
    expect(adminGames.get(GAME_ID)?.status).toBe("finished");
  });
});
