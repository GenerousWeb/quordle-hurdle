# F2 · Tile Colour Feedback

## Summary

After a player submits a guess, every tile in the submitted row reveals its result colour through a staggered card-flip animation, working left to right. Green means the letter is in the correct position. Yellow means the letter exists in the word but is in the wrong position. Grey means the letter is not in the word. The same guess is simultaneously evaluated against all unsolved boards, so each board independently reveals its own colour pattern from the same input. When a board is solved, a completion highlight is applied. When a board exhausts all attempts, it enters a failed state and reveals the target word. The animation gate — keeping the shared input row locked until all board animations complete — is a core safety mechanism, not a cosmetic detail.

---

## Goals

- Every submitted guess produces immediate, unambiguous visual feedback on every unsolved board
- Tile colours accurately reflect the server's result for each board independently
- The staggered flip animation makes the reveal feel deliberate and readable — not instant and jarring
- Input is blocked during animation so the player cannot type into a row that is still revealing
- Solved boards are visually distinct and clearly celebrate completion
- Failed boards are visually muted and surface the target word so the player learns from the round
- A rejected guess (not a word) produces a shake animation that is clearly different from a flip — no colour changes, no row consumed
- The feature is self-contained: no knowledge of scoring, timers, or opponent state

---

## Requirements

### Tile states

Each tile in any submitted row is in exactly one of the following visual states at any time:

| State | Appearance | Trigger |
|-------|-----------|---------|
| Empty | No letter, neutral background, light border | Before any input in that row |
| Typing | Letter present, no colour, highlighted border | Letter entered in shared input row but not yet submitted |
| Flipping | Mid-animation between neutral and colour | During the reveal animation after submission |
| Green | Green background, green border, letter visible | Result from server: correct letter, correct position |
| Yellow | Yellow background, yellow border, letter visible | Result from server: letter in word, wrong position |
| Grey | Muted background, muted border, letter visible | Result from server: letter not in word |
| Failed-revealed | Muted colouring, target word shown | Board has exhausted all 9 attempts without solving |

### Flip animation

