# F4 · Scoring

## Summary

Players earn points on every guess based on the colour feedback from all evaluated boards combined. Green tiles score +3 each, yellow tiles +1 each. Solving a word earns a flat +10 bonus. Finishing all four boards before the timer expires earns an additional time-based bonus. All scoring is calculated server-side and returned in `guess_result` as `totalScoreDelta`. The client displays a score popup after each guess and maintains a running total visible in the nav bar.

---

## Goals

- Scoring is entirely server-side; the client never calculates points
- Players receive immediate visual feedback (score popup) after every guess
- The scoring formula is deterministic and auditable from the `guess_result` payload
- Running totals are always current in the nav bar
- The leaderboard between rounds and at game end reflects final accurate scores

---

## Assumptions

- `totalScoreDelta` in `guess_result` is the sum of all per-board `scoreDelta` values for that guess
- A guess that scores 0 (all grey across all boards) still triggers the popup, showing `+0`
- Early-finish bonus is calculated at the moment the last board is solved, using `floor((deadline - Date.now()) / 10)` in seconds on the server. The client receives the bonus as part of `totalScoreDelta` — it does not calculate it
- Scoring applies only to valid guesses (not rejected `not_a_word` attempts)
- A player who joins mid-round starts from 0 score for that round
- Score is cumulative across all rounds; it is not reset between rounds

---

## Edge cases

- **All tiles grey across all boards** — `totalScoreDelta = 0`; popup shows `+0`; score unchanged
- **Same guess solves multiple boards simultaneously** — each solved board contributes its +10 bonus independently; `totalScoreDelta` reflects the sum
- **Player finishes all 4 boards with 0 seconds remaining** — `floor(0 / 10) = 0`; no early-finish bonus; expected behaviour
- **Early-finish bonus with fractional seconds** — `floor()` truncates correctly; 14 seconds remaining = +1 bonus
- **Score popup overlaps with another popup** — stack or replace; last popup wins for MVP
- **Player never solves any board** — score from yellow/green tiles on failed attempts still counts; 0 word-solve bonuses

---

## Technical design

### Scoring formula (server-side)

```
scoreDelta = 0
for each TileResult in board.result:
  if "green":  scoreDelta += 3
  if "yellow": scoreDelta += 1

if all 5 are "green":
  scoreDelta += 10                          // word solve bonus

if all 4 boards now solved:
  secondsRemaining = floor((deadline - now) / 1000)
  scoreDelta += floor(secondsRemaining / 10) // early finish bonus

totalScoreDelta = sum of all per-board scoreDelta values
```

### Client display

- On `guess_result`: show popup with `+{totalScoreDelta}` for ~1.5 seconds then fade
- Running total in nav bar updated from `leaderboard_update` after each guess
- Score popup is purely visual — no store update needed for the popup itself

---

## Implementation steps

### Step 1 — Server scoring engine and `guess_result` delta

**Scope:** Implement the server-side scoring calculation as a pure function. Wire it into the `submit_guess` handler. Return `scoreDelta` per board and `totalScoreDelta` in `guess_result`.

**What to build:**
- `calculateScore(result: TileResult[], isSolved: boolean, isEarlyFinish: boolean, secondsRemaining: number): number` — pure function
- Wire into `submit_guess` handler after matching; calculate per-board and aggregate
- Include `scoreDelta` per board entry and `totalScoreDelta` at response root in `guess_result`

**Done when:**
- Mixed result returns correct sum of greens × 3 + yellows × 1
- Solve bonus +10 added when all 5 green
- Early-finish bonus added only when all 4 boards solved, using correct seconds remaining
- Zero score returned for all-grey guess

---

### Step 2 — Score popup and nav bar running total

**Scope:** Client-side score display. Show `+N` popup after each `guess_result`. Update running total in nav bar from `leaderboard_update`.

**What to build:**
- `ScorePopup` component: appears on `guess_result`, shows `+{totalScoreDelta}`, auto-hides after 1.5 seconds
- Nav bar player dot updated with current score from `leaderboard_update` payload
- Zustand store: `myScore` field updated on each `leaderboard_update`

**Done when:**
- Popup appears and disappears correctly after each guess
- `+0` shown for all-grey guesses
- Nav score badge reflects updated total after each guess
- Popup does not persist across rounds

---

## Test plan

### Step 1 — Scoring engine

**File:** `server/src/game/calculateScore.test.ts`
**Type:** Unit

| # | Test | Input | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | All green on one board | 5 greens, solved=true | 15 + 10 = 25 | Greens + solve bonus |
| 2 | Mixed result | 2 green, 2 yellow, 1 grey | 6 + 2 = 8 | Mixed calculation |
| 3 | All grey | 5 grey, solved=false | 0 | Zero score for no matches |
| 4 | All yellow | 5 yellow, solved=false | 5 | Yellow-only score |
| 5 | Solve bonus not added when not all green | 4 green 1 grey | 12 (no +10) | Solve bonus gated correctly |
| 6 | Early finish bonus: 14s remaining | all 4 boards solved, 14s | floor(14/10)=1 | Floor calculation correct |
| 7 | Early finish bonus: 0s remaining | all 4 boards solved, 0s | 0 | No bonus at exactly zero |
| 8 | Early finish bonus: 100s remaining | all 4 boards solved, 100s | 10 | Large bonus correct |
| 9 | Early finish not added when not all boards solved | 3 boards solved, 4th unsolved | no early-finish bonus | Bonus gated on all-4 condition |
| 10 | `totalScoreDelta` is sum across boards | 3 boards with deltas 8, 4, 0 | totalScoreDelta=12 | Aggregation correct |

### Step 2 — Score popup and nav update

**File:** `client/src/components/ScorePopup.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 11 | Popup appears after `guess_result` | receive `guess_result` with `totalScoreDelta: 14` | popup shows `+14` | Popup triggered |
| 12 | Popup shows `+0` for zero delta | `totalScoreDelta: 0` | popup shows `+0` | Zero delta displayed |
| 13 | Popup disappears after 1.5 seconds | advance fake timers 1500ms | popup no longer in DOM | Auto-hide works |
| 14 | Nav score badge updates after leaderboard_update | receive `leaderboard_update` with new score | badge reflects new total | Running total updated |
| 15 | Score persists across guesses | two consecutive `guess_result` events | score accumulates | No reset between guesses |
