import { describe, it, expect, beforeEach, vi } from "vitest";
import { registerAdminHandlers, adminGames } from "./adminHandlers";
import type { AdminGameState } from "./adminHandlers";
import { games } from "../../game/submitGuess";
import type { GameState } from "../../game/submitGuess";

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

const GAME_ID = "game-abc";

beforeEach(() => {
  adminGames.clear();
  games.clear();
  vi.restoreAllMocks();
});

describe("adminHandlers — start_game", () => {
  it("8: start_game transitions game to active; round_started fired to room", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "waiting" }));
    games.set(GAME_ID, makeGameState({ status: "waiting" }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_game"]({ gameId: GAME_ID });

    const roundStarted = emitted.find((e) => e.event === "round_started");
    expect(roundStarted).toBeDefined();
    expect(roundStarted?.room).toBe(GAME_ID);
    expect(adminGames.get(GAME_ID)?.status).toBe("active");
  });

  it("9: start_game from non-admin rejected with not_authorized", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "waiting" }));

    const { io } = createMockIo();
    const { socket, handlers, emitted } = createSocket("player1", "player");
    registerAdminHandlers(io, socket);

    handlers["start_game"]({ gameId: GAME_ID });

    expect(emitted.some((e) => e.event === "not_authorized")).toBe(true);
    expect(adminGames.get(GAME_ID)?.status).toBe("waiting");
  });
});

describe("adminHandlers — start_next_round", () => {
  it("10: start_next_round from between_rounds fires round_started", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "between_rounds", roundNumber: 1 }));
    games.set(GAME_ID, makeGameState({ status: "active" }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_next_round"]({ gameId: GAME_ID });

    const roundStarted = emitted.find((e) => e.event === "round_started");
    expect(roundStarted).toBeDefined();
    expect(adminGames.get(GAME_ID)?.status).toBe("active");
  });

  it("11: start_next_round from wrong status is rejected", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "active", roundNumber: 1 }));

    const { io } = createMockIo();
    const { socket, handlers, emitted } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["start_next_round"]({ gameId: GAME_ID });

    expect(emitted.some((e) => e.event === "invalid_state")).toBe(true);
    expect(adminGames.get(GAME_ID)?.status).toBe("active");
  });
});

describe("adminHandlers — end_game", () => {
  it("12: end_game fires game_ended to all clients", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "active" }));
    games.set(GAME_ID, makeGameState({ status: "active" }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["end_game"]({ gameId: GAME_ID });

    expect(emitted.some((e) => e.event === "game_ended")).toBe(true);
    expect(adminGames.get(GAME_ID)?.status).toBe("finished");
  });

  it("16: end_game mid-round fires game_ended and cleans up game data", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "active", roundNumber: 2 }));
    games.set(GAME_ID, makeGameState({ status: "active", deadline: Date.now() + 60000 }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["end_game"]({ gameId: GAME_ID });

    expect(emitted.some((e) => e.event === "game_ended")).toBe(true);
    expect(adminGames.get(GAME_ID)?.status).toBe("finished");
    expect(games.has(GAME_ID)).toBe(false);
  });
});

describe("adminHandlers — restart_game", () => {
  it("13: restart_game clears all game score data", () => {
    const players = new Map([
      ["p1", { score: 150, boards: [] }],
      ["p2", { score: 200, boards: [] }],
    ]);
    adminGames.set(GAME_ID, makeAdminGameState({ status: "finished" }));
    games.set(GAME_ID, makeGameState({ status: "ended", players }));

    const { io } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["restart_game"]({ gameId: GAME_ID });

    expect(games.has(GAME_ID)).toBe(false);
  });

  it("14: restart_game clears usedWords", () => {
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
    expect(adminGames.get(GAME_ID)?.status).toBe("waiting");
  });
});

describe("adminHandlers — shuffle_words", () => {
  it("15: shuffle_words updates currentWords without emitting round_started", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ status: "waiting", currentWords: [] }));

    const { io, emitted } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    handlers["shuffle_words"]({ gameId: GAME_ID });

    expect(adminGames.get(GAME_ID)?.currentWords).toHaveLength(4);
    expect(emitted.some((e) => e.event === "round_started")).toBe(false);
  });
});