- On receiving a successful `guess_result` from the server, tiles in the submitted row flip one by one, left to right
- Each tile completes a full card-flip rotation: neutral face → rotates to midpoint (letter disappears) → colour applied → rotates back to face-up showing the coloured result
- Stagger between tiles: ~120ms per tile, so tile 0 starts at 0ms, tile 1 at 120ms, tile 2 at 240ms, tile 3 at 360ms, tile 4 at 480ms
- Total duration per row: ~600ms (480ms start offset + ~120ms for the final tile's flip)
- All unsolved boards animate their row in parallel — the stagger is per-tile within a board, not per-board
- The shared input row is not available for new input until all tile animations across all boards have fully completed

### Shake animation — invalid word

- On receiving a `not_a_word` error from the server, the current input row shakes horizontally on all unsolved boards simultaneously
- Shake duration: ~400ms total, 3–4 oscillations
- No tiles flip. No colours change. No letters change. The row returns to its pre-shake state exactly
- Attempt count is not incremented on any board
- The shared input row is available for new input as soon as the shake animation completes

### Solved board state

- A board is solved when all 5 tiles in a submitted row are Green
- After the flip animation completes on a solved board, a completion highlight is applied: a distinct border colour or glow effect on the board container
- The solved board is excluded from all subsequent shared input rows — it shows no typing row, accepts no new letters, and does not animate on future submissions
- The solved state is permanent for the remainder of the round

### Failed board state

- A board fails when the 9th shared guess is submitted and the result is not all-Green for that board
- After the flip animation for the 9th row completes, the board transitions to failed state
- The board's tile colours are muted/desaturated to signal it is no longer active
- The target word is displayed in a dedicated reveal row below the 9th row of the tile grid, shown in a neutral style (not green — the player did not solve it)
- The failed board is excluded from all subsequent shared input rows, identical to a solved board
- The failed state is permanent for the remainder of the round

### Shared input gate

- The global `submitting` flag is set to `true` when `submit_guess` is emitted
- It must remain `true` for the full duration of the flip animation across all boards
- Only after every tile on every evaluated board has completed its animation does `submitting` become `false` and `currentInput` clear
- During `submitting === true`: letter keys, Backspace, and Enter are all ignored
- If an error is received (`not_a_word`): the shake plays, then `submitting` is set to `false` — `currentInput` is preserved so the player can correct and resubmit

### Board independence

- The same guess may produce entirely different colour results on different boards — each board evaluates independently against its own target word
- A board transitioning to solved does not affect the tile colours, animation, or state of any other board
- A board transitioning to failed does not affect any other board
- Boards that are already solved or failed at the time of a submission do not animate, do not show the new guess row, and are not updated in any way

---

## Assumptions

- The server is the authority on tile colours. The client receives a `result: TileResult[]` array per board from `guess_result` and renders it — it never derives colours locally from the guess and target word
- `TileResult` is typed as `"green" | "yellow" | "grey"` — no other values will ever arrive from the server. Defensive rendering for unknown values is not required
- Animation timing values (120ms stagger, ~600ms total, 400ms shake) are implementation targets, not hard contracts. They may be adjusted during development for feel without requiring a spec change
- The flip animation is CSS-based (using `rotateX` or `scaleY`). JavaScript orchestrates the timing of class additions; CSS transitions handle the actual visual movement
- `guess_result` always arrives before the client-side animation timeout would expire. No fallback timeout is needed to "force-complete" an animation if the server is slow — latency is assumed to be low enough that this is not a real-world problem for MVP
- The `attemptNumber` field in `guess_result` is trusted as the canonical row index. The client does not independently track which row to render results on
- Solved and failed board states persist only in client-side Zustand store for the duration of the round. They are not read back from the server between guesses
- The target word revealed on a failed board comes from `board.targetWord` already stored in the Zustand store from `round_started` — no extra server request is needed

---

## Edge cases

### Animation

- **Round expires mid-animation** — `round_ended` arrives while tiles are mid-flip. The flip for the current row completes in full. After the animation resolves, the board locks. The result is shown (tiles show their colours) but no further input is accepted
- **Two boards solve on the same guess** — both boards' flip animations run in parallel. Both receive their completion highlights after their respective animations complete. The gate stays open until both finish
- **All four boards solve on the same guess** — all four animate in parallel. All receive completion highlights. `submitting` clears when all four are done. The round ends (handled by round lifecycle, not this feature)
- **One board solves and another fails on the same guess** — possible only on the 9th attempt if board A's target matches the guess and board B's does not. Both animate in parallel. Board A gets the completion highlight; board B gets the muted failed state with target word revealed. Both happen after their respective animations complete
- **Shake on a round with only one unsolved board** — the shake shows on that single board. Behaviour is identical to the multi-board case
- **`not_a_word` error arrives but one board was solved earlier** — shake only shows on the unsolved boards (those still receiving shared input). The solved board does not shake
- **Player submits the same word multiple times** — each submission is treated identically. The same result is produced, the same row is consumed, and the animation plays normally. There is no duplicate-detection at the animation layer
- **Very fast repeated Enter presses** — the `submitting` flag is set to `true` on the first emit. All subsequent Enter presses are ignored until the flag clears after animation completes. The server also debounces, but the client guard is the first line of defence
- **Animation runs on a very slow device** — CSS transitions are hardware-accelerated where possible. If the device cannot maintain the animation at the target frame rate, the transition degrades gracefully (CSS handles this). The stagger timing is driven by `setTimeout` on the JS side — on a very slow device, the wall-clock duration may stretch, but the `submitting` flag correctly waits for the actual completion callback, not a hardcoded timeout
- **Board 0 is already solved; guess solves board 1** — board 0 shows no animation. Board 1 flips and receives a completion highlight. Board 2 and 3 flip and return to unsolved state. All three animating boards complete before `submitting` clears

### Visual state

- **A tile that was in Typing state when Enter is pressed** — the tile already shows a letter. The flip animation begins immediately from the Typing visual state; the letter does not need to be re-applied
- **currentInput has fewer than 5 characters and Enter is pressed** — the submission is not sent. No animation of any kind plays. Nothing changes visually
- **Failed board target word is the same as a previous guess** — the target word is shown in the reveal row regardless. It is purely informational
- **A board's 9th attempt is an invalid word (`not_a_word`)** — the shake plays. The 9th attempt row is not consumed. The board does not enter failed state. The player may correct and resubmit. The board only fails when the 9th valid guess does not solve it

---

## Implementation steps

Three steps, strictly ordered. Each step is independently reviewable and produces a meaningful, testable change.

---

### Step 1 — Tile component and static visual states

**Scope:** Build the `Tile` component in all its static visual states (empty, typing, green, yellow, grey) and the `BoardGrid` rendering of a 9×5 tile grid driven entirely from Zustand store state. No animation, no interactivity, no server connection. This step makes every visual state visible in the browser from seeded store data.

**What to build:**

- `Tile.tsx` — a single tile component accepting `letter: string | null`, `state: TileState`, and rendering the correct visual for each state
- `TileState` type: `"empty" | "typing" | "green" | "yellow" | "grey"`
- `BoardGrid.tsx` — renders a 2×2 grid of four boards, each showing 9 rows × 5 tiles, driven from the Zustand `boards[]` store
- Unsolved boards show the shared `currentInput` letters in their current row tiles with the `typing` state
- Solved boards show a completion border/highlight on the board container; no typing row shown
- Failed boards show muted tile colours on all submitted rows and a target-word reveal row below row 9; no typing row shown
- Locked boards show no typing row and no highlight; tiles are frozen at their last submitted state
- All four board status variants (`unsolved`, `solved`, `failed`, `locked`) render correctly from store state without any additional logic in the component

**Done when:**
- `Tile` renders correctly for every `TileState` value including `empty` with no letter
- All four board statuses render the correct visual container state
- The typing row shows shared `currentInput` letters correctly on all unsolved boards
- Solved board container shows completion highlight; solved board shows no typing row
- Failed board shows muted tiles, no typing row, and target word in reveal row below the grid
- Locked board shows no typing row and no container highlight
- Rendering at 375px mobile width and 1280px desktop width shows no overflow or layout break
- Zero runtime errors when any combination of board states is present simultaneously (e.g. one solved, one failed, two unsolved)

**Why first:** Animation cannot be added until the static end-states are correct. Every subsequent step adds behaviour on top of this visual foundation. Reviewers can open the browser, seed the store with different state combinations, and verify all visual states without any interaction needed.

---

### Step 2 — Flip animation and input gate

**Scope:** Add the card-flip reveal animation triggered by `guess_result`, the stagger timing, and the `submitting` gate that blocks all input during animation. This step makes the feature's defining interaction — the staggered tile reveal — live and testable end-to-end.

**What to build:**

- On receiving `guess_result` (success path), trigger the flip animation on all evaluated boards simultaneously
- Each board's tiles flip left to right with a 120ms stagger between positions 0–4
- Each tile's flip: CSS `rotateX` (or `scaleY`) from 0° → 90° (letter disappears) → colour class applied → 90° → 0° (letter reappears coloured)
- The `submitting` flag in the Zustand store remains `true` for the full animation duration across all boards
- After all animations across all boards complete, `submitting` is set to `false` and `currentInput` is cleared — the next shared input row becomes available
- The animation completion is driven by a single Promise that resolves when the last tile's transition ends (`transitionend` event or a calculated timeout matching the last tile's start + flip duration)
- If a board is already solved or failed at submission time, it receives no animation — only unsolved boards animate
- After a board's flip completes and `boardStatus === "solved"`, apply the completion highlight to that board's container
- After a board's flip completes and `boardStatus === "failed"` and it is the 9th attempt, transition that board to failed state after animation — mute tiles and show the target word reveal row
- Global `submitting` flag blocks letter keys, Backspace, and Enter for the full animation duration

