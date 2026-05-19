# Multi-Board Gameplay

## Summary

The core interactive experience of the game. Each round, a player is presented with four independent 5-letter word puzzles arranged in a 2×2 grid. They work through each board one at a time — typing guesses, reading colour-coded feedback, and refining their answers — until all four words are solved or the round timer expires. Every board tracks its own state independently. This feature is the foundation of the entire product; nothing else is meaningful without it working correctly.

---

## Goals

- A player can actively engage with four word puzzles simultaneously within a single round
- Each board provides clear, immediate feedback after every guess so the player can reason toward the answer
- The player can move freely between boards, with the active board always clearly indicated
- The round ends in a well-defined state for every board — either solved, failed, or locked by the timer — with no ambiguous or stuck states
- The experience is fast and responsive; there is no perceptible lag between typing and the board updating
- A player who joins mid-round can immediately begin guessing without any additional setup

---

## Requirements

### Boards

- Each round presents exactly four boards, fixed for MVP
- Each board targets a different 5-letter word, selected before the round begins
- All four boards are visible simultaneously in a 2×2 grid layout
- Each board operates independently — progress, feedback, and state on one board has no effect on any other board
- Each board has a maximum of 9 guess attempts
- Words across all four boards within a single round are distinct from each other
- Words are also distinct from all words used in previous rounds of the same game session — no word may repeat within a game

### Board states

Each board is in exactly one of the following states at any time:

| State | Meaning |
| ----- | ------- |
| **Active** | Currently accepting keyboard input |
| **Idle** | Visible but not currently focused; not accepting input |
| **Solved** | The correct word was guessed; board is locked with a completion highlight |
| **Failed** | All 9 attempts were used without solving; the target word is revealed below the grid |
| **Locked** | The round timer expired before the board was solved or failed; no further input accepted |

Only one board can be in the Active state at any time. Solved and Failed boards do not transition back to Active or Idle.

### Input model — shared simultaneous input

All four boards receive the same typed input simultaneously. There is no concept of a single "active" board that must be focused — every guess the player types is broadcast to all boards that are still unsolved at the moment of submission. Each board independently evaluates the guess against its own target word.

- All input is captured via physical keyboard only (no on-screen keyboard for MVP)
- Letter keys (A–Z) append a character to the shared input row, displayed identically across all unsolved boards, up to 5 characters
- Backspace removes the last typed character from the shared input row, reflected across all unsolved boards
- Enter submits the shared guess simultaneously to all unsolved boards
- If all boards have reached a terminal state (Solved, Failed, or Locked), all keyboard input is blocked
- A guess cannot be submitted if the shared input row has fewer than 5 characters

### Guess submission and feedback

- On Enter, the current 5-letter guess is submitted for evaluation against every unsolved board simultaneously
- The guess must be a valid word in the word list; if invalid, the shared row shakes across all unsolved boards and no attempt is consumed on any board
- Each submitted guess occupies one row on each unsolved board's tile grid
- After evaluation, every tile in that row is revealed on each board independently with its own colour result:
  - **Green** — correct letter in the correct position for that board's target word
  - **Yellow** — letter exists in that board's target word but in the wrong position
  - **Grey** — letter is not in that board's target word
- The same guess will produce different colour results on different boards — each board evaluates independently against its own target
- Tiles are revealed sequentially left-to-right with a card-flip animation per board; the next shared input row becomes available only after all tile animations across all unsolved boards have completed
- Only one shared guess may be in-flight at a time — submitting is blocked until all unsolved boards have received their results and animations have completed

### Solving a board

- A board is solved when all 5 tiles in a submitted row are Green for that board's target word
- On solve, that board transitions to the Solved state and is visually highlighted with a distinct completion border or glow
- The solved board no longer receives subsequent shared guesses — it is excluded from all future submissions in the same round
- All remaining unsolved boards continue receiving the shared input and guesses as normal
- No focus shift occurs — the player continues typing into the shared input row which applies to all remaining unsolved boards

### Failing a board

- A board fails when the 9th shared guess is submitted and does not solve that board's word
- On failure, that board transitions to the Failed state independently of all other boards
- The target word is displayed in a reveal row beneath that board's tile grid
- That board's tiles adopt a muted visual style to signal it is no longer in play
- All remaining unsolved boards continue receiving guesses normally
- A board can fail while other boards are still being actively guessed — each board's attempt count is tracked independently

### Round end — timer expiry

- When the round timer expires, all boards that are not yet Solved or Failed transition immediately to the Locked state
- No further input is accepted on any board after the timer expires
- Guesses submitted at the exact moment of expiry are rejected; the round_expired condition takes precedence

### Mid-round join

- A player who joins a round already in progress starts with all four boards blank
- No prior guess history is replayed or shown
- The player begins guessing with whatever time remains on the round clock
- The same board rules, focus behaviour, and input handling apply regardless of when in the round the player joins

---

## Constraints

- Number of boards is fixed at 4 for MVP; making it configurable is a future enhancement
- Word length is fixed at 5 characters
- Maximum attempts per board is fixed at 9
- Scoring (points per tile result, word solve bonus, early finish bonus) is calculated externally to this feature and is not a concern of the board or input logic
- The round timer is enforced externally; this feature only needs to respond to the timer expiring, not manage it
- The word list and word selection are managed externally; this feature consumes the selected words for a round, it does not choose them

---

## Assumptions

- Each round's four target words are provided to the boards at the moment the round starts; the boards do not need to request or wait for them
- Word validity checking (is this a real word?) is handled before the guess reaches the board — the board receives either a valid result or a rejection signal
- All four boards for a round are always present and visible; there is no scenario where fewer than four boards are shown during an active round
- A player always has exactly one active session per game; the same player cannot have two browser tabs both actively guessing in the same game

---

## Edge cases

