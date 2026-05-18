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

### Focus and navigation

- When a round starts, focus defaults to Board 1 (top-left)
- A player can shift focus to any Idle board by clicking it
- When a board is solved, focus automatically shifts to the next unsolved board in reading order (left-to-right, top-to-bottom)
- Solved, Failed, and Locked boards cannot receive focus
- The currently active board is visually distinguished from idle boards by a highlighted border

### Input

- All input is captured via physical keyboard only (no on-screen keyboard for MVP)
- Letter keys (A–Z) append a character to the current row of the active board, up to 5 characters
- Backspace removes the last typed character from the current row
- Enter submits the current row as a guess
- Input is only accepted when a board is in the Active state
- If a player has solved all four boards, all keyboard input is blocked for the remainder of the round
- A guess cannot be submitted if the current row has fewer than 5 characters

### Guess submission and feedback

- On Enter, the current 5-letter guess is submitted for evaluation against the active board's target word
- The guess must be a valid word in the word list; invalid words are rejected and the row is not consumed
- Each submitted guess occupies one row of the board's tile grid
- After evaluation, every tile in that row is revealed with a colour result:
  - **Green** — correct letter in the correct position
  - **Yellow** — letter exists in the word but is in the wrong position
  - **Grey** — letter is not in the word
- Tiles are revealed sequentially left-to-right with a card-flip animation; the next guess row becomes available only after all tiles have revealed
- Only one guess may be in-flight per board at a time — submitting is blocked until the current reveal animation completes

### Solving a board

- A board is solved when all 5 tiles in a submitted row are Green
- On solve, the board transitions to the Solved state immediately
- A distinct visual highlight (border or glow) is applied to the solved board
- Focus shifts automatically to the next unsolved board

### Failing a board

