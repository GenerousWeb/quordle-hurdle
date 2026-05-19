# F9 · Between-Rounds Summary

## Summary

After each round ends (timer expiry or all players finish), the game transitions to a `between_rounds` state. All players see the four target words revealed in a 2×2 grid, a ranked leaderboard showing each player's round score and running total, and a holding message. The admin sees a "Start Next Round" button (or "End Game" if it was the final round). The screen holds indefinitely until the admin acts. No auto-advance.

---

## Goals

- Every player immediately sees the four answers after a round ends
- The leaderboard clearly shows both the round contribution and the cumulative total
- The current player's row is visually highlighted
- The admin has clear, unambiguous control over when the next round begins
- Non-admin players know explicitly that they are waiting for the admin

---

## Assumptions

- The between-rounds data arrives in the `round_ended` WebSocket event payload: `{ roundNumber, words[], leaderboard[] }`
- `leaderboard[]` includes `playerId`, `name`, `roundScore`, `totalScore` for every player
- The current player identifies their own row by matching `playerId` from their session
- If a player joins during `between_rounds` (new or reconnecting), they receive `round_ended` data replayed via a `game_state_update` event on connection
- The screen holds indefinitely — there is no countdown or auto-start; only the admin's action advances the game

---

## Edge cases

- **Final round ends** — admin sees "End Game" instead of "Start Next Round"; clicking it fires `game_ended`
- **Player joins during between_rounds** — receives current game state including round summary; participates from next round
- **Admin disconnects during between_rounds** — auto-promotion fires (F16); new admin sees the button immediately
- **Two players tied on total score** — sorted by round score (descending); then by words solved if still tied
- **A player who was disconnected for the whole round** — appears in leaderboard with 0 round score; their row is still shown
- **Admin clicks "Start Next Round" twice quickly** — button disabled after first click; second emit ignored

---

## Technical design

### WebSocket event

`round_ended` payload:
```json
{
  "roundNumber": 2,
  "words": ["grove", "plumb", "blaze", "crisp"],
  "leaderboard": [
    { "playerId": "abc", "name": "Alex", "roundScore": 72, "totalScore": 230 },
    { "playerId": "def", "name": "Sam",  "roundScore": 64, "totalScore": 188 }
  ]
}
```

Game status transitions to `between_rounds` on the server when `round_ended` fires.

---

## Implementation steps

### Step 1 — Between-rounds summary screen UI

**Scope:** Build the static between-rounds screen driven from `round_ended` payload data in the Zustand store. Admin/player conditional buttons.

**What to build:**
- `BetweenRounds` page component: 2×2 word reveal grid, leaderboard table, admin/player conditional button
- Word reveal grid: 4 cards, each showing board number and the revealed word in uppercase
- Leaderboard table: rank, name, round score (with `+` prefix), total score; current player row highlighted
- Admin sees "Start Next Round" (or "End Game" if final round); player sees "Waiting for admin…"
- Zustand store: `roundSummary` field updated from `round_ended` event

**Done when:**
- Four words displayed in 2×2 grid layout
- Leaderboard sorted by total score descending
- Current player's row highlighted
- Admin sees correct button for round position (not-final vs final)
- Non-admin sees holding message

---

### Step 2 — Server `round_ended` broadcast and game status transition

**Scope:** Server fires `round_ended` on timer expiry or all-players-finished. Transitions game to `between_rounds`. Calculates round scores per player.

**What to build:**
- Server fires `round_ended` broadcast with words and leaderboard on deadline or all-finished
- Game status transitions to `between_rounds` in Redis
- `start_next_round` handler validates game is in `between_rounds` before advancing
- If final round: `start_next_round` replaced by `end_game` path

**Done when:**
- `round_ended` fires at deadline with correct words and leaderboard
- `round_ended` fires early when all players finish
- Game status correctly transitions to `between_rounds`
- `start_next_round` advances from `between_rounds` only
- Final round correctly routes to `game_ended` not another round

---

## Test plan

### Step 1 — Summary screen UI

**File:** `client/src/pages/BetweenRounds.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Renders 4 revealed words | `words=["grove","plumb","blaze","crisp"]` | all 4 words visible in uppercase | Word reveal works |
| 2 | Words displayed in 2×2 grid | render | 4 word cards in grid layout | Layout correct |
| 3 | Leaderboard ranks players by total score | leaderboard with mixed scores | rank order matches total score desc | Sorting correct |
| 4 | Current player row highlighted | `myPlayerId="abc"`, leaderboard has "abc" | Alex row has highlight class | Self-identification |
| 5 | Round score shown with `+` prefix | `roundScore: 64` | displays `+64` | Score format |
| 6 | Admin sees "Start Next Round" | `isAdmin=true, isLastRound=false` | button present | Admin control |
| 7 | Admin sees "End Game" on final round | `isAdmin=true, isLastRound=true` | "End Game" button; no "Start Next Round" | Final round handling |
| 8 | Non-admin sees holding message | `isAdmin=false` | waiting message visible; no action button | Non-admin view |

### Step 2 — Server broadcast

**File:** `server/src/game/roundEnd.test.ts` (integration)

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 9 | `round_ended` fires at deadline | seed Redis TTL expiry | all clients receive `round_ended` | Timer-based end |
| 10 | `round_ended` payload contains words | fire round_ended | `words[]` matches seeded target words | Words revealed |
| 11 | `round_ended` leaderboard sorted by total score | multi-player game | leaderboard descending by totalScore | Sort order |
| 12 | Game status becomes `between_rounds` | after `round_ended` | Redis game status = "between_rounds" | Status transition |
| 13 | `start_next_round` from `between_rounds` fires `round_started` | admin fires after round_ended | `round_started` received | Advance works |
| 14 | `start_next_round` rejected when not in `between_rounds` | admin fires during active | rejected | State guard |
| 15 | Final round `end_game` fires `game_ended` | last round ends | `game_ended` event received | Final round routing |