- **Player solves all four boards before the timer expires** — all input is blocked; the player waits for the round to end naturally or for all other players to finish
- **A board fails while others are still unsolved** — the failed board exits the shared guess pool silently; subsequent shared guesses go to the remaining unsolved boards only; the player is not notified to do anything differently
- **Player submits a guess that is not in the word list** — the shared row shakes identically on all currently unsolved boards; no attempt is consumed on any board; the player corrects and retries
- **One board solves on a guess, others do not** — the solving board highlights with a completion glow; the same guess row result is shown on all boards independently; subsequent input continues for the remaining unsolved boards only
- **Multiple boards solve on the same guess** — each solving board highlights simultaneously; the round continues for any remaining unsolved boards
- **The final unsolved board solves or fails** — all boards are now in terminal states; input is blocked; the round ends or waits for the timer
- **Round timer expires mid-animation** — the current tile reveal animation completes but the guess result does not count on any board; all non-terminal boards lock immediately after the animation
- **All four boards reach a terminal state (any mix of Solved and Failed) before the timer expires** — the round ends early; this is handled by the round lifecycle, not the board feature itself
- **Player joins with less than 5 seconds remaining** — they receive blank boards and the remaining time; the shared input model applies immediately with no prior guess history shown

---

## Dependencies

This feature depends on the following being available before it can function:

- **Round timer (F3)** — the boards need to know when the round ends in order to transition to the Locked state; the timer expiry event is the trigger
- **Round lifecycle (admin controls, F8)** — a round must be started by the admin before boards are shown and words are assigned
- **Word selection** — four distinct, non-repeating words must be available at round start; word pool management and no-repeat enforcement (F10) are prerequisites
- **Tile colour feedback (F2)** — the reveal animation and colour logic are a direct part of the board experience and must be treated as inseparable from this feature in practice, even though they are defined separately

---

## Out of scope for this feature

- Scoring calculation and score display
- The round timer countdown display
- Opponent progress indicators
- The between-rounds summary screen
- Word selection and no-repeat enforcement
- Session management, joining, and reconnection
- On-screen keyboard (future enhancement)

---

## Technical Design — Guess Submission & Word Matching

Covers the end-to-end flow from a player pressing Enter to the board updating with colour feedback. This is the most latency-sensitive path in the application.

---

### Transport

Guess submission uses WebSocket (`submit_guess` event) rather than REST for two reasons:

- `leaderboard_update` must broadcast to all players in the room simultaneously — a REST response can only reply to the requester; a push channel would be needed regardless
- The player's identity (`playerId`) is already available on the socket from the handshake session cookie — no per-request auth overhead

---

### Request — `submit_guess`

Emitted by the client when the player presses Enter on a completed 5-letter row.

```json
{
  "gameId": "xK9mP2qR",
  "roundNumber": 2,
  "guess": "crane"
}
```

> `playerId` is **not** in the payload. The server resolves it from the authenticated socket session to prevent spoofing.
> There is no `boardIndex` — the guess is evaluated against every unsolved board simultaneously. The server determines which boards are unsolved from Redis state.

**Client-side guards before emitting:**

- Shared guess is exactly 5 characters (enforced by input handling)
- At least one board is still unsolved (not all in Solved, Failed, or Locked state)
- No guess currently in-flight (a global `submitting` flag is set to `true` on emit; blocks re-submission until all boards have received their `guess_result`)
- Round has not already expired client-side (belt-and-braces; server enforces authoritatively)

---

### Server-side validation chain

The server runs checks in order before the matching engine is called. Any failure emits an error back to the player's socket only — no state is written, no attempt is consumed.

| # | Check | Error code if failed |
|---|-------|----------------------|
| 1 | Socket's `playerId` is valid and in this game | *(silently ignored)* |
| 2 | Game status is `active` | `game_not_active` |
| 3 | `roundNumber` matches server's current round | `stale_round` |
| 4 | Round deadline is still in the future (Redis TTL check) | `round_expired` |
| 5 | At least one board is still unsolved for this player | `all_boards_terminal` |
| 6 | Guess is exactly 5 alphabetic characters | `invalid_format` |
| 7 | Guess exists in the valid-word Set (O(1) lookup) | `not_a_word` |

> The old per-board checks (`invalid_board`, `board_not_active`, `max_attempts_reached`) are no longer in the shared validation chain. Instead, the server iterates over each board's state in Redis and evaluates only the unsolved ones — boards already in Solved or Failed state are silently skipped.

---

### Word matching algorithm

A pure function with no I/O or side effects. Takes two 5-letter strings and returns a result array of 5 colour strings. Handles duplicate letters correctly via a two-pass approach.

**Pass 1 — identify greens and mark those target positions as consumed:**

```
result     = ["grey", "grey", "grey", "grey", "grey"]
targetUsed = [false, false, false, false, false]

for i in 0..4:
  if guess[i] === target[i]:
    result[i]     = "green"
    targetUsed[i] = true
```

**Pass 2 — identify yellows from remaining unconsumed target letters:**

```
for i in 0..4:
  if result[i] === "green": continue

  for j in 0..4:
    if targetUsed[j]: continue
    if guess[i] === target[j]:
      result[i]     = "yellow"
      targetUsed[j] = true
      break
```

**Example:** `guess = "crane"`, `target = "grove"`

| Position | 0 | 1 | 2 | 3 | 4 |
| -------- | - | - | - | - | - |
| Guess    | C | R | A | N | E |
| Target   | G | R | O | V | E |
| Result   | grey | green | grey | grey | green |

Output: `["grey", "green", "grey", "grey", "green"]`

The two-pass approach is necessary to avoid over-counting duplicate letters. If a letter appears in the guess more times than in the target, the excess occurrences must be grey, not yellow.

---

### Scoring (server-side only)

Calculated immediately after matching. The client never computes scores.

```
scoreDelta = 0

for each colour in result:
  "green"  → scoreDelta += 3
  "yellow" → scoreDelta += 1

if all 5 results are "green" (word solved):
  scoreDelta += 10

if word solved AND all 4 boards now solved (player finished round early):
  secondsRemaining = floor((deadline - now) / 1000)
  scoreDelta += floor(secondsRemaining / 10)
```

---

### Redis writes (after a valid guess)