- A board fails when the 9th guess is submitted and does not solve the word
- On failure, the board transitions to the Failed state
- The target word is displayed in a reveal row beneath the tile grid
- The board tiles adopt a muted visual style to signal it is no longer active
- No further guesses can be entered on a failed board

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
- **Player uses all 9 attempts on a board without solving it** — that board enters the Failed state; the player continues on remaining boards unaffected
- **Player submits a guess that is not in the word list** — the guess is rejected, the row shakes or flashes to indicate the error, and the attempt count for that board is not incremented
- **Round timer expires mid-animation** — the current tile reveal animation completes but the guess result does not count; the board locks immediately after the animation
- **Player switches focus to a different board and then the timer expires** — all remaining boards lock regardless of which board was active
- **All four boards reach a terminal state (any mix of Solved and Failed) before the timer expires** — the round ends early; this is handled by the round lifecycle, not the board feature itself
- **Player joins with less than 5 seconds remaining** — they receive blank boards and the remaining time; they may not have enough time to complete a full guess, which is expected behaviour

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
  "boardIndex": 1,
  "guess": "crane"
}
```

> `playerId` is **not** in the payload. The server resolves it from the authenticated socket session to prevent spoofing.

**Client-side guards before emitting:**

- Guess is exactly 5 characters (enforced by input handling)
- Board is in Active state (not Solved, Failed, or Locked)
- No guess currently in-flight on this board (a `submitting` flag is set to `true` on emit; blocks re-submission until `guess_result` is received)
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
| 5 | `boardIndex` is 0–3 | `invalid_board` |
| 6 | This player has not already Solved or Failed this board | `board_not_active` |
| 7 | This player has not exhausted `maxAttempts` (9) on this board | `max_attempts_reached` |
| 8 | Guess is exactly 5 alphabetic characters | `invalid_format` |
| 9 | Guess exists in the valid-word Set (O(1) lookup) | `not_a_word` |

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

```json
{
  "boardIndex": 1,
  "guess": "crane",
  "result": ["grey", "green", "grey", "grey", "green"],
  "scoreDelta": 8,
  "boardStatus": "active",
  "attemptNumber": 3
}
```

> `boardStatus` is one of `"active"`, `"solved"`, or `"failed"`. The client uses this to drive board state transitions without re-deriving outcome from the result array.  
> `attemptNumber` confirms which row to render the result on — a guard against client/server row desync.

**Error shape (validation failure):**

```json
{
  "boardIndex": 1,
  "guess": "crane",
  "error": "not_a_word"
}
```

**Client behaviour per error code:**

| Code | Client behaviour |
|------|-----------------|
| `not_a_word` | Shake animation on current row; row not consumed; attempt count unchanged |
| `round_expired` | Lock all boards immediately regardless of local timer state |
| `stale_round` | Trigger full game state refresh from server |
| `board_not_active` | Refresh board state from server |
| `max_attempts_reached` | Should be caught client-side before emit; log and ignore if received |

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

1. Write the result array to the board's guess history at `attemptNumber - 1` in the Zustand store
2. Clear the `submitting` flag (unlocks the board for the next guess)
3. Trigger the tile flip animation left-to-right (~120ms stagger per tile; ~600ms total for 5 tiles)
4. After animation completes, advance the cursor to the next empty row
5. If `boardStatus === "solved"` → transition board to Solved state; shift focus to next unsolved board
6. If `boardStatus === "failed"` → transition board to Failed state; reveal target word row

> The animation completion gate (step 3–4) is intentional — it prevents the player typing into the next row before the current reveal finishes, which would cause a confusing visual state.

---

### Full sequence

```
Client                        Server                      Redis / PostgreSQL
  |                               |                               |
  |-- submit_guess -----------→   |                               |
  |   {gameId, roundNumber,       |                               |
  |    boardIndex, guess}         |                               |
  |                               |-- GET deadline TTL --------→  |
  |                               |← still valid --------------   |
  |                               |-- HGET attempt count ------→  |
  |                               |← count = 2 ---------------   |
  |                               |                               |
  |                               | [validate word in Set: O(1)]  |
  |                               | [match(guess, target)]        |
  |                               | [calculate scoreDelta]        |
  |                               |                               |
  |                               |-- HINCRBY attempts --------→  |
  |                               |-- ZINCRBY leaderboard -----→  |
  |                               |-- INSERT guess (async) ----→  |
  |                               |                               |
  |← guess_result  -----------    |                               |
  |  {result[], scoreDelta,       |                               |
  |   boardStatus, attemptNumber} |                               |
  |                               |                               |
  |  [all room clients] ←-------  leaderboard_update             |
  |                               |                               |
  |  [animate tiles]              |                               |
  |  [unlock board]               |                               |
  |  [advance focus if solved]    |                               |
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
- Each of the four boards tracks: `status` (`active | idle | solved | failed | locked`), `targetWord`, `guesses` (array of submitted rows with result arrays), `currentInput` (letters typed in the current row), `attemptCount`, and `submitting` (in-flight guard flag)
- Store initialises four blank boards on `round_started` and exposes state transitions for all board status changes
- Transitions modelled: `active → solved`, `active → failed`, `active/idle → locked`

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
- Global `keydown` listener routes letter keys (A–Z) to `currentInput` of the active board, up to 5 characters
- Backspace removes the last character; no-op if `currentInput` is empty
- Enter is captured and fires submission (wired in Step 3); ignored if `currentInput` has fewer than 5 characters
- All input is blocked when no board is `active`, or when all four boards are in terminal states

**Focus and navigation:**
- Round starts with Board 1 (`index 0`) set to `active`, all others `idle`
- Clicking an `idle` board moves `active` to it; the previously active board becomes `idle`
- Clicking a `solved`, `failed`, or `locked` board does nothing
- When a board transitions to `solved`, focus auto-advances to the next `idle` board in reading order (0 → 1 → 2 → 3); if none remain, no board is active

**Done when:**
- Typing letters fills the active board's current row tile-by-tile, visible in the browser
- Backspace removes characters correctly
- Clicking boards shifts focus correctly, including after a solve
- Terminal-state boards cannot receive focus or input
- All board visual states render correctly driven from the store
- Layout holds at mobile and desktop widths

**Why here:** Getting UI and input right before adding the network layer means the full interactive surface can be tested locally with seeded store state, and bugs in input routing or focus logic are caught before they get tangled with async WebSocket behaviour.

