# F7 · Joining a Game

## Summary

Any player with the invite link can join a game at any point without an account. They enter a display name on first visit (stored in a session cookie). The server places them into the game based on its current status — waiting, active, between rounds, or finished — and they are routed directly to the appropriate screen. Mid-round joiners receive only the remaining time and start with blank boards.

---

## Goals

- Zero friction to join — one name entry, then straight into the game
- Players land on the correct screen for the game's current state automatically
- Session cookie enables seamless re-identification on the same device
- No accounts, no passwords, no email

---

## Assumptions

- Display name is stored in an httpOnly session cookie after the first `POST /game/join`
- If the player already has a cookie from a previous session in this game, name entry is skipped and they are placed directly (reconnection is F15)
- Name is required; max 20 characters
- If the game status is `finished`, the player sees the final leaderboard but cannot participate
- If the player cap is already reached, they see a "game is full" message and cannot join
- `POST /game/join` is the only entry point — opening the WebSocket without joining first is rejected

---

## Edge cases

- **Player opens invite link to a finished game** — sees the final leaderboard; "game is over" message; no form
- **Player opens invite link to a game in `active` status** — joins with remaining time only; boards blank; no prior history
- **Player opens invite link to a game in `between_rounds`** — lands on between-rounds summary screen; participates from next round
- **Player cap reached** — `POST /game/join` returns 403; client shows "This game is full" message
- **Name submitted as whitespace** — trimmed and rejected with inline error
- **Same browser opens invite twice** — second open re-identifies via cookie; not counted as a new player

---

## Technical design

### API

```
POST /game/join
Body: { gameId, playerName }
Response 200: { playerId, gameStatus, deadline? }
Response 403: { error: "game_full" }
Response 404: { error: "game_not_found" }
Response 409: { error: "game_finished" }
```

### Routing logic (client)

```
gameStatus === "waiting"       → /wait/{gameId}
gameStatus === "active"        → /play/{gameId}  (with deadline)
gameStatus === "between_rounds" → /between/{gameId}
gameStatus === "finished"       → /end/{gameId}  (read-only)
```

---

## Implementation steps

### Step 1 — Name entry screen and `POST /game/join` with routing

**Scope:** Build the name entry form. Wire to `POST /game/join`. Route to the correct screen based on `gameStatus` returned. Handle cap-reached and game-not-found errors.

**What to build:**
- `JoinGame` page: name input, submit, inline errors
- `POST /game/join` Fastify route: validates name, checks cap, sets session cookie, returns status
- Client routing on response: navigate to correct page
- Error states: full game, game not found, game finished

**Done when:**
- Valid name navigates to correct screen per game status
- Empty or whitespace name shows inline error
- "Game full" shows user-friendly message
- Session cookie set on success

---

### Step 2 — Mid-round join: remaining time and blank boards

**Scope:** Ensure players joining an active round receive `deadline` from `round_started` context and see blank boards. No reconnection logic (F15).

**What to build:**
- Server includes `deadline` in `POST /game/join` response when `gameStatus === "active"`
- Client initialises timer from `deadline - Date.now()` immediately on landing in `/play/{gameId}`
- Boards initialise blank; shared input available immediately

**Done when:**
- Joining mid-round shows correct remaining time
- Boards are completely blank (no prior round history)
- Timer starts immediately from remaining time

---

## Test plan

### Step 1 — Join flow

**File:** `server/src/routes/joinGame.test.ts` + `client/src/pages/JoinGame.test.tsx`

| # | Test | Type | Setup | Expected | What it proves |
|---|------|------|-------|----------|----------------|
| 1 | Valid join to waiting game returns 200 | Integration | POST to waiting game | 200, gameStatus="waiting" | Happy path |
| 2 | Valid join to active game returns deadline | Integration | POST to active game | 200, has deadline field | Deadline returned |
| 3 | Join to full game returns 403 | Integration | game at maxPlayers | 403, error="game_full" | Cap enforced |
| 4 | Join to finished game returns 409 | Integration | finished game | 409, error="game_finished" | Finished game handled |
| 5 | Session cookie set on join | Integration | POST /game/join | Set-Cookie present | Session created |
| 6 | Empty name shows inline error | Component | submit with empty name | error visible | Client validation |
| 7 | Whitespace name shows error | Component | name="   " | error visible | Trim validation |
| 8 | Waiting game routes to /wait/{gameId} | Component | `gameStatus="waiting"` | navigate called with correct path | Routing correct |
| 9 | Active game routes to /play/{gameId} | Component | `gameStatus="active"` | navigate to /play path | Routing correct |
| 10 | Finished game routes to /end/{gameId} | Component | `gameStatus="finished"` | navigate to /end path | Routing correct |
| 11 | Full game message shown | Component | 403 response | "game is full" visible | Error message |

### Step 2 — Mid-round join

**File:** `client/src/pages/GamePage.midRoundJoin.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 12 | Timer starts from remaining time | join with `deadline = now + 45000` | timer shows ~0:45 | Remaining time used |
| 13 | Boards are blank on join | join mid-round | all boards empty, no prior guesses | No history replayed |
| 14 | Input available immediately | join mid-round | keyboard input accepted | Player can guess immediately |