**Done when:**
- Tiles flip left to right with correct stagger on all unsolved boards simultaneously after a valid submission
- The flip midpoint correctly hides the letter before applying the colour, then reveals the coloured letter
- `submitting` is `true` for the entire animation duration; keyboard input is fully blocked
- `submitting` clears and `currentInput` empties only after the last tile on the last board finishes
- Solved board receives completion highlight immediately after its flip completes
- Failed board (9th attempt) transitions to failed state — muted tiles and target word revealed — after its flip completes
- Already-solved and already-failed boards receive no animation when a new guess is submitted
- Two boards solve in the same guess: both animate in parallel; both receive completion highlights; gate clears only when both are done

**Why here:** Animation depends on the static visual states from Step 1 being correct (colours cannot flip to the right appearance if the appearance is wrong). The gate mechanism is the critical correctness guarantee for the shared-input model — it must be proven before the error-rejection path (Step 3) is layered on top.

---

### Step 3 — Shake animation and error states

**Scope:** Add the shake animation for `not_a_word` rejection and verify all error-state visual transitions. This step completes the feature by covering the failure paths.

**What to build:**

- On receiving `guess_result` with `error: "not_a_word"`, trigger a horizontal shake animation on the current input row of all unsolved boards simultaneously
- Shake: CSS `translateX` oscillation, ~400ms total, 3–4 cycles, returns to original position
- After shake completes: `submitting` set to `false`; `currentInput` preserved (player can edit and resubmit); no colour changes; no rows consumed on any board
- On receiving `error: "round_expired"`, all non-terminal boards transition to locked state immediately — no animation, tiles frozen at last submitted state, typing row removed
- On receiving `error: "stale_round"`, display a neutral notification and trigger a full game state refresh — no animation
- Shake must not play if the error arrives after the round has already expired (defensive guard: if all boards are already locked, ignore the shake)
- Shake plays only on unsolved boards — already-solved or already-failed boards do not shake
- Shake and flip are mutually exclusive — they cannot both play on the same row at the same time