---

### Step 3 — Server handler, guess submission, and result handling

**Scope:** The complete round-trip from pressing Enter to the board updating with colour results. This wires the client to the server and closes the core gameplay loop.

**Server-side (`submit_guess` handler):**
- Runs the nine-step validation chain in order; emits an error and returns early on any failure (see Technical Design section for full chain and error codes)
- Calls `match(guess, target)` for the given `boardIndex`, calculates `scoreDelta` including solve bonus and early-finish bonus
- Writes to Redis: increments attempt count (`HINCRBY`), updates leaderboard sorted set (`ZINCRBY`)
- Appends guess record to PostgreSQL asynchronously — does not block the response
- Emits `guess_result` to the guessing player's socket only
- Emits `leaderboard_update` to the full game room

**Client-side (submission and result handling):**
- On Enter with 5 characters and no guess in-flight: sets `submitting = true`, emits `submit_guess` with `{ gameId, roundNumber, boardIndex, guess }`
- On `guess_result` (success): writes result to the board's `guesses` array at `attemptNumber - 1`, clears `currentInput` and `submitting`, transitions board to `solved` or `failed` if indicated by `boardStatus`; on `failed`, makes `targetWord` visible in the reveal row
- On `guess_result` (error `not_a_word`): clears `submitting`, leaves `currentInput` intact, triggers a shake animation on the current row
- On `guess_result` (error `round_expired`): transitions all non-terminal boards to `locked`
- On `guess_result` (error `stale_round`): requests a full game state refresh from the server

**Done when:**
- Submitting a valid in-vocabulary word returns the correct colour result and updates the board
- Submitting a word not in the word list shakes the row, does not consume an attempt, and leaves the board ready for the next guess
- Board transitions to `solved` or `failed` correctly based on `boardStatus` in the response
- `submitting` flag blocks double-submission until the server responds
- All nine error codes return the correct error and leave the board in a valid, non-stuck state
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
| 5 | single green at position 0 | `"grant"` / `"globe"` | `["green","grey","grey","grey","grey"]` | First-position green isolated correctly |
| 6 | single green at position 4 | `"abcde"` / `"xxxde"` — use real words | varies | Last-position green isolated correctly |
| 7 | duplicate in guess, once in target — first occurrence yellow | `"speed"` / `"depot"` | `["grey","grey","yellow","grey","grey"]` | Second `e` in guess is grey; target only has one `e` |
| 8 | duplicate in guess, once in target — first is green | `"creep"` / `"score"` | verify only one `e` is yellow/green, other is grey | Green consumes target letter; excess is grey |
| 9 | duplicate in target, once in guess — letter matches first available | `"crane"` / `"error"` | `r` in guess is yellow (one unconsumed `r` in target) | Single guess letter finds unconsumed target duplicate |
| 10 | duplicate in both guess and target | `"speed"` / `"eased"` | each `e` accounted for without over-counting | Both sides have multiple — no over-attribution |
| 11 | green takes priority — same letter green at one pos, grey elsewhere | `"abbey"` / `"kebab"` | position with exact match is green; excess `b` in guess is grey | Green position consumes target letter before pass 2 |
| 12 | letter appears 3× in guess, once in target | `"eerie"` / `"stone"` | only one `e` result is yellow or green; rest are grey | Three-occurrence duplicate handled correctly |
| 13 | letter appears once in guess, 3× in target | `"crane"` / `"eerie"` | at most one non-grey result for `e` | Excess target letters don't produce extra yellows |
| 14 | no letters in common — all unique characters | `"chump"` / `"bland"` | `["grey","grey","grey","grey","grey"]` | Disjoint alphabets produce all grey |
| 15 | correct word in wrong order at every position | `"steal"` / `"tales"` | all yellow (no position matches) | Pure anagram with no positional overlap |
| 16 | one letter matches green, same letter also yellow elsewhere | `"llama"` / `"algal"` | only one `l` is non-grey based on consumption order | Complex duplicate — green consumed, yellow from remaining |
| 17 | guess has letter not in target at all positions | `"zzzzz"` / `"crane"` | `["grey","grey","grey","grey","grey"]` | Letter absent from target is always grey |
| 18 | target and guess share only last letter, in position | `"abcde"` / `"vwxye"` — use real words | `["grey","grey","grey","grey","green"]` | Boundary: only final position matches |
| 19 | target and guess share only first letter, not in position | `"crane"` / `"achoo"` | `c` at position 0 in guess — not in target at pos 0; check yellow | Leading letter in wrong position is yellow |
| 20 | result array is always length 5 | any valid inputs | `result.length === 5` | Output shape contract never broken |
| 21 | return type is `TileResult[]`, not `string[]` | TypeScript compile check | `tsc --noEmit` passes | Type contract enforced at compile time |
| 22 | function is pure — same inputs always same output | call twice with identical args | results are deeply equal | No hidden state or randomness |

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