```
HINCRBY  game:{gameId}:player:{playerId}:board:{boardIndex}:attempts  1
ZINCRBY  game:{gameId}:leaderboard  {scoreDelta}  {playerId}
```

The leaderboard sorted set enables instant ranked reads via `ZREVRANGE ... WITHSCORES` with no aggregation.

The guess record is also appended to PostgreSQL asynchronously (non-blocking — does not delay the response to the player).

---

### Responses

**`guess_result` — emitted to the guessing player's socket only:**

The response contains one entry per board, for every board the guess was evaluated against. Boards already in a terminal state at time of submission are omitted.

```json
{
  "guess": "crane",
  "totalScoreDelta": 14,
  "attemptNumber": 3,
  "boards": [
    {
      "boardIndex": 0,
      "result": ["grey", "green", "grey", "grey", "green"],
      "scoreDelta": 8,
      "boardStatus": "active"
    },
    {
      "boardIndex": 1,
      "result": ["green", "green", "green", "green", "green"],
      "scoreDelta": 25,
      "boardStatus": "solved"
    },
    {
      "boardIndex": 2,
      "result": ["grey", "grey", "grey", "grey", "grey"],
      "scoreDelta": 0,
      "boardStatus": "active"
    }
  ]
}
```

> `boardStatus` per board is one of `"active"`, `"solved"`, or `"failed"`. The client uses this to drive independent state transitions on each board.
> `attemptNumber` is shared — it is the same row number across all boards, since every board receives the same guess simultaneously.
> `totalScoreDelta` is the sum of all per-board `scoreDelta` values for this guess, applied to the player's running total in one Redis write.

**Error shape (validation failure):**

```json
{
  "guess": "crane",
  "error": "not_a_word"
}
```

**Client behaviour per error code:**

| Code | Client behaviour |
|------|-----------------|
| `not_a_word` | Shared shake animation on current input row across all unsolved boards; row not consumed; no attempt incremented on any board |
| `round_expired` | Lock all non-terminal boards immediately |
| `stale_round` | Trigger full game state refresh from server |
| `all_boards_terminal` | Should be caught client-side before emit; block input and ignore if received |

**`leaderboard_update` — broadcast to all clients in the game room:**

```json
{
  "leaderboard": [
    { "playerId": "player_abc123", "name": "Alex",   "score": 142, "boardsSolved": 2 },
    { "playerId": "player_def456", "name": "Sam",    "score": 118, "boardsSolved": 2 },
    { "playerId": "player_ghi789", "name": "Jordan", "score": 97,  "boardsSolved": 1 }
  ]
}
```

---

### Client handling on `guess_result`

1. For each entry in `boards[]`, write the result array to that board's guess history at `attemptNumber - 1` in the Zustand store
2. Clear the global `submitting` flag only after all board results have been written
3. Trigger tile flip animations simultaneously across all boards that received a result (~120ms stagger per tile per board; all boards animate in parallel)
4. After all animations across all boards have completed, clear the shared `currentInput` and make the next shared input row available
5. For each board where `boardStatus === "solved"` → transition that board to Solved state and apply the completion highlight
6. For each board where `boardStatus === "failed"` → transition that board to Failed state and reveal its target word row
7. Update the player's running score by `totalScoreDelta`

> The animation completion gate (step 3–4) waits for all boards — not just one. This keeps the shared input row in sync with all boards simultaneously.

---

### Full sequence

```
Client                        Server                      Redis / PostgreSQL
  |                               |                               |
  |-- submit_guess -----------→   |                               |
  |   {gameId, roundNumber,       |                               |
  |    guess}                     |                               |
  |                               |-- GET deadline TTL --------→  |
  |                               |← still valid --------------   |
  |                               |-- HGET board states (all) →   |
  |                               |← boards 0,1,2 unsolved ----   |
  |                               |    board 3 already solved      |
  |                               |                               |
  |                               | [validate word in Set: O(1)]  |
  |                               | [match(guess, target_0)]      |
  |                               | [match(guess, target_1)]      |
  |                               | [match(guess, target_2)]      |
  |                               | [calculate scoreDelta each]   |
  |                               |                               |
  |                               |-- HINCRBY attempts board 0 →  |
  |                               |-- HINCRBY attempts board 1 →  |
  |                               |-- HINCRBY attempts board 2 →  |
  |                               |-- ZINCRBY leaderboard -----→  |
  |                               |-- INSERT guess (async) ----→  |
  |                               |                               |
  |← guess_result  -----------    |                               |
  |  {guess, attemptNumber,       |                               |
  |   totalScoreDelta,            |                               |
  |   boards: [                   |                               |
  |    {boardIndex, result[],     |                               |
  |     scoreDelta, boardStatus}  |                               |
  |    × unsolved boards only]}   |                               |
  |                               |                               |
  |  [all room clients] ←-------  leaderboard_update             |
  |                               |                               |
  |  [animate all boards in       |                               |
  |   parallel]                   |                               |
  |  [transition solved/failed    |                               |
  |   boards independently]       |                               |
  |  [unlock shared input after   |                               |
  |   all animations done]        |                               |
```

---

### Build order

| Step | What | Why first |
|------|------|-----------|
| 1 | Matching engine (pure function + unit tests) | No dependencies; correctness must be proven before wiring anything up |
| 2 | Redis key schema for attempt counts and leaderboard | Defines the contract for all server reads/writes |
| 3 | Server-side validation chain + Socket.io handler | Wires matching engine into the event flow; emits both responses |
| 4 | Zustand board state model | Defines `submitting` flag, guess history shape, board status enum |
| 5 | Client `submit_guess` emit + `guess_result` handler | Connects store to socket events |
| 6 | Tile flip animation (triggered by store change, completion callback) | Purely visual; does not affect correctness; safe to add last |

---

## Implementation Steps

Four steps, each large enough to deliver a reviewable, testable capability. Steps are strictly ordered — each one unlocks the next.

---

### Step 1 — Matching engine and board state model