**Done when:**
- `not_a_word` triggers a shake on all unsolved boards' current input rows simultaneously
- Shake returns the row to its exact pre-shake state: same letters, no colour change, no row advance
- `submitting` clears after shake completes; `currentInput` is unchanged; player can immediately type and resubmit
- `round_expired` locks all non-terminal boards: typing rows removed, tiles frozen, no animation
- Solved boards do not shake on `not_a_word`
- Shake and flip do not conflict — if a shake is somehow triggered during a flip (should not be possible due to `submitting` flag, but defensive test), the shake is ignored
- A board at 9 attempts with an invalid word: shake plays; board does not enter failed state; attempt count unchanged

---

## Test plan (TDD)

Write all tests before the implementation they cover. Each group maps directly to an implementation step. All tests are TypeScript with Vitest + React Testing Library.

---

### Step 1 tests — Tile component and static visual states

**Files:**
- `client/src/components/Tile.test.tsx`
- `client/src/components/BoardGrid.staticStates.test.tsx`

**Type:** Component (React Testing Library + jsdom)

#### Tile component tests

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Empty tile renders no letter | `state="empty"`, `letter={null}` | tile element exists; no text content; no colour class | Empty state baseline |
| 2 | Typing tile shows letter, no colour class | `state="typing"`, `letter="C"` | text content is `"C"`; no green/yellow/grey class | Typing state shows letter only |
| 3 | Typing tile has highlighted border class | `state="typing"`, `letter="A"` | tile has `typing` border class or equivalent | Typing border distinguishes active row |
| 4 | Green tile shows letter and green class | `state="green"`, `letter="R"` | text `"R"`; green background/border class present | Green state correct |
| 5 | Yellow tile shows letter and yellow class | `state="yellow"`, `letter="E"` | text `"E"`; yellow class present | Yellow state correct |
| 6 | Grey tile shows letter and grey class | `state="grey"`, `letter="X"` | text `"X"`; grey class present | Grey state correct |
| 7 | Green tile has no yellow or grey class | `state="green"` | no yellow class, no grey class | State classes are mutually exclusive |
| 8 | Yellow tile has no green or grey class | `state="yellow"` | no green class, no grey class | State classes are mutually exclusive |
| 9 | Grey tile has no green or yellow class | `state="grey"` | no green class, no yellow class | State classes are mutually exclusive |
| 10 | All tile states render without throwing | each state value | no thrown errors | Component stability across all states |
| 11 | Tile renders letter in uppercase | `letter="c"` (lowercase) | rendered text is `"C"` | Case normalisation in display |
| 12 | TypeScript: `TileState` type rejects invalid values at compile time | `state="blue"` in TS | `tsc --noEmit` reports type error | Type safety enforced |