| # | Test name | Action(s) | Expected state | What it proves |
|---|-----------|-----------|----------------|----------------|
| 23 | `initBoards` — board 0 is active | `initBoards(WORDS)` | `boards[0].status === "active"` | Initial focus on first board |
| 24 | `initBoards` — boards 1–3 are idle | `initBoards(WORDS)` | `boards[1..3].status === "idle"` | Non-first boards start idle |
| 25 | `initBoards` — target words set correctly | `initBoards(WORDS)` | each `board.targetWord === WORDS[i]` | Words mapped to correct board indexes |
| 26 | `initBoards` — all inputs are empty | `initBoards(WORDS)` | all `currentInput === ""` and `guesses === []` | Clean slate on round start |
| 27 | `initBoards` — resets previous round state | `initBoards`, submit guess, `initBoards` again | board 0 has empty `guesses` and `attemptCount === 0` | Second round starts fresh |
| 28 | `appendLetter` — appends to active board | `appendLetter(0, "C")` | `boards[0].currentInput === "C"` | Letter routes to active board |
| 29 | `appendLetter` — ignored on idle board | `appendLetter(1, "C")` | `boards[1].currentInput === ""` | Idle board rejects input |
| 30 | `appendLetter` — ignored on solved board | solve board 0, `appendLetter(0, "C")` | `boards[0].currentInput === ""` | Terminal board rejects input |
| 31 | `appendLetter` — stops at 5 characters | `appendLetter(0, "C")` × 6 | `boards[0].currentInput.length === 5` | Input cap enforced |
| 32 | `appendLetter` — builds word correctly | append `C`, `R`, `A`, `N`, `E` to board 0 | `boards[0].currentInput === "CRANE"` | Sequential appends produce correct string |
| 33 | `deleteLetter` — removes last character | append 3 letters, `deleteLetter(0)` | `currentInput.length === 2` | Backspace removes one character |
| 34 | `deleteLetter` — no-op on empty input | `deleteLetter(0)` with empty `currentInput` | `currentInput === ""` | No error on empty backspace |
| 35 | `deleteLetter` — no-op on idle board | `deleteLetter(1)` | `boards[1].currentInput === ""` | Idle board ignores delete |
| 36 | `setSubmitting` — sets flag true | `setSubmitting(0, true)` | `boards[0].submitting === true` | In-flight flag set correctly |
| 37 | `setSubmitting` — sets flag false | set true then `setSubmitting(0, false)` | `boards[0].submitting === false` | In-flight flag cleared correctly |
| 38 | `setSubmitting` — no-op on idle board | `setSubmitting(1, true)` | `boards[1].submitting === false` | Only active board can be submitting |
| 39 | `applyResult` — guess appended to history | `applyResult(0, "crane", [...], "active")` | `boards[0].guesses.length === 1` | Guess recorded in history |
| 40 | `applyResult` — correct word and result stored | `applyResult(0, "crane", ["grey","green","grey","grey","green"], "active")` | `guesses[0] === { word: "crane", result: [...] }` | Exact values stored correctly |
| 41 | `applyResult` — attemptCount increments | `applyResult` called 3 times | `boards[0].attemptCount === 3` | Attempt counter advances each guess |
| 42 | `applyResult` — currentInput cleared | append letters then `applyResult` | `boards[0].currentInput === ""` | Row cleared after submission |
| 43 | `applyResult` — submitting cleared | set submitting true then `applyResult` | `boards[0].submitting === false` | In-flight flag released on result |
| 44 | `applyResult` — status stays active | `applyResult(0, ..., "active")` | `boards[0].status === "active"` | Board stays active on non-solve result |
| 45 | `applyResult` — status transitions to solved | `applyResult(0, ..., "solved")` | `boards[0].status === "solved"` | Solve transition correct |
| 46 | `applyResult` — status transitions to failed | `applyResult(0, ..., "failed")` | `boards[0].status === "failed"` | Fail transition correct |
| 47 | `applyResult` — other boards unaffected | `applyResult(0, ...)` | `boards[1..3]` unchanged | Board independence enforced |
| 48 | `lockAllBoards` — active board locked | `lockAllBoards()` | `boards[0].status === "locked"` | Active board locks on timer expiry |
| 49 | `lockAllBoards` — idle boards locked | `lockAllBoards()` | `boards[1..3].status === "locked"` | All idle boards lock |
| 50 | `lockAllBoards` — solved board unchanged | solve board 0, `lockAllBoards()` | `boards[0].status === "solved"` | Solved board not overwritten |
| 51 | `lockAllBoards` — failed board unchanged | fail board 0, `lockAllBoards()` | `boards[0].status === "failed"` | Failed board not overwritten |
| 52 | `lockAllBoards` — currentInput cleared | append letters then `lockAllBoards()` | `boards[0].currentInput === ""` | Partial input wiped on lock |
| 53 | `setFocus` — moves focus to idle board | `setFocus(2)` | `boards[2].status === "active"`, `boards[0].status === "idle"` | Focus shift correct |
| 54 | `setFocus` — previous board becomes idle | focus board 0, `setFocus(1)` | `boards[0].status === "idle"` | Previous active demoted |
| 55 | `setFocus` — no-op on solved board | solve board 1, `setFocus(1)` | `boards[1].status === "solved"` | Cannot focus solved board |
| 56 | `setFocus` — no-op on failed board | fail board 1, `setFocus(1)` | `boards[1].status === "failed"` | Cannot focus failed board |
| 57 | `setFocus` — no-op on locked board | lock all, `setFocus(0)` | `boards[0].status === "locked"` | Cannot focus locked board |
| 58 | `advanceFocus` — moves to next idle board | solve board 0, `advanceFocus(0)` | `boards[1].status === "active"` | Auto-advance to board 1 |
| 59 | `advanceFocus` — skips solved boards | solve boards 0 and 1, `advanceFocus(0)` | `boards[2].status === "active"` | Skips already-terminal boards |
| 60 | `advanceFocus` — no active board when all terminal | solve all 4 boards, `advanceFocus(3)` | no board is `"active"` | All terminal → no focus |
| 61 | `advanceFocus` — does not wrap around | solve board 3, `advanceFocus(3)` | boards 0–2 status unchanged (already idle) | Does not cycle back to board 0 |
| 62 | `activeBoard` selector — returns active board | `initBoards`, check selector | returns `boards[0]` object | Selector returns correct reference |
| 63 | `activeBoard` selector — returns null when all terminal | lock all boards | selector returns `null` | Null when no active board |
| 64 | `activeBoardIndex` selector — returns correct index | `setFocus(2)` | returns `2` | Index matches focused board |
| 65 | `activeBoardIndex` selector — returns null when none active | lock all | returns `null` | Null index when no active board |
| 66 | `allTerminal` selector — false during active round | `initBoards` | returns `false` | Not terminal while boards are active/idle |
| 67 | `allTerminal` selector — true when all solved | solve all 4 | returns `true` | All solved = terminal |
| 68 | `allTerminal` selector — true on mix of solved/failed/locked | mix of all three terminal states | returns `true` | Any terminal combination qualifies |
| 69 | `allTerminal` selector — false when one board still idle | lock 3 boards, leave 1 idle | returns `false` | One non-terminal board = not all terminal |