**Scope:** The server-side matching function and the client-side Zustand store that models the four boards. No UI, no network. Both pieces are pure logic that everything else depends on.

**Matching engine (server):**
- Write the pure `match(guess, target)` function using the two-pass algorithm — greens first, then yellows from remaining unconsumed letters
- Handles duplicate letters correctly: excess occurrences in the guess are grey, not yellow
- No I/O, no side effects, takes two strings and returns an array of five colour strings

**Board state model (client — Zustand store):**
- Each of the four boards tracks: `status` (`unsolved | solved | failed | locked`), `targetWord`, and `guesses` (array of submitted rows with result arrays). There is no per-board `currentInput` or `submitting` flag — these are global, shared across all boards
- A single global `currentInput: string` and `submitting: boolean` live at the store root, not on individual boards
- Store initialises four blank boards on `round_started` and exposes state transitions for all board status changes
- Transitions modelled: `unsolved → solved`, `unsolved → failed`, `unsolved → locked`

**Done when:**
- Matching engine returns correct results for all-green, all-grey, mixed, and duplicate-letter cases
- At least 20 unit tests cover the matching engine, including known edge cases
- All five board states are representable in the store
- State transitions can be triggered and verified in isolation with no UI or network layer attached

**Why first:** The matching function is the only piece that can be proven fully correct before any infrastructure exists. The state model is the shared contract for every layer that follows — UI, input handling, and network events all read from and write to it. Defining both here prevents each subsequent layer from making different assumptions about data shape.

---

### Step 2 — Board grid UI, keyboard input, and focus rules

**Scope:** A fully interactive 2×2 board grid that a player can type into and navigate, backed by the store from Step 1. No server connection yet — all state is local.

**Board grid UI:**
- Renders four boards in a 2×2 grid, each showing 9 rows × 5 tiles driven entirely from store state
- Active board has a highlighted border; solved boards show a completion highlight; failed boards show muted tiles and a target-word reveal row below the grid; locked boards show no highlight
- Responsive layout — usable at 375px (mobile) and 1280px (desktop)
- All board states render correctly from any valid store state; no hardcoded assumptions about which board is active

**Keyboard input:**
- Global `keydown` listener routes letter keys (A–Z) to the shared `currentInput`, up to 5 characters
- The shared `currentInput` is rendered identically in the current row of every unsolved board simultaneously
- Backspace removes the last character from `currentInput`; no-op if empty
- Enter is captured and fires submission (wired in Step 3); ignored if `currentInput` has fewer than 5 characters
- All input is blocked when all four boards are in terminal states (Solved, Failed, or Locked)

**Focus and navigation:**
- There is no focus model — all unsolved boards receive input simultaneously; no board needs to be selected or clicked
- Boards do not have an active/idle distinction; they are either unsolved (receiving input) or terminal (not receiving input)
- No click-to-focus interaction is needed or implemented

**Done when:**
- Typing letters fills the shared `currentInput` row tile-by-tile on every unsolved board simultaneously, visible in the browser
- Backspace removes the last character from the shared row across all unsolved boards
- Terminal boards (Solved, Failed, Locked) show their final state and do not update with new shared input
- All board visual states render correctly driven from the store
- Layout holds at mobile and desktop widths

**Why here:** Getting the shared input rendering right before adding the network layer means the full interactive surface can be tested locally with seeded store state, and the simultaneous-broadcast behaviour is proven before async WebSocket complexity is added.

---

### Step 3 — Server handler, guess submission, and result handling

**Scope:** The complete round-trip from pressing Enter to the board updating with colour results. This wires the client to the server and closes the core gameplay loop.

**Server-side (`submit_guess` handler):**
- Runs the seven-step validation chain in order; emits an error and returns early on any failure (see Technical Design section for full chain and error codes)
- Reads all four board states from Redis; identifies which boards are still unsolved
- Calls `match(guess, target)` independently for each unsolved board, calculates per-board `scoreDelta` and `boardStatus`
- Writes to Redis: increments attempt count per unsolved board (`HINCRBY` × N), updates leaderboard sorted set once with `totalScoreDelta` (`ZINCRBY`)
- Appends guess record to PostgreSQL asynchronously — does not block the response
- Emits `guess_result` to the guessing player's socket only, containing results for all evaluated boards
- Emits `leaderboard_update` to the full game room

**Client-side (submission and result handling):**
- On Enter with 5 characters and no guess in-flight: sets global `submitting = true`, emits `submit_guess` with `{ gameId, roundNumber, guess }` (no `boardIndex`)
- On `guess_result` (success): for each board entry in `boards[]`, writes result to that board's `guesses` array at `attemptNumber - 1`; transitions each board to `solved` or `failed` per its `boardStatus`; clears `currentInput` and `submitting` after all board writes complete
- On `guess_result` (error `not_a_word`): clears `submitting`, leaves `currentInput` intact, triggers shake animation on the shared row across all unsolved boards
- On `guess_result` (error `round_expired`): transitions all non-terminal boards to `locked`
- On `guess_result` (error `stale_round`): requests a full game state refresh from the server

**Done when:**
- Submitting a valid word returns independent colour results for all unsolved boards in one response
- The same guess correctly solves one board while leaving others in play
- A board that reaches 9 attempts fails independently; others continue receiving guesses
- `submitting` flag blocks double-submission until all boards have received their results
- Shake animation on invalid word fires across all unsolved boards simultaneously
- Server handler can be tested end-to-end with a Socket.io test client against a seeded game in Redis without any browser UI

**Why here:** Depends on the matching engine (Step 1) being correct and the board UI and input handling (Step 2) being in place. This step makes the feature playable end-to-end for the first time.

---

### Step 4 — Tile animations and timer expiry lock

**Scope:** The tile flip and row shake animations that make feedback feel responsive, plus the timer expiry behaviour that locks all boards at round end. These are the final layer — the feature is fully functional without them, so they are cleanest to add and review once the logic beneath is stable.