#### BoardGrid static state tests

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 13 | Renders 4 board containers | `initBoards(WORDS)` | 4 boards in DOM | Board count correct |
| 14 | Renders 9 rows per board | `initBoards(WORDS)` | each board has 9 row elements | Row count correct |
| 15 | Renders 5 tiles per row | `initBoards(WORDS)` | each row has 5 tile elements | Tile count correct |
| 16 | All tiles empty on init | `initBoards(WORDS)` | all 180 tiles have `empty` state | Clean blank boards on round start |
| 17 | Shared `currentInput` "CRANE" renders on all 4 unsolved boards | `initBoards`, set `currentInput="CRANE"` | all 4 boards row 0 tiles show C-R-A-N-E with typing state | Shared input renders on all unsolved boards |
| 18 | Shared input does not render on solved board | board 0 solved, `currentInput="CRANE"` | board 0 current row is empty/hidden; boards 1–3 show CRANE | Solved board excluded from shared input |
| 19 | Shared input does not render on failed board | board 0 failed, `currentInput="CRANE"` | board 0 current row empty/hidden; others show CRANE | Failed board excluded from shared input |
| 20 | Shared input does not render on locked board | board 0 locked, `currentInput="CRANE"` | board 0 current row empty/hidden; others show CRANE | Locked board excluded from shared input |
| 21 | Solved board has completion highlight class | solve board 1 in store | board 1 container has `solved` class/attribute | Completion highlight rendered |
| 22 | Unsolved board has no completion highlight | `initBoards` | no board has solved class | Highlight only on solved boards |
| 23 | Failed board tiles are muted | fail board 2 in store | board 2 tiles have `failed` or muted class | Failed visual state rendered |
| 24 | Failed board shows target word in reveal row | fail board 2, `targetWord="stone"` | text "STONE" visible below board 2's 9th row | Target word revealed on failure |
| 25 | Failed board reveal row is below all 9 guess rows | fail board 2 | reveal row is the 10th child of board 2 tile grid | Correct DOM position for reveal row |
| 26 | Unsolved board has no reveal row | `initBoards` | no reveal row element present on any board | Reveal row only on failed boards |
| 27 | Submitted guess row shows correct colours | apply result `["green","grey","yellow","grey","green"]` to board 0 row 0 | tiles 0,4 are green; tile 2 is yellow; tiles 1,3 are grey | Result colours rendered correctly |
| 28 | Two boards show different colours for same row | apply different results to board 0 and board 1 at same row | board 0 and board 1 tiles differ | Board independence in rendering |
| 29 | Renders without error at 375px viewport | set viewport 375px | no overflow, no layout errors | Mobile responsiveness |
| 30 | Renders without error at 1280px viewport | set viewport 1280px | 2×2 grid layout correct | Desktop responsiveness |
| 31 | Mix of all four board states renders without error | one solved, one failed, one locked, one unsolved | correct classes on each; no thrown errors | All states coexist without conflict |

---

### Step 2 tests — Flip animation and input gate

**Files:**
- `client/src/components/Tile.animation.test.tsx`
- `client/src/components/BoardGrid.flip.test.tsx`

**Type:** Component (React Testing Library + jsdom + fake timers via `vi.useFakeTimers()`)

#### Tile flip animation tests