---

### Step 2 — Board grid UI, keyboard input, and focus rules

**File:** `client/src/components/BoardGrid.test.tsx`
**Type:** Component (React Testing Library + jsdom)
**Runner:** `npx vitest run`

**Setup:** Each test seeds the Zustand store with `initBoards(WORDS)` before rendering `<BoardGrid />`.

| # | Test name | Setup | Action | Expected DOM / state | What it proves |
|---|-----------|-------|--------|----------------------|----------------|
| 70 | renders 4 boards | `initBoards` | render | 4 board containers present in DOM | All boards always render |
| 71 | renders 9 rows per board | `initBoards` | render | each board has 9 row elements | Full attempt grid rendered |
| 72 | renders 5 tiles per row | `initBoards` | render | each row has 5 tile elements | Correct tile count per row |
| 73 | active board has active class/attribute | `initBoards` | render | board 0 has `data-status="active"` (or equivalent) | Visual state driven from store |
| 74 | idle boards have idle class | `initBoards` | render | boards 1–3 have `data-status="idle"` | All idle boards marked correctly |
| 75 | solved board has solved class | `applyResult(0,...,"solved")` | render | board 0 has `data-status="solved"` | Solved state reflected in DOM |
| 76 | failed board shows target word | `applyResult × 9` to fail | render | target word visible in board 0 | Reveal row present on failure |
| 77 | locked board has locked class | `lockAllBoards()` | render | all boards have `data-status="locked"` | Lock state reflected in DOM |
| 78 | typing letter updates active board tile | `initBoards` | `keydown` `"c"` | board 0, row 0, tile 0 shows `"C"` | Input renders to correct tile |
| 79 | typing 5 letters fills row | `initBoards` | `keydown` × 5 letters | board 0 row 0 shows all 5 letters | Full row filled from keyboard |
| 80 | typing 6th letter has no effect | `initBoards` | `keydown` × 6 letters | row shows only 5 characters | Input cap enforced in UI |
| 81 | backspace removes last letter | append 3 letters | `keydown "Backspace"` | board 0 row 0 shows 2 letters | Backspace removes correctly |
| 82 | backspace on empty row is no-op | `initBoards` | `keydown "Backspace"` | no error; row remains empty | Empty backspace harmless |
| 83 | typing on idle board has no effect | `initBoards` | `keydown "c"` (board 1 is idle) | board 1, row 0 tiles remain empty | Idle board ignores global key events |
| 84 | typing blocked when all boards terminal | lock all | `keydown "c"` | all boards unchanged | Input fully blocked post-lock |
| 85 | enter with fewer than 5 letters ignored | append 3 letters | `keydown "Enter"` | no submission; row still shows 3 letters | Short guess not submitted |
| 86 | clicking idle board shifts focus | `initBoards` | click board 2 | board 2 is active, board 0 is idle | Click-to-focus works |
| 87 | clicking active board has no effect | `initBoards` | click board 0 (already active) | board 0 stays active | Re-clicking active board is safe |
| 88 | clicking solved board has no effect | solve board 1 | click board 1 | board 1 stays solved | Terminal board not focusable |
| 89 | clicking locked board has no effect | lock all | click board 0 | board 0 stays locked | Locked board not focusable |
| 90 | auto-advance on solve moves focus | solve board 0 via `applyResult` | render | board 1 becomes active | Focus shifts automatically |
| 91 | auto-advance skips already-solved board | solve boards 0 and 1 | solve board 0 | board 2 becomes active | Skip logic works correctly |
| 92 | no board active when all terminal | solve all 4 | render | no board has active class | Correct state when all complete |
| 93 | submitted guess row shows result colours | `applyResult(0, "crane", ["grey","green","grey","grey","green"], "active")` | render | tiles in row 0 of board 0 have correct colour classes | Result array drives tile colours |
| 94 | layout renders at mobile width | set viewport to 375px | render | boards visible, no overflow | Mobile responsive layout |
| 95 | layout renders at desktop width | set viewport to 1280px | render | 2×2 grid layout correct | Desktop layout correct |

