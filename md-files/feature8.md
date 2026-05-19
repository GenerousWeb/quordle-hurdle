# F8 · Admin Game Controls

## Summary

The admin has exclusive contextual controls at every stage of the game: starting the first round from the waiting room, advancing to the next round from the between-rounds screen, shuffling upcoming words before a round starts, ending the game early at any point, and restarting with the same group after the game ends. Non-admin players see the same screens without any of these controls. If the admin disconnects, control is automatically transferred (F16).

---

## Goals

- Admin controls are always contextual — the right button appears on the right screen
- Non-admin players never see admin controls
- All admin actions are confirmed by a server-side role check — the client cannot fake admin status
- Round progression is entirely manual; nothing advances without the admin's explicit action

---

## Assumptions

- Admin role is determined by the session cookie, not by a client-sent flag in the payload
- Server rejects any admin action from a non-admin socket with a `not_authorized` error
- `shuffleWords` is only available between the time `round_started` fires and the round actually begins — not during an active round
- "Play Again" resets scores to zero but keeps the same player list and returns to `waiting` status
- `endGame` can be triggered at any status except `finished`
- The admin action buttons do not require a confirmation dialog for MVP

---

## Edge cases

- **Non-admin socket emits `start_game`** — server returns `not_authorized`; no state change
- **Admin clicks "Start Next Round" when game status is not `between_rounds`** — server rejects; no state change
- **Admin clicks "Start Game" with 0 players (only themselves)** — allowed; admin counts as a player
- **Admin clicks "End Game" mid-round** — round ends immediately; `game_ended` fires; all boards lock
- **"Play Again" resets usedWords** — the word pool is fully available for the new game session
- **Admin double-clicks a button** — button disabled after first emit; second click ignored

---

## Technical design

### WebSocket events (Client→Server, admin only)

| Event | When available | Effect |
|-------|---------------|--------|
| `start_game` | Waiting room, ≥1 player | Transitions game to `active`, fires `round_started` |
| `start_next_round` | `between_rounds` status only | Fires `round_started` for next round |
| `end_game` | Any status except `finished` | Fires `game_ended` to room |
| `restart_game` | `finished` status only | Resets scores, resets `usedWords`, returns to `waiting` |
| `shuffle_words` | Pre-round only | Re-draws 4 words; does not fire to players |

Server-side check on every event: `if (socket.role !== "admin") emit("not_authorized"); return;`

---

## Implementation steps

### Step 1 — Admin button rendering and role-based visibility

**Scope:** Build the conditional rendering of admin controls on each screen. No server wiring yet — just the UI showing the right buttons to the right role.

**What to build:**
- Waiting room: "Start Game" button visible only to admin; "Waiting for admin…" shown to players
- Between-rounds screen: "Start Next Round" and "End Game" visible only to admin
- End screen: "Play Again" visible only to admin
- All buttons disabled when relevant preconditions not met (e.g. Start Game with 0 players)

**Done when:**
- Admin role shows all contextual buttons; non-admin sees none
- Start Game disabled with 0 players; enabled with ≥1
- All buttons render at correct screens

---

### Step 2 — Server-side role enforcement and event handlers

**Scope:** Implement all five admin WebSocket event handlers on the server with role checks. Wire client button clicks to emit events.

**What to build:**
- Server handlers for `start_game`, `start_next_round`, `end_game`, `restart_game`, `shuffle_words`
- Role check on each: reject with `not_authorized` if not admin
- `start_game`: transition game to `active`, select words, fire `round_started`
- `start_next_round`: transition to `active` from `between_rounds`, fire `round_started`
- `end_game`: transition to `finished`, fire `game_ended`
- `restart_game`: reset game state (scores=0, usedWords=[], status=`waiting`), fire `game_state_update`
- `shuffle_words`: re-draw 4 words from pool, does not notify players

**Done when:**
- Each admin action produces correct game state transitions
- Non-admin socket emitting admin events receives `not_authorized`
- `restart_game` fully resets scores and word pool
- `end_game` mid-round locks boards and fires `game_ended`

---

## Test plan

### Step 1 — UI rendering

**File:** `client/src/components/AdminControls.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Admin sees Start Game button in waiting room | `isAdmin=true, status="waiting"` | button present | Admin conditional |
| 2 | Non-admin does not see Start Game | `isAdmin=false, status="waiting"` | no button; holding text visible | Non-admin view |
| 3 | Admin sees Start Next Round in between-rounds | `isAdmin=true, status="between_rounds"` | button present | Contextual rendering |
| 4 | Admin sees End Game in between-rounds | `isAdmin=true, status="between_rounds"` | End Game button present | End game control |
| 5 | Admin sees Play Again on end screen | `isAdmin=true, status="finished"` | Play Again button present | Post-game control |
| 6 | Start Game disabled with 0 players | `isAdmin=true, players=[]` | button disabled | Precondition enforced |
| 7 | Start Game enabled with 1 player | `isAdmin=true, players=[{name:"Alex"}]` | button enabled | Enabled state |

### Step 2 — Server handlers

**File:** `server/src/game/adminHandlers.test.ts` (integration)

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 8 | `start_game` transitions game to active | admin socket, waiting game | `round_started` fired to room | Start game works |
| 9 | `start_game` from non-admin rejected | player socket | `not_authorized` error | Role check enforced |
| 10 | `start_next_round` from `between_rounds` fires `round_started` | admin, between_rounds | `round_started` received | Round advance works |
| 11 | `start_next_round` from wrong status rejected | admin, `active` status | `not_authorized` or `invalid_state` error | State check enforced |
| 12 | `end_game` fires `game_ended` | admin, active game | `game_ended` received by all | End game works |
| 13 | `restart_game` resets scores to 0 | admin, finished game | all player scores = 0 in Redis | Reset correct |
| 14 | `restart_game` resets usedWords | admin, finished game | `game:{id}:usedWords` is empty | Word pool reset |
| 15 | `shuffle_words` re-draws without notifying players | admin, pre-round | words changed in server state; no `round_started` fired | Shuffle correct |
| 16 | `end_game` mid-round locks boards | admin, active round | `game_ended` fires; board state locked | Mid-round end works |