| # | Test | Setup | Action | Expected | What it proves |
|---|------|-------|--------|----------|----------------|
| 32 | Flip class applied to tile on animation start | `state="typing"`, trigger flip | immediately after trigger | tile has `flipping` class | Animation class applied |
| 33 | Tile shows mid-flip state at 50% of flip duration | trigger flip | advance timer to midpoint | tile has `flip-mid` class or equivalent; no colour class yet | Mid-flip: letter hidden before colour applied |
| 34 | Colour class applied at animation midpoint | trigger flip with `green` result | advance to midpoint | green class added at rotation midpoint | Colour applied at correct moment |
| 35 | Tile returns to face-up after full flip | trigger flip | advance timer past full duration | `flipping` class removed; colour class present; letter visible | Animation completes cleanly |
| 36 | Tile 0 animates before tile 1 | `guess_result` with 5 results | check timing | tile 0 animation starts 120ms before tile 1 | Stagger order correct |
| 37 | Tile 4 animates last | `guess_result` | check timing | tile 4 starts at ~480ms after tile 0 | Stagger extends to last tile |
| 38 | All 5 tiles complete animation independently | trigger flip | advance all timers | all 5 tiles in face-up coloured state | Each tile's animation is independent |

#### BoardGrid flip and gate tests

| # | Test | Setup | Action | Expected | What it proves |
|---|------|-------|--------|----------|----------------|
| 39 | `submitting` is `true` immediately after `submit_guess` emitted | valid 5-char input | press Enter | `store.submitting === true` | Gate locks immediately |
| 40 | Keyboard input blocked while `submitting` is `true` | `submitting: true` | `keydown "C"` | `store.currentInput` unchanged | Gate blocks letters |
| 41 | Backspace blocked while `submitting` is `true` | `submitting: true`, `currentInput: "CRA"` | `keydown Backspace` | `currentInput` still `"CRA"` | Gate blocks backspace |
| 42 | Enter blocked while `submitting` is `true` | `submitting: true` | `keydown Enter` | no second emission | Gate blocks double-submit |
| 43 | All boards animate in parallel on `guess_result` | 3 unsolved boards | `guess_result` with 3 board results | all 3 boards begin animating at t=0 | Parallel animation triggered |
| 44 | Already-solved board does not animate | board 0 solved, boards 1–3 unsolved | `guess_result` with entries for boards 1–3 only | board 0 shows no animation class | Solved board excluded |
| 45 | Already-failed board does not animate | board 0 failed, boards 1–3 unsolved | `guess_result` with entries for boards 1–3 only | board 0 shows no animation class | Failed board excluded |
| 46 | `submitting` remains `true` until last tile on last board finishes | 3 boards animating | advance timers to 599ms (just before last tile completes) | `submitting === true` | Gate holds for full duration |
| 47 | `submitting` clears after last tile on last board finishes | 3 boards animating | advance timers past full animation | `submitting === false` | Gate releases at correct moment |
| 48 | `currentInput` cleared only after all animations complete | `currentInput: "CRANE"`, animate | advance all timers | `currentInput === ""` only after last tile done | Shared row cleared in sync with gate |
| 49 | Keyboard accepts input after animation completes | animate to completion | `keydown "C"` | `currentInput === "C"` | Input unblocked correctly |
| 50 | Completion highlight applied after flip on solved board | board 0 receives all-green result | advance timers to completion | board 0 container has `solved` highlight class | Highlight appears post-animation |
| 51 | Completion highlight not applied during flip | board 0 receives all-green result | check mid-animation | board 0 does not have solved class yet | Highlight deferred until animation done |
| 52 | Failed state applied after flip on 9th attempt failure | board 0 at attempt 9, non-green result | advance timers to completion | board 0 has failed class; target word visible | Failed state applied post-animation |
| 53 | Failed state not applied during flip | board 0 at attempt 9 | check mid-animation | board 0 does not have failed class yet | State deferred until animation done |
| 54 | Two boards solve simultaneously — gate waits for both | boards 0 and 1 both get all-green | advance timers | `submitting` clears only when both boards finish | Gate aggregates all boards |
| 55 | One board has more history (started mid-round) — still gates on all | board 0 at row 3, board 1 at row 1 | `guess_result` for both | `submitting` clears only when both finish | Gate is not per-board |
| 56 | Completed rows are not re-animated | boards with 2 submitted rows each | `guess_result` for row 3 | only row 3 tiles animate; rows 1–2 are static | Previous rows not disturbed |

---

### Step 3 tests — Shake animation and error states

**Files:**
- `client/src/components/BoardGrid.shake.test.tsx`
- `client/src/components/BoardGrid.errors.test.tsx`

**Type:** Component (React Testing Library + jsdom + fake timers)