---

### Step 3 — Server handler, guess submission, and result handling

#### 3A — Server validation and handler integration tests
**File:** `server/src/game/submitGuess.test.ts`
**Type:** Integration (Socket.io test client + seeded Redis)
**Runner:** `npx vitest run` with Redis running

**Setup:** Each test seeds Redis with a valid active game (`status: "active"`, known `deadline`, known `words`, `attemptCount: 0`), creates a connected test socket with a valid session, and tears down Redis keys after.

| # | Test name | Condition | Expected `guess_result` | What it proves |
|---|-----------|-----------|------------------------|----------------|
| 96 | valid guess returns correct result array | valid game, valid word | `result` matches `matchGuess(guess, target)` | Server calls matching engine correctly |
| 97 | valid guess returns correct scoreDelta — mixed | some green, some yellow | `scoreDelta` = (greens × 3) + (yellows × 1) | Scoring calculation correct |
| 98 | valid guess — solve bonus applied | all 5 green | `scoreDelta` includes +10 | Word solve bonus added |
| 99 | early finish bonus — all 4 boards solved | submit winning guess on board 3 with time remaining | `scoreDelta` includes `floor(secondsRemaining / 10)` | Early finish bonus calculated |
| 100 | attempt count increments in Redis | submit valid guess | `HGET attempts` returns 1 | Redis write correct |
| 101 | leaderboard updated in Redis | submit valid guess | `ZSCORE leaderboard playerId` increases by scoreDelta | Leaderboard sorted set updated |
| 102 | guess record appended to PostgreSQL | submit valid guess | DB row exists with correct fields | Async persistence fires |
| 103 | `guess_result` emitted to player only | submit valid guess | only submitting socket receives `guess_result` | Private emit to player |
| 104 | `leaderboard_update` emitted to room | submit valid guess | all sockets in room receive `leaderboard_update` | Broadcast to room correct |
| 105 | invalid game ID — silently ignored | unknown `gameId` | no response | Missing game silently dropped |
| 106 | game not active — error returned | `status: "waiting"` | `{ error: "game_not_active" }` | Game status check |
| 107 | stale round number — error returned | `roundNumber` does not match server | `{ error: "stale_round" }` | Round number validated |
| 108 | past deadline — error returned | submit after `deadline` has passed | `{ error: "round_expired" }` | Server deadline enforced |
| 109 | invalid boardIndex — error returned | `boardIndex: 5` | `{ error: "invalid_board" }` | Board index validated |
| 110 | board already solved — error returned | board already in solved state | `{ error: "board_not_active" }` | Cannot guess on solved board |
| 111 | max attempts reached — error returned | `attemptCount: 9` already in Redis | `{ error: "max_attempts_reached" }` | Attempt cap enforced server-side |
| 112 | invalid format — error returned | guess with digits `"cran3"` | `{ error: "invalid_format" }` | Non-alpha characters rejected |
| 113 | guess not in word list — error returned | valid format but unknown word | `{ error: "not_a_word" }` | Word list check fires |
| 114 | not_a_word — attempt count not incremented | submit invalid word | `HGET attempts` still returns 0 | Rejected guess not counted |
| 115 | double submission blocked by submitting flag | set `submitting: true` in store, submit | `submitting` flag prevents second emit | Client-side in-flight guard |