**Tile flip animation:**
- On a successful `guess_result`, tiles in the submitted row flip one by one left-to-right with ~120ms stagger (~600ms total for 5 tiles)
- Each tile rotates through its midpoint to reveal the colour, then settles face-up
- `submitting` remains `true` for the full animation duration — the next guess row is not available until all 5 tiles have completed
- Invalid word rejection plays a shake animation on the current row immediately, with no flip and no state change

**Timer expiry lock:**
- On receiving `round_ended` from the server, or a `round_expired` error on any guess: all boards with status `active` or `idle` transition to `locked`
- `currentInput` of the active board is cleared
- Locked boards render with no border highlight and accept no input or focus
- A guess currently mid-animation completes the animation, then the board locks immediately after

**Done when:**
- Tile flip plays on every successful guess submission with consistent stagger timing
- Input is blocked for exactly the duration of the animation
- Shake animation plays on invalid word rejection without triggering a flip
- All non-terminal boards lock when `round_ended` is received
- A guess in-flight at the moment of expiry completes its animation then locks cleanly
- The locked visual state renders correctly for all board positions

**Why last:** Both animation and lock handling are additive — they do not change the correctness of any game logic established in Steps 1–3. Keeping them together in one step makes for a clean, focused review of the presentational and lifecycle-closing layer, separate from the logic that was proven in earlier steps.

---

## Test Plan

Tests are grouped by implementation step. Each group runs independently — no step's tests depend on another step's code being present. All tests are written in TypeScript using Vitest.

Legend:
- **Unit** — pure function or store action, no DOM, no network
- **Component** — React Testing Library, DOM rendered, no network
- **Integration** — Socket.io test client against a real server with seeded Redis

---

### Step 1 — Matching engine and board state model

#### 1A — `matchGuess` unit tests
**File:** `server/src/game/matchGuess.test.ts`
**Type:** Unit
**Runner:** `npx vitest run`

| # | Test name | Input | Expected output | What it proves |
|---|-----------|-------|-----------------|----------------|
| 1 | all green — exact match | `"crane"` / `"crane"` | `["green","green","green","green","green"]` | Perfect solve returns all greens |
| 2 | all grey — no shared letters | `"crane"` / `"motto"` | `["grey","grey","grey","grey","grey"]` | Zero overlap returns all greys |
| 3 | all yellow — all letters present, none in position | `"abcde"` / `"eabcd"` | `["yellow","yellow","yellow","yellow","yellow"]` | Full anagram produces all yellows |
| 4 | mixed — green, yellow, grey in same row | `"crane"` / `"grove"` | `["grey","green","grey","grey","green"]` | Standard mixed result is correct |
| 5 | single green at position 0 only | `"grant"` / `"globe"` | `["green","grey","grey","grey","grey"]` | First-position green isolated correctly |
| 6 | single green at position 4 only | use real words with one last-letter match | `["grey","grey","grey","grey","green"]` | Last-position green isolated correctly |
| 7 | duplicate in guess, once in target — excess is grey | `"speed"` / `"depot"` | second `e` in guess is grey | Second occurrence in guess with one target match is grey |
| 8 | duplicate in guess, once in target — first is green | `"creep"` / `"score"` | only one `e` is yellow/green, other is grey | Green consumes target letter; excess is grey |
| 9 | duplicate in target, once in guess | `"crane"` / `"error"` | `r` in guess is yellow | Single guess letter finds unconsumed target duplicate |
| 10 | duplicate in both guess and target | `"speed"` / `"eased"` | each `e` accounted for without over-counting | Both sides have multiple — no over-attribution |
| 11 | green takes priority over yellow for same letter | `"abbey"` / `"kebab"` | exact match position is green; excess `b` is grey | Green position consumes target letter before pass 2 |
| 12 | letter appears 3× in guess, once in target | `"eerie"` / `"stone"` | only one `e` result is non-grey | Three-occurrence duplicate handled correctly |
| 13 | letter appears once in guess, 3× in target | `"crane"` / `"eerie"` | at most one non-grey result for `e` | Excess target letters don't produce extra yellows |
| 14 | no letters in common | `"chump"` / `"bland"` | all grey | Disjoint alphabets produce all grey |
| 15 | pure anagram — all letters present, none in position | `"steal"` / `"tales"` | all yellow | No positional overlap, all letters match |
| 16 | complex duplicate — green then yellow from same letter | `"llama"` / `"algal"` | one `l` green, one `l` yellow, remainder grey | Green consumed first, yellow from remaining |
| 17 | letter not in target at any position | `"zzzzz"` / `"crane"` | all grey | Letter absent from target is always grey |
| 18 | only last letter matches in position | use real words | `["grey","grey","grey","grey","green"]` | Boundary: final position only |
| 19 | only first letter present but wrong position | `"crane"` / `"achoo"` | `c` is yellow | Leading letter in wrong position is yellow |
| 20 | result array is always length 5 | any valid inputs | `result.length === 5` | Output shape contract never broken |
| 21 | return type is `TileResult[]` at compile time | TypeScript compile check | `tsc --noEmit` passes | Type contract enforced |
| 22 | function is pure — identical inputs identical output | call twice with same args | deeply equal results | No hidden state or randomness |

---

#### 1B — `boardStore` unit tests
**File:** `client/src/store/boardStore.test.ts`
**Type:** Unit
**Runner:** `npx vitest run`

**Setup helper used across all tests:**
```ts
const WORDS = ["apple", "grape", "stone", "light"]
// Call store.initBoards(WORDS) in beforeEach where needed
```

The store now models `currentInput` and `submitting` as global shared fields, not per-board.

