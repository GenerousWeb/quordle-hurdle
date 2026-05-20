import { describe, it, expect, beforeEach } from "vitest";
import { adminGames, registerAdminHandlers } from "../socket/handlers/adminHandlers";
import type { AdminGameState } from "../socket/handlers/adminHandlers";
import { games } from "./submitGuess";
import type { GameState } from "./submitGuess";

type EmittedRoom = { room: string; event: string; data: unknown };

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
  const handlers: Record<string, (payload: Record<string, string>) => void> = {};
  const socket = {
    handshake: { auth: { playerId, role } },
    emit: (_event: string, _data?: unknown) => {},
    on: (event: string, handler: (payload: Record<string, string>) => void) => {
      handlers[event] = handler;
    },
  };
  return { socket, handlers };
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

const GAME_ID = "word-dedup-test";

beforeEach(() => {
  adminGames.clear();
  games.clear();
});

describe("word deduplication — integration tests", () => {
  it("8: no word repeats across 3 rounds of the same game", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ totalRounds: 3 }));
    games.set(GAME_ID, makeGameState());

    const { io } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    // Round 1
    handlers["start_game"]({ gameId: GAME_ID });
    const round1Words = [...adminGames.get(GAME_ID)!.currentWords];

    // Transition to between_rounds to allow start_next_round
    adminGames.get(GAME_ID)!.status = "between_rounds";

    // Round 2
    handlers["start_next_round"]({ gameId: GAME_ID });
    const round2Words = [...adminGames.get(GAME_ID)!.currentWords];

    adminGames.get(GAME_ID)!.status = "between_rounds";

    // Round 3
    handlers["start_next_round"]({ gameId: GAME_ID });
    const round3Words = [...adminGames.get(GAME_ID)!.currentWords];

    const allWords = [...round1Words, ...round2Words, ...round3Words];
    expect(allWords).toHaveLength(12);
    expect(new Set(allWords).size).toBe(12);
  });

  it("9: restartGame clears usedWords so pre-restart words are eligible again", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ totalRounds: 3 }));
    games.set(GAME_ID, makeGameState());

    const { io } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    // Round 1
    handlers["start_game"]({ gameId: GAME_ID });
    const round1Words = new Set(adminGames.get(GAME_ID)!.currentWords);

    adminGames.get(GAME_ID)!.status = "between_rounds";

    // Round 2
    handlers["start_next_round"]({ gameId: GAME_ID });
    expect(adminGames.get(GAME_ID)!.usedWords.size).toBe(8);

    adminGames.get(GAME_ID)!.status = "finished";

    // Restart
    handlers["restart_game"]({ gameId: GAME_ID });
    expect(adminGames.get(GAME_ID)!.usedWords.size).toBe(0);

    // New round 1 — round1Words could appear again (usedWords reset)
    // We verify usedWords only has 4 entries after one round (not accumulating old ones)
    handlers["start_game"]({ gameId: GAME_ID });
    expect(adminGames.get(GAME_ID)!.usedWords.size).toBe(4);

    // Suppress unused variable warning for round1Words
    expect(round1Words.size).toBe(4);
  });

  it("10: shuffleWords respects usedWords — no word from confirmed rounds appears in shuffled set", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ totalRounds: 3 }));
    games.set(GAME_ID, makeGameState());

    const { io } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    // Round 1 — add 4 words to usedWords
    handlers["start_game"]({ gameId: GAME_ID });
    const usedAfterRound1 = new Set(adminGames.get(GAME_ID)!.usedWords);
    expect(usedAfterRound1.size).toBe(4);

    // Shuffle for the next potential round
    adminGames.get(GAME_ID)!.status = "between_rounds";
    handlers["shuffle_words"]({ gameId: GAME_ID });

    const shuffledWords = adminGames.get(GAME_ID)!.currentWords;
    for (const word of shuffledWords) {
      expect(usedAfterRound1.has(word)).toBe(false);
    }
  });

  it("11: usedWords is empty after restartGame (Redis key equivalent cleared)", () => {
    adminGames.set(GAME_ID, makeAdminGameState({ totalRounds: 3 }));
    games.set(GAME_ID, makeGameState());

    const { io } = createMockIo();
    const { socket, handlers } = createSocket("admin1", "admin");
    registerAdminHandlers(io, socket);

    // Play two rounds to accumulate usedWords
    handlers["start_game"]({ gameId: GAME_ID });
    adminGames.get(GAME_ID)!.status = "between_rounds";
    handlers["start_next_round"]({ gameId: GAME_ID });
    expect(adminGames.get(GAME_ID)!.usedWords.size).toBe(8);

    adminGames.get(GAME_ID)!.status = "finished";
    handlers["restart_game"]({ gameId: GAME_ID });

    // Equivalent of SCARD game:{id}:usedWords === 0
    expect(adminGames.get(GAME_ID)!.usedWords.size).toBe(0);
  });
});