#### Shake animation tests

| # | Test | Setup | Action | Expected | What it proves |
|---|------|-------|--------|----------|----------------|
| 57 | Shake class applied on `not_a_word` | 4 unsolved boards, `currentInput: "CRANE"` | receive `error: "not_a_word"` | all 4 unsolved board current rows have `shaking` class | Shake triggered across all unsolved boards |
| 58 | Shake plays on all unsolved boards simultaneously | boards 1–3 unsolved, board 0 solved | receive `error: "not_a_word"` | boards 1, 2, 3 shake; board 0 does not | Shake respects board terminal state |
| 59 | Shake class removed after animation completes | receive `not_a_word` | advance timers past 400ms | no board has `shaking` class | Shake is transient |
| 60 | No colour change during or after shake | receive `not_a_word` | advance all timers | all tile colours unchanged | Shake never modifies colours |
| 61 | No row advance after shake | receive `not_a_word` | advance all timers | current row index unchanged; next row still blank | Shake does not consume a row |
| 62 | `currentInput` preserved after shake | `currentInput: "CRANE"`, receive `not_a_word` | advance all timers | `currentInput === "CRANE"` | Player can correct and resubmit |
| 63 | `submitting` clears after shake | receive `not_a_word` | advance all timers | `submitting === false` | Input unblocked after shake |
| 64 | Player can retype after shake | receive `not_a_word`, shake completes | `keydown "S"` (after backspace to edit) | `currentInput` updates | Interaction restored post-shake |
| 65 | Shake does not trigger flip | receive `not_a_word` | observe classes | no `flipping` class appears on any tile | Shake and flip are mutually exclusive |
| 66 | Board at 9 attempts with `not_a_word` — shake plays, no fail | board at attemptCount 9, receive `not_a_word` | advance timers | shake plays; board status still `unsolved`; target word not shown | Attempt cap only on valid word |
| 67 | Shake does not play on already-locked board | all boards locked, receive `not_a_word` (defensive) | observe | no shake class on any board | Locked boards immune to shake |
| 68 | Shake and flip cannot coexist — shake ignored if `submitting` | `submitting: true` (flip in progress) | simulate `not_a_word` arriving | no shake triggered | `submitting` flag prevents shake during flip |

#### Error state tests

| # | Test | Setup | Action | Expected | What it proves |
|---|------|-------|--------|----------|----------------|
| 69 | `round_expired` error locks all unsolved boards | 4 unsolved boards | receive `error: "round_expired"` | all boards transition to locked; typing rows removed | Timer expiry locks everything |
| 70 | `round_expired` does not lock solved board | board 0 solved, others unsolved | receive `error: "round_expired"` | board 0 stays solved; others lock | Solved boards protected |
| 71 | `round_expired` does not lock failed board | board 0 failed, others unsolved | receive `error: "round_expired"` | board 0 stays failed; others lock | Failed boards protected |
| 72 | `round_expired` does not trigger animation | 2 unsolved boards | receive `error: "round_expired"` | no flip class, no shake class on any board | Lock is immediate, not animated |
| 73 | `currentInput` cleared on `round_expired` | `currentInput: "PLAN"` | receive `error: "round_expired"` | `currentInput === ""` | Shared input wiped on lock |
| 74 | `submitting` clears on `round_expired` | `submitting: true` | receive `error: "round_expired"` | `submitting === false` | Gate released on expiry |
| 75 | `stale_round` error does not animate any board | any board state | receive `error: "stale_round"` | no flip, no shake on any board | Stale round is a silent error at animation layer |
| 76 | `all_boards_terminal` received — no crash | all boards solved | server sends `all_boards_terminal` (defensive) | no thrown error; no state change | Graceful handling of unexpected error |
| 77 | Flip mid-animation when `round_expired` arrives — flip completes then locks | board mid-flip | receive `error: "round_expired"` | flip plays to completion; board then locks | Animation not interrupted |
| 78 | Colour tiles visible after `round_expired` mid-flip | board mid-flip | receive `error: "round_expired"`, advance timers | completed flip tiles show colours; board locked | Result visible even after expiry |