| # | Test name | Action(s) | Expected state | What it proves |
|---|-----------|-----------|----------------|----------------|
| 23 | `initBoards` — all boards set to unsolved | `initBoards(WORDS)` | all `boards[].status === "unsolved"` | All boards start unsolved |
| 24 | `initBoards` — target words set correctly | `initBoards(WORDS)` | each `board.targetWord === WORDS[i]` | Words mapped to correct board indexes |
| 25 | `initBoards` — global currentInput is empty | `initBoards(WORDS)` | `store.currentInput === ""` | Shared input cleared on round start |
| 26 | `initBoards` — all guess arrays are empty | `initBoards(WORDS)` | all `board.guesses === []` | Clean slate on round start |
| 27 | `initBoards` — resets previous round state | `initBoards`, apply results, `initBoards` again | all boards blank, `currentInput === ""` | Second round starts completely fresh |
| 28 | `appendLetter` — appends to shared currentInput | `appendLetter("C")` | `store.currentInput === "C"` | Letter goes to shared input |
| 29 | `appendLetter` — stops at 5 characters | `appendLetter` × 6 | `store.currentInput.length === 5` | Shared input cap enforced |
| 30 | `appendLetter` — blocked when all boards terminal | all boards solved, `appendLetter("C")` | `store.currentInput === ""` | No input when all boards done |
| 31 | `appendLetter` — builds word correctly | append `C`, `R`, `A`, `N`, `E` | `store.currentInput === "CRANE"` | Sequential appends produce correct string |
| 32 | `deleteLetter` — removes last character from shared input | append 3 letters, `deleteLetter()` | `store.currentInput.length === 2` | Backspace on shared input works |
| 33 | `deleteLetter` — no-op on empty shared input | `deleteLetter()` on empty | `store.currentInput === ""` | Empty backspace harmless |
| 34 | `deleteLetter` — blocked when all boards terminal | all solved, `deleteLetter()` | `store.currentInput === ""` | No delete when all boards done |
| 35 | `setSubmitting` — sets global flag true | `setSubmitting(true)` | `store.submitting === true` | Global in-flight flag set |
| 36 | `setSubmitting` — sets global flag false | `setSubmitting(false)` | `store.submitting === false` | Global in-flight flag cleared |
| 37 | `applyBoardResult` — guess appended to correct board | `applyBoardResult(0, "crane", [...], "unsolved")` | `boards[0].guesses.length === 1` | Guess recorded on correct board |
| 38 | `applyBoardResult` — correct word and result stored | `applyBoardResult(0, "crane", ["grey","green","grey","grey","green"], "unsolved")` | `guesses[0] === { word: "crane", result: [...] }` | Exact values stored |
| 39 | `applyBoardResult` — status stays unsolved | `applyBoardResult(0, ..., "unsolved")` | `boards[0].status === "unsolved"` | Board stays in play on non-solve |
| 40 | `applyBoardResult` — status transitions to solved | `applyBoardResult(0, ..., "solved")` | `boards[0].status === "solved"` | Solve transition correct |
| 41 | `applyBoardResult` — status transitions to failed | `applyBoardResult(0, ..., "failed")` | `boards[0].status === "failed"` | Fail transition correct |
| 42 | `applyBoardResult` — other boards unaffected | `applyBoardResult(0, ...)` | `boards[1..3]` unchanged | Board independence enforced |
| 43 | `applyAllResults` — applies results to multiple boards at once | `applyAllResults([{boardIndex:0,...},{boardIndex:2,...}])` | boards 0 and 2 updated; boards 1 and 3 unchanged | Multi-board simultaneous result applied |
| 44 | `applyAllResults` — clears shared currentInput | `applyAllResults(...)` | `store.currentInput === ""` | Shared row cleared after all boards updated |
| 45 | `applyAllResults` — clears global submitting | `applyAllResults(...)` | `store.submitting === false` | Global flag released after all results |
| 46 | `applyAllResults` — one board solves, others stay unsolved | one board with `"solved"` status in results | only that board is solved | Independent solve from shared guess |
| 47 | `applyAllResults` — multiple boards solve simultaneously | two boards with `"solved"` status | both boards are solved, others unchanged | Multi-solve on same guess works |
| 48 | `lockAllBoards` — unsolved boards locked | `lockAllBoards()` | all unsolved → locked | Timer expiry locks all remaining |
| 49 | `lockAllBoards` — solved board unchanged | solve board 0, `lockAllBoards()` | `boards[0].status === "solved"` | Solved board not overwritten |
| 50 | `lockAllBoards` — failed board unchanged | fail board 0, `lockAllBoards()` | `boards[0].status === "failed"` | Failed board not overwritten |
| 51 | `lockAllBoards` — shared currentInput cleared | append letters, `lockAllBoards()` | `store.currentInput === ""` | Partial input wiped on lock |
| 52 | `allTerminal` selector — false during active round | `initBoards` | returns `false` | Not terminal with unsolved boards |
| 53 | `allTerminal` selector — true when all solved | solve all 4 | returns `true` | All solved = terminal |
| 54 | `allTerminal` selector — true on mix of terminal states | mix solved/failed/locked | returns `true` | Any terminal combination qualifies |
| 55 | `allTerminal` selector — false when one board still unsolved | 3 boards terminal, 1 unsolved | returns `false` | One unsolved board = not all terminal |
| 56 | `unsolvedBoards` selector — returns all boards on init | `initBoards` | returns all 4 boards | All start unsolved |
| 57 | `unsolvedBoards` selector — excludes solved board | solve board 1 | returns boards 0, 2, 3 | Solved board excluded from unsolved set |
| 58 | `unsolvedBoards` selector — excludes failed board | fail board 2 | returns boards 0, 1, 3 | Failed board excluded from unsolved set |
| 59 | `unsolvedBoards` selector — returns empty when all terminal | solve all 4 | returns `[]` | No unsolved boards when all done |

---

### Step 2 — Board grid UI, shared keyboard input

**File:** `client/src/components/BoardGrid.test.tsx`
**Type:** Component (React Testing Library + jsdom)
**Runner:** `npx vitest run`

**Setup:** Each test seeds the Zustand store with `initBoards(WORDS)` before rendering `<BoardGrid />`.

| # | Test name | Setup | Action | Expected DOM / state | What it proves |
|---|-----------|-------|--------|----------------------|----------------|
| 60 | renders 4 boards | `initBoards` | render | 4 board containers in DOM | All boards always render |
| 61 | renders 9 rows per board | `initBoards` | render | each board has 9 row elements | Full attempt grid rendered |
| 62 | renders 5 tiles per row | `initBoards` | render | each row has 5 tile elements | Correct tile count per row |
| 63 | all boards show unsolved state on init | `initBoards` | render | all boards have `data-status="unsolved"` | Visual state from store |
| 64 | solved board has solved class | `applyBoardResult(0,...,"solved")` | render | board 0 has `data-status="solved"` | Solved state reflected in DOM |
| 65 | failed board shows target word | apply 9 failing results to board 0 | render | target word visible below board 0 | Reveal row present on failure |
| 66 | locked board has locked class | `lockAllBoards()` | render | all boards have `data-status="locked"` | Lock state reflected in DOM |
| 67 | typing letter updates shared input on ALL unsolved boards | `initBoards` | `keydown "c"` | all 4 boards row 0 tile 0 shows `"C"` | Shared input renders on all unsolved boards |
| 68 | typing 5 letters fills current row on all unsolved boards | `initBoards` | `keydown` × 5 letters | all 4 boards row 0 shows all 5 letters | Shared row fills across all boards |
| 69 | typing 6th letter has no effect on any board | `initBoards` | `keydown` × 6 letters | all boards row 0 shows only 5 characters | Shared input cap enforced globally |
| 70 | backspace removes last letter from all unsolved boards | append 3 letters | `keydown "Backspace"` | all boards row 0 shows 2 letters | Backspace reflected on all boards |
| 71 | backspace on empty row is no-op on all boards | `initBoards` | `keydown "Backspace"` | no error; all rows remain empty | Empty backspace harmless |
| 72 | typing does not appear on solved board | solve board 0 | `keydown "c"` | board 0 row unchanged; boards 1–3 show `"C"` | Solved board excluded from shared input |
| 73 | typing does not appear on failed board | fail board 0 | `keydown "c"` | board 0 row unchanged; others show `"C"` | Failed board excluded from shared input |
| 74 | typing blocked when all boards terminal | solve all 4 | `keydown "c"` | no board shows new input | Input fully blocked when all done |
| 75 | enter with fewer than 5 letters ignored on all boards | append 3 letters | `keydown "Enter"` | no submission; all boards row still shows 3 letters | Short guess not submitted |
| 76 | no click-to-focus interaction exists | `initBoards` | click board 2 | no state change; all boards remain in shared input mode | Focus model removed |
| 77 | solved board shows completion highlight | `applyBoardResult(1,...,"solved")` | render | board 1 has completion highlight class | Visual solve feedback correct |
| 78 | submitted guess row shows independent result colours per board | `applyAllResults([{board0: all grey}, {board1: all green}])` | render | board 0 tiles are grey; board 1 tiles are green | Each board shows its own result |
| 79 | different results on different boards from same guess | same guess evaluated against different targets | render | board 0 and board 1 show different tile colours | Independent evaluation per board |
| 80 | layout renders at mobile width | set viewport to 375px | render | boards visible, no overflow | Mobile responsive layout |
| 81 | layout renders at desktop width | set viewport to 1280px | render | 2×2 grid layout correct | Desktop layout correct |

---

### Step 3 — Server handler, guess submission, and result handling

#### 3A — Server validation and handler integration tests
**File:** `server/src/game/submitGuess.test.ts`
**Type:** Integration (Socket.io test client + seeded Redis)
**Runner:** `npx vitest run` with Redis running

**Setup:** Each test seeds Redis with a valid active game (`status: "active"`, known `deadline`, known `words` for all 4 boards, `attemptCount: 0` for all boards), creates a connected test socket with a valid session, and tears down Redis keys after.

| # | Test name | Condition | Expected `guess_result` | What it proves |
|---|-----------|-----------|------------------------|----------------|
| 82 | valid guess — result returned for all 4 unsolved boards | all boards unsolved | `boards[]` has 4 entries, each with correct `result` | Server evaluates all unsolved boards |
| 83 | valid guess — each board result is independent | boards have different target words | each board's `result` differs appropriately | Per-board matching engine called separately |
| 84 | valid guess — `totalScoreDelta` is sum of per-board deltas | mixed results across boards | `totalScoreDelta === sum(boards[].scoreDelta)` | Score aggregation correct |
| 85 | valid guess — solve bonus included when one board solved | guess solves board 1 | `boards[1].scoreDelta` includes +10 | Per-board solve bonus applied |
| 86 | early finish bonus — all 4 boards solved in one guess | winning guess solves all 4 simultaneously | `totalScoreDelta` includes `floor(secondsRemaining / 10)` | Early finish bonus when all boards solved |
| 87 | attempt count increments on all evaluated boards | submit valid guess with all boards unsolved | `HGET attempts board 0,1,2,3` each returns 1 | Redis HINCRBY fires per unsolved board |
| 88 | solved board skipped — not in response `boards[]` | board 0 already solved | `boards[]` contains only boards 1, 2, 3 | Already-solved board excluded from evaluation |
| 89 | solved board attempt count not incremented | board 0 already solved | `HGET attempts board 0` still returns prior count | No extra write to already-solved board |
| 90 | `guess_result` emitted to player only | submit valid guess | only submitting socket receives `guess_result` | Private emit correct |
| 91 | `leaderboard_update` emitted to room | submit valid guess | all room sockets receive `leaderboard_update` | Broadcast correct |
| 92 | leaderboard updated by `totalScoreDelta` | submit valid guess | `ZSCORE leaderboard playerId` increases by `totalScoreDelta` | Single Redis ZINCRBY with aggregated score |
| 93 | guess record appended to PostgreSQL | submit valid guess | DB row exists with `guess`, `allBoardResults[]`, `totalScoreDelta` | Async persistence correct |
| 94 | invalid game ID — silently ignored | unknown `gameId` | no response | Missing game silently dropped |
| 95 | game not active — error returned | `status: "waiting"` | `{ error: "game_not_active" }` | Game status check |
| 96 | stale round number — error returned | `roundNumber` does not match server | `{ error: "stale_round" }` | Round number validated |
| 97 | past deadline — error returned | submit after `deadline` has passed | `{ error: "round_expired" }` | Server deadline enforced |
| 98 | all boards terminal — error returned | all 4 boards already solved/failed | `{ error: "all_boards_terminal" }` | No evaluation when all done |
| 99 | invalid format — error returned | guess with digits `"cran3"` | `{ error: "invalid_format" }` | Non-alpha characters rejected |
| 100 | guess not in word list — error returned | valid format but unknown word | `{ error: "not_a_word" }` | Word list check fires |
| 101 | not_a_word — no attempt count incremented on any board | submit invalid word | all `HGET attempts` still return prior count | Rejected guess costs no board its attempt |
| 102 | double submission blocked by global submitting flag | `submitting: true` in store, submit | second emit blocked client-side | Global in-flight guard works |

