# F13 · End Game & Podium

## Summary

After all rounds complete (or admin ends the game early), a `game_ended` event fires and all players see the end game screen. A podium highlights 1st, 2nd, and 3rd place visually. The full ranked table shows all players below it. The admin sees a "Play Again" button to restart with the same group. Any player can copy a shareable results summary (F14). The game is now in `finished` status.

---

## Goals

- The podium provides a clear, celebratory conclusion to the game
- The full leaderboard is accessible for all players to review
- The admin can immediately restart a rematch without re-sharing the link
- The screen is the terminal state — no further gameplay actions are possible

---

## Assumptions

- `game_ended` payload includes `finalLeaderboard[]` and `podium[]` (top 3)
- `podium[]` is always pre-sorted by the server: rank 1, 2, 3
- If fewer than 3 players exist, the podium renders only the available ranks
- "Play Again" sends `restart_game` WebSocket event; the server resets the game to `waiting` status with the same players
- Players see the end screen until they navigate away or the game is restarted
- No scores or session data is purged from the server until `restartGame` or the game TTL expires

---

## Edge cases

- **Only 1 player** — podium shows only 1st place; no 2nd or 3rd slot
- **Tie for 2nd place** — server determines ordering; display reflects server's order; no tie-break UI
- **Admin ends game mid-round** — `game_ended` fires immediately; boards lock; end screen shown to all
- **"Play Again" with disconnected players** — disconnected players rejoin the waiting room when they reconnect; they rejoin the same game
- **New player opens invite link after game finished** — they see the end screen (read-only leaderboard); no "Play Again" button for them

---

## Technical design

### `game_ended` payload

```json
{
  "podium": [
    { "rank": 1, "name": "Alex",   "score": 317 },
    { "rank": 2, "name": "Sam",    "score": 252 },
    { "rank": 3, "name": "Jordan", "score": 185 }
  ],
  "finalLeaderboard": [
    { "playerId": "abc", "name": "Alex",   "totalScore": 317 },
    { "playerId": "def", "name": "Sam",    "totalScore": 252 },
    { "playerId": "ghi", "name": "Jordan", "totalScore": 185 },
    { "playerId": "jkl", "name": "Riley",  "totalScore": 42 }
  ]
}
```

### Server state on `game_ended`

- Game status transitions to `finished` in Redis
- All board locks are applied
- `game_ended` broadcast to room
- Game state persisted to PostgreSQL asynchronously

---

## Implementation steps

### Step 1 — End game screen UI: podium and full leaderboard

**Scope:** Build the end game screen driven from `game_ended` payload. Podium component, full leaderboard table, and admin-only "Play Again" button.

**What to build:**
- `EndGame` page: podium, full leaderboard table, admin/player conditional "Play Again" button
- `Podium` component: 3 slots (or fewer); 1st taller/more prominent; medal emoji per rank
- Full leaderboard table: rank, name, total score; current player highlighted
- "Play Again" button visible to admin only; emits `restart_game`

**Done when:**
- Podium renders with correct rank order and visual prominence for 1st place
- Full table sorted by total score
- Current player highlighted in table
- Admin sees "Play Again"; non-admin does not
- End screen renders for < 3 player games without errors

---

### Step 2 — Server `game_ended` broadcast and `restart_game` handler

**Scope:** Server fires `game_ended` correctly. `restart_game` resets game to `waiting`.

**What to build:**
- `game_ended` broadcast from final round end or admin `end_game` action
- Status transitions to `finished`; persists to PostgreSQL async
- `restart_game` handler: resets `status=waiting`, `scores=0`, `usedWords=[]`, `currentRound=1`; fires `game_state_update` to room

**Done when:**
- `game_ended` fires at correct moment with correct payload
- Game status becomes `finished` in Redis
- `restart_game` fully resets game and returns all clients to waiting room
- Non-admin `restart_game` rejected

---

## Test plan

### Step 1 — End game UI

**File:** `client/src/pages/EndGame.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Podium renders 3 slots for 3+ players | 4-player game | 3 podium slots | Podium count |
| 2 | Podium renders 1 slot for 1 player | 1-player game | 1 slot only | Under-3 handling |
| 3 | 1st place slot is visually distinct | render | 1st slot has tallest/prominent styling | Visual hierarchy |
| 4 | Correct player in each podium slot | `podium=[{rank:1,name:"Alex",...}]` | Alex in 1st slot | Data mapped correctly |
| 5 | Full leaderboard sorted by total score | 4 players with mixed scores | descending total score order | Sort correct |
| 6 | Current player row highlighted in table | `myPlayerId` matches an entry | row has highlight class | Self-identification |
| 7 | Admin sees Play Again | `isAdmin=true` | button present | Admin conditional |
| 8 | Non-admin does not see Play Again | `isAdmin=false` | no button | Non-admin view |
| 9 | Play Again emits `restart_game` | admin clicks | `restart_game` event emitted | Action correct |

### Step 2 — Server `game_ended`

**File:** `server/src/game/endGame.test.ts` (integration)

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 10 | `game_ended` fires after final round | complete final round | all clients receive `game_ended` | Event fires |
| 11 | `game_ended` payload has podium | multi-player game | `podium[]` has correct top 3 | Payload correct |
| 12 | Game status becomes `finished` | `game_ended` fires | Redis status = "finished" | Status transition |
| 13 | Admin `end_game` mid-round fires `game_ended` | admin fires during active round | `game_ended` received | Early end works |
| 14 | `restart_game` resets scores to 0 | admin restarts | all player scores = 0 | Reset correct |
| 15 | `restart_game` sets status to `waiting` | admin restarts | Redis status = "waiting" | Status reset |
| 16 | `restart_game` clears usedWords | admin restarts | usedWords set is empty | Word pool reset |
| 17 | Non-admin `restart_game` rejected | player socket | `not_authorized` | Role check |