#### 3B — Client result handling unit tests
**File:** `client/src/store/boardStore.resultHandling.test.ts`
**Type:** Unit
**Runner:** `npx vitest run`

| # | Test name | Event received | Expected store state | What it proves |
|---|-----------|---------------|----------------------|----------------|
| 116 | success result — guess added to history | `guess_result` success | `guesses.length === 1` | Result written to store |
| 117 | success result — currentInput cleared | `guess_result` success | `currentInput === ""` | Row cleared after server responds |
| 118 | success result — submitting cleared | `guess_result` success | `submitting === false` | In-flight flag released |
| 119 | success result — board stays active | `boardStatus: "active"` | `status === "active"` | Non-terminal guess keeps board active |
| 120 | success result — board transitions solved | `boardStatus: "solved"` | `status === "solved"` | Solve transition from server |
| 121 | success result — board transitions failed | `boardStatus: "failed"` | `status === "failed"` | Fail transition from server |
| 122 | `not_a_word` error — currentInput preserved | `error: "not_a_word"` | `currentInput` unchanged | Player can fix and resubmit |
| 123 | `not_a_word` error — attempt count not incremented | `error: "not_a_word"` | `attemptCount` unchanged | Invalid word does not cost an attempt |
| 124 | `not_a_word` error — submitting cleared | `error: "not_a_word"` | `submitting === false` | Board unlocked after rejection |
| 125 | `round_expired` error — all non-terminal boards locked | `error: "round_expired"` | active and idle boards → locked | Timer expiry via error path |
| 126 | `round_expired` error — solved board unaffected | solved board present, `error: "round_expired"` | solved board stays solved | Terminal boards protected |

---

### Step 4 — Tile animations and timer expiry lock

#### 4A — Animation behaviour component tests
**File:** `client/src/components/Tile.test.tsx`
**Type:** Component (React Testing Library)
**Runner:** `npx vitest run`

| # | Test name | Setup | Action | Expected | What it proves |
|---|-----------|-------|--------|----------|----------------|
| 127 | tile has no colour class before submission | empty tile | render | no green/yellow/grey class | Unsubmitted tile is unstyled |
| 128 | tile gets green class after green result | `applyResult` with green at position | render after result | tile has green class | Colour applied from result |
| 129 | tile gets yellow class after yellow result | `applyResult` with yellow at position | render after result | tile has yellow class | Yellow applied correctly |
| 130 | tile gets grey class after grey result | `applyResult` with grey at position | render after result | tile has grey class | Grey applied correctly |
| 131 | flip animation class applied on result | `applyResult` | check immediately after | animation class present on tiles | Animation triggered by result |
| 132 | tiles flip left-to-right — tile 0 animates first | `applyResult` | observe animation sequence | tile 0 animation starts before tile 4 | Stagger order correct |
| 133 | input blocked during animation | `submitting: true` | `keydown "c"` | `currentInput` unchanged | Animation gate blocks input |
| 134 | input unblocked after animation completes | animation completes | `keydown "c"` | `currentInput === "C"` | Gate released after animation |
| 135 | shake class applied on not_a_word | `error: "not_a_word"` from server | render | current row has shake class | Invalid word feedback visible |
| 136 | shake class removed after animation | shake plays | wait for animation | shake class no longer present | Shake is transient |
| 137 | no flip animation on not_a_word rejection | `error: "not_a_word"` | render | no flip class on tiles | Shake and flip are mutually exclusive |

#### 4B — Timer expiry lock component tests
**File:** `client/src/components/BoardGrid.timerLock.test.tsx`
**Type:** Component (React Testing Library)
**Runner:** `npx vitest run`

| # | Test name | Setup | Action | Expected | What it proves |
|---|-----------|-------|--------|----------|----------------|
| 138 | `round_ended` event locks active board | active board in progress | emit `round_ended` | board 0 has locked class | Round end event triggers lock |
| 139 | `round_ended` event locks idle boards | boards 1–3 idle | emit `round_ended` | all idle boards locked | All non-terminal boards lock |
| 140 | `round_ended` does not lock solved board | board 0 solved | emit `round_ended` | board 0 stays solved | Solved boards protected from lock |
| 141 | `round_ended` does not lock failed board | board 0 failed | emit `round_ended` | board 0 stays failed | Failed boards protected from lock |
| 142 | currentInput cleared on lock | letters typed in active board | emit `round_ended` | active board `currentInput === ""` | Partial input wiped |
| 143 | typing blocked after lock | `round_ended` received | `keydown "c"` | no board input changes | Locked boards ignore keyboard |
| 144 | click focus blocked after lock | `round_ended` received | click board 1 | board 1 stays locked | Locked boards not clickable |
| 145 | mid-animation lock — animation completes then locks | guess in-flight when `round_ended` fires | observe | animation plays to completion then board locks | Animation not abruptly cut off |
| 146 | mid-animation lock — result not counted | `round_ended` arrives before result | observe state after | board does not transition to solved/failed from that guess | Server deadline takes precedence |