#### 3B — Client result handling unit tests
**File:** `client/src/store/boardStore.resultHandling.test.ts`
**Type:** Unit
**Runner:** `npx vitest run`

| # | Test name | Event received | Expected store state | What it proves |
|---|-----------|---------------|----------------------|----------------|
| 103 | success result — guess added to all evaluated boards | `guess_result` with 4 board entries | all 4 boards have `guesses.length === 1` | Results written to all boards |
| 104 | success result — shared currentInput cleared | `guess_result` success | `store.currentInput === ""` | Shared row cleared |
| 105 | success result — global submitting cleared | `guess_result` success | `store.submitting === false` | Global flag released |
| 106 | success result — one board solved, others stay unsolved | one board `boardStatus: "solved"` | that board is solved; others remain unsolved | Independent solve transition |
| 107 | success result — multiple boards solved simultaneously | two boards `boardStatus: "solved"` | both boards are solved | Multi-solve on same guess |
| 108 | success result — board transitions to failed | `boardStatus: "failed"` on one board | that board is failed; others continue | Independent fail transition |
| 109 | `not_a_word` error — shared currentInput preserved | `error: "not_a_word"` | `store.currentInput` unchanged | Player can fix and resubmit |
| 110 | `not_a_word` error — no board attempt counts incremented | `error: "not_a_word"` | all `board.guesses.length` unchanged | Invalid word costs no board |
| 111 | `not_a_word` error — global submitting cleared | `error: "not_a_word"` | `store.submitting === false` | Input unblocked after rejection |
| 112 | `round_expired` error — all unsolved boards locked | `error: "round_expired"` | all unsolved boards → locked | Timer expiry via error path |
| 113 | `round_expired` error — solved board unaffected | solved board present | solved board stays solved | Terminal boards protected |

---

### Step 4 — Tile animations and timer expiry lock

#### 4A — Animation behaviour component tests
**File:** `client/src/components/Tile.test.tsx`
**Type:** Component (React Testing Library)
**Runner:** `npx vitest run`

| # | Test name | Setup | Action | Expected | What it proves |
|---|-----------|-------|--------|----------|----------------|
| 114 | tile has no colour class before submission | empty tile | render | no green/yellow/grey class | Unsubmitted tile is unstyled |
| 115 | tile gets green class after green result | `applyBoardResult` with green at position | render after result | tile has green class | Colour applied from result |
| 116 | tile gets yellow class after yellow result | `applyBoardResult` with yellow | render after result | tile has yellow class | Yellow applied correctly |
| 117 | tile gets grey class after grey result | `applyBoardResult` with grey | render after result | tile has grey class | Grey applied correctly |
| 118 | flip animation fires on all unsolved boards simultaneously | `applyAllResults` | check immediately after | animation class present on tiles of all evaluated boards | Parallel animation triggered |
| 119 | tiles flip left-to-right within each board | `applyAllResults` | observe animation sequence per board | tile 0 animates before tile 4 on every board | Per-board stagger order correct |
| 120 | input blocked during animation — global submitting flag | `submitting: true` | `keydown "c"` | `store.currentInput` unchanged | Animation gate blocks shared input |
| 121 | input unblocked after ALL board animations complete | all board animations done | `keydown "c"` | `store.currentInput === "C"` | Gate waits for all boards, not just one |
| 122 | shake animation fires on all unsolved boards for not_a_word | `error: "not_a_word"` | render | all unsolved boards' current rows have shake class | Shared shake across all unsolved boards |
| 123 | shake class removed after animation | shake plays | wait for animation | shake class no longer present on any board | Shake is transient |
| 124 | no flip animation on not_a_word rejection | `error: "not_a_word"` | render | no flip class on any tiles | Shake and flip mutually exclusive |
| 125 | solved board does not animate on subsequent guesses | board 0 solved, then new shared guess | render | board 0 shows no animation; boards 1–3 animate | Solved board excluded from animation |

#### 4B — Timer expiry lock component tests
**File:** `client/src/components/BoardGrid.timerLock.test.tsx`
**Type:** Component (React Testing Library)
**Runner:** `npx vitest run`

| # | Test name | Setup | Action | Expected | What it proves |
|---|-----------|-------|--------|----------|----------------|
| 126 | `round_ended` locks all unsolved boards | all boards unsolved | emit `round_ended` | all boards have locked class | Round end locks all unsolved |
| 127 | `round_ended` does not lock solved board | board 0 solved | emit `round_ended` | board 0 stays solved | Solved board protected from lock |
| 128 | `round_ended` does not lock failed board | board 0 failed | emit `round_ended` | board 0 stays failed | Failed board protected from lock |
| 129 | shared currentInput cleared on lock | letters typed | emit `round_ended` | `store.currentInput === ""` | Partial shared input wiped |
| 130 | typing blocked after lock | `round_ended` received | `keydown "c"` | no board input changes | Input fully blocked post-lock |
| 131 | mid-animation lock — all animations complete then boards lock | guess in-flight when `round_ended` fires | observe | all animations play to completion then boards lock | Animations not abruptly cut off |
| 132 | mid-animation lock — result not counted | `round_ended` arrives before results | observe state after | no board transitions to solved/failed | Server deadline takes precedence |