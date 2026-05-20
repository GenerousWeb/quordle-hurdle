import { matchGuess } from "./matchGuess";
import { VALID_WORDS } from "./wordList";
import { calculateScore } from "./calculateScore";
import type { TileResult } from "shared/types/game";

// ---------------------------------------------------------------------------
// In-memory game state (replaces Redis for current implementation)
// ---------------------------------------------------------------------------

export type BoardState = {
  targetWord: string;
  attemptCount: number;
  status: "unsolved" | "solved" | "failed";
};

export type PlayerState = {
  score: number;
  boards: BoardState[];
};

export type GameState = {
  status: "waiting" | "active" | "ended";
  roundNumber: number;
  deadline: number; // Unix timestamp ms
  players: Map<string, PlayerState>;
};

export const games = new Map<string, GameState>();

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export type BoardResult = {
  boardIndex: number;
  result: TileResult[];
  scoreDelta: number;
  boardStatus: "unsolved" | "solved" | "failed";
};

export type GuessResultSuccess = {
  guess: string;
  totalScoreDelta: number;
  attemptNumber: number;
  boards: BoardResult[];
};

export type GuessResultError = {
  guess: string;
  error:
    | "game_not_active"
    | "stale_round"
    | "round_expired"
    | "all_boards_terminal"
    | "invalid_format"
    | "not_a_word";
};

// ---------------------------------------------------------------------------
// Handler — pure function, no I/O
// ---------------------------------------------------------------------------

export function handleSubmitGuess(
  payload: { gameId: string; roundNumber: number; guess: string },
  playerId: string,
): GuessResultSuccess | GuessResultError | null {
  const { gameId, roundNumber, guess } = payload;

  // 1. Game exists (silently ignored if not)
  const game = games.get(gameId);
  if (!game) return null;

  // 2. Game is active
  if (game.status !== "active") return { guess, error: "game_not_active" };

  // 3. Round number matches
  if (game.roundNumber !== roundNumber) return { guess, error: "stale_round" };

  // 4. Deadline not passed
  if (Date.now() > game.deadline) return { guess, error: "round_expired" };

  // 5. Player has at least one unsolved board
  const player = game.players.get(playerId);
  if (!player) return null;

  const unsolvedIndices = player.boards
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.status === "unsolved")
    .map(({ i }) => i);

  if (unsolvedIndices.length === 0) return { guess, error: "all_boards_terminal" };

  // 6. Valid format — exactly 5 alphabetic characters
  if (!/^[a-zA-Z]{5}$/.test(guess)) return { guess, error: "invalid_format" };

  // 7. Word exists in list
  if (!VALID_WORDS.has(guess.toLowerCase())) return { guess, error: "not_a_word" };

  // Evaluate each unsolved board independently
  const secondsRemaining = Math.max(0, Math.floor((game.deadline - Date.now()) / 1000));
  const boardResults: BoardResult[] = [];
  let attemptNumber = 0;

  for (const idx of unsolvedIndices) {
    const board = player.boards[idx];
    const result = matchGuess(guess, board.targetWord);
    const solved = result.every((r) => r === "green");

    board.attemptCount += 1;
    attemptNumber = Math.max(attemptNumber, board.attemptCount);

    let boardStatus: "unsolved" | "solved" | "failed";
    if (solved) {
      boardStatus = "solved";
      board.status = "solved";
    } else if (board.attemptCount >= 9) {
      boardStatus = "failed";
      board.status = "failed";
    } else {
      boardStatus = "unsolved";
    }

    // Early-finish bonus: only applies when this solve makes all boards terminal
    const allTerminalNow =
      solved && player.boards.every((b) => b.status === "solved" || b.status === "failed");
    const scoreDelta = calculateScore(result, solved, allTerminalNow, secondsRemaining);

    player.score += scoreDelta;
    boardResults.push({ boardIndex: idx, result, scoreDelta, boardStatus });
  }

  const totalScoreDelta = boardResults.reduce((s, b) => s + b.scoreDelta, 0);

  return { guess, totalScoreDelta, attemptNumber, boards: boardResults };
}
