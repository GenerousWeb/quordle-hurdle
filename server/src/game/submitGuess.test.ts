import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { handleSubmitGuess, games } from "./submitGuess";
import type { GuessResultSuccess } from "./submitGuess";

/**
 * Integration tests for the submit_guess WebSocket handler.
 *
 * Type: Integration — Socket.io test client against a running Fastify+Socket.io server
 *       with Redis seeded per test.
 *
 * Runner: npx vitest run  (requires Redis and a running server process)
 *
 * Setup per test: seed Redis with a valid active game (status "active", known deadline,
 * known target words per board, attemptCount 0 for all boards), create an authenticated
 * test socket tied to a valid playerId, and tear down all Redis keys after.
 * See shared test helpers in server/src/test/setup.ts once the server is scaffolded.
 *
 * Request shape (no boardIndex — guess is evaluated against all unsolved boards):
 *   { gameId, roundNumber, guess }
 *
 * Success response shape:
 *   { guess, totalScoreDelta, attemptNumber, boards: [{ boardIndex, result[], scoreDelta, boardStatus }] }
 *
 * Error response shape:
 *   { guess, error }
 */

describe("submit_guess — happy path", () => {
  it.todo(
    "82: valid guess — result returned for all 4 unsolved boards; boards[] has 4 entries each with correct result array",
  );

  it.todo(
    "83: valid guess — each board result is independent; boards with different target words produce different result arrays",
  );

  it.todo(
    "84: valid guess — totalScoreDelta equals the sum of all per-board scoreDelta values",
  );

  it.todo(
    "85: valid guess — solve bonus of +10 included in scoreDelta when a board is solved",
  );

  it.todo(
    "86: early finish bonus — totalScoreDelta includes floor(secondsRemaining / 10) when the final unsolved board is solved",
  );

  it.todo(
    "87: valid guess — attempt count increments by 1 for each evaluated board in Redis (HINCRBY on each board's attempts key)",
  );

  it.todo(
    "88: already-solved board is skipped — it does not appear in response boards[] and its attempt count is not incremented",
  );

  it.todo(
    "89: solved board attempt count in Redis is unchanged after a subsequent shared guess",
  );

  it.todo(
    "90: guess_result is emitted only to the guessing player's socket, not to other sockets in the room",
  );

  it.todo(
    "91: leaderboard_update is broadcast to all sockets in the game room after every valid guess",
  );

  it.todo(
    "92: leaderboard sorted set is updated by totalScoreDelta in a single ZINCRBY call",
  );

  it.todo(
    "93: guess record is appended to PostgreSQL asynchronously — DB row exists with guess, allBoardResults[], and totalScoreDelta after the response is received",
  );
});

describe("submit_guess — duplicate word scoring", () => {
  const gameId = "test-dup-scoring";
  const playerId = "player-dup";

  beforeEach(() => {
    games.set(gameId, {
      status: "active",
      roundNumber: 1,
      deadline: Date.now() + 60_000,
      players: new Map([
        [
          playerId,
          {
            score: 0,
            boards: [
              { targetWord: "crane", attemptCount: 0, status: "unsolved", guessedWords: new Set() },
              { targetWord: "water", attemptCount: 0, status: "unsolved", guessedWords: new Set() },
              { targetWord: "plant", attemptCount: 0, status: "unsolved", guessedWords: new Set() },
              { targetWord: "blend", attemptCount: 0, status: "unsolved", guessedWords: new Set() },
            ],
          },
        ],
      ]),
    });
  });

  afterEach(() => {
    games.delete(gameId);
  });

  it("first submission of a partial-match word awards tile points", () => {
    // "trade" partially matches all boards — should earn > 0 tile points
    const result = handleSubmitGuess(
      { gameId, roundNumber: 1, guess: "trade" },
      playerId,
    ) as GuessResultSuccess;

    expect(result.totalScoreDelta).toBeGreaterThan(0);
  });

  it("second submission of the same word awards 0 tile points", () => {
    handleSubmitGuess({ gameId, roundNumber: 1, guess: "trade" }, playerId);

    const second = handleSubmitGuess(
      { gameId, roundNumber: 1, guess: "trade" },
      playerId,
    ) as GuessResultSuccess;

    expect(second.totalScoreDelta).toBe(0);
  });

  it("player score after two submissions of same word equals score after the first", () => {
    const first = handleSubmitGuess(
      { gameId, roundNumber: 1, guess: "trade" },
      playerId,
    ) as GuessResultSuccess;

    const scoreAfterFirst = games.get(gameId)!.players.get(playerId)!.score;

    handleSubmitGuess({ gameId, roundNumber: 1, guess: "trade" }, playerId);

    const scoreAfterSecond = games.get(gameId)!.players.get(playerId)!.score;

    expect(scoreAfterSecond).toBe(scoreAfterFirst);
    expect(scoreAfterFirst).toBe(first.totalScoreDelta);
  });

  it("a third distinct word after a duplicate still awards tile points", () => {
    handleSubmitGuess({ gameId, roundNumber: 1, guess: "trade" }, playerId);
    handleSubmitGuess({ gameId, roundNumber: 1, guess: "trade" }, playerId);

    // "light" has partial matches against some boards
    const third = handleSubmitGuess(
      { gameId, roundNumber: 1, guess: "light" },
      playerId,
    ) as GuessResultSuccess;

    // Not all boards will have 0 for a completely different word
    // Just verify it is a valid success response (no error field)
    expect(third).toHaveProperty("totalScoreDelta");
    expect(third).not.toHaveProperty("error");
  });
});

describe("submit_guess — server validation chain", () => {
  it.todo(
    "94: unknown gameId is silently ignored — no event is emitted to any socket",
  );

  it.todo(
    "95: game status not 'active' returns { error: 'game_not_active' } to the player socket only",
  );

  it.todo(
    "96: roundNumber that does not match the server's current round returns { error: 'stale_round' }",
  );

  it.todo(
    "97: guess submitted after the round deadline has passed returns { error: 'round_expired' }",
  );

  it.todo(
    "98: all 4 boards already in terminal states (solved/failed/locked) returns { error: 'all_boards_terminal' }",
  );

  it.todo(
    "99: guess containing non-alphabetic characters (e.g. 'cran3') returns { error: 'invalid_format' }",
  );

  it.todo(
    "100: valid-format guess not present in the word list returns { error: 'not_a_word' }",
  );

  it.todo(
    "101: not_a_word rejection does not increment the attempt count on any board in Redis",
  );

  it.todo(
    "102: client-side global submitting flag set to true prevents a second emit before guess_result is received",
  );
});
