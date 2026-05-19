# F15 · Reconnection

## Summary

If a player loses connection (browser closed, network drop, page refresh), they can return to the game using the same invite link. Their session cookie re-identifies them on the server, which reassigns them to their existing player record without consuming an extra player slot. They receive the current game state and, if in an active round, the remaining time. Boards start blank — no prior guess history is replayed. If the round ended while they were disconnected, they land on the between-rounds screen.

---

## Goals

- A disconnected player can rejoin with no friction — just re-open the invite link
- Their score and player slot are preserved during disconnection
- They land on the correct screen for the game's current state
- Reconnection does not disrupt other players

---

## Assumptions

- The session cookie (`playerId`, `gameId`) is httpOnly and persists across browser sessions until the game TTL expires
- The server matches a reconnecting player by their session cookie alone — no name re-entry required
- Reconnecting players receive `deadline` for the current round (if active) but no guess history
- Boards are always blank on reconnect — no attempt is made to reconstruct prior guesses
- A player is considered "disconnected" when their socket closes; their `isConnected` flag in Redis becomes `false`
- The player's slot is not freed on disconnect — only on explicit game end or TTL expiry
- If the game has ended (`finished`) while the player was disconnected, they land on the end screen (read-only)

---

## Edge cases

- **Player reconnects during an active round** — receives `deadline`; boards blank; timer starts from remaining time
- **Player reconnects during `between_rounds`** — sees between-rounds summary immediately
- **Player reconnects after the game ended** — sees end screen with final leaderboard
- **Player reconnects and their slot was freed** (game TTL expired) — `POST /game/join` returns 404; they see "game not found" message
- **Admin reconnects** — reassigned admin role; admin controls reappear immediately
- **Player reconnects on a different device** — session cookie won't be there; treated as a new player (new slot if cap not reached); old slot remains until TTL
- **Player disconnects and reconnects within the same second** — `isConnected` flag flickers; no visible disruption to the player; other players may see a brief muted state
- **All players disconnect simultaneously** (server restart) — each reconnects independently; game state survives in Redis

---

## Technical design

### Reconnection flow

```
1. Player opens invite link
2. Browser sends session cookie with POST /game/join
3. Server finds existing playerId in Redis:
   - If found and game not finished: isConnected=true; return current game state
   - If not found or game finished: treat as new player
4. Client routes to correct screen based on gameStatus
5. If gameStatus="active": initialise timer from deadline-Date.now(); boards blank
6. Socket.io reconnect: player re-joins their game room via join_game event
7. Server fires game_state_update to player's socket only (reconnect-specific)
```

### `isConnected` management

- Set to `false` on socket disconnect event
- Set to `true` on `join_game` event
- `game_state_update` includes `isConnected` per player so opponent strip updates

### Duplicate socket prevention

- On reconnect, old socket (if somehow still open) is closed server-side before new socket is added

---

## Implementation steps

### Step 1 — Session cookie identity and server-side reconnection matching

**Scope:** Server-side: match reconnecting players by session cookie; restore `isConnected`; return current game state in `POST /game/join` response. No client routing changes needed — F7 already routes by `gameStatus`.

**What to build:**
- `POST /game/join` handler: check for existing `playerId` in session cookie; if found and game is not finished, restore player record (`isConnected=true`); return current game state
- On `join_game` WebSocket event: re-add socket to game room; fire `game_state_update` to room (so opponent strips update)
- On socket disconnect: set `isConnected=false` in Redis; fire `game_state_update` to room

**Done when:**
- Reconnecting player with valid cookie is matched without creating a new slot
- `isConnected` transitions correctly on disconnect and reconnect
- `game_state_update` fires to room on both disconnect and reconnect
- Reconnecting player does not count against player cap

---

### Step 2 — Client: blank boards, remaining timer, correct screen routing on reconnect

**Scope:** Client-side: on reconnect, boards are blank, timer starts from remaining time, and the player lands on the correct screen. This should largely work already from F7 routing; this step verifies and fills any gaps.

**What to build:**
- Verify `POST /game/join` response for a reconnecting player includes `deadline` when `gameStatus=active`
- `GamePage` initialises blank boards and timer from `deadline` on mount — no board history applied
- Verify routing: `active` → game page; `between_rounds` → between-rounds page; `finished` → end page

**Done when:**
- Reconnecting to active round: boards blank; timer starts from remaining time
- Reconnecting to `between_rounds`: lands on between-rounds screen
- Reconnecting to `finished`: lands on end screen
- No guess history shown on reconnect

---

## Test plan

### Step 1 — Server reconnection matching

**File:** `server/src/routes/reconnection.test.ts` (integration)

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Reconnecting player matched by cookie | player joins, disconnects, re-POSTs with same cookie | same playerId returned; no new slot | Cookie matching |
| 2 | Player slot count unchanged after reconnect | at cap, player disconnects and reconnects | player count unchanged | No extra slot |
| 3 | `isConnected` set to false on disconnect | player socket closes | `isConnected=false` in Redis | Disconnect tracking |
| 4 | `isConnected` set to true on `join_game` | socket re-emits `join_game` | `isConnected=true` in Redis | Reconnect tracking |
| 5 | `game_state_update` fires to room on reconnect | player reconnects | room receives `game_state_update` with updated player list | Room notified |
| 6 | `game_state_update` fires to room on disconnect | player socket closes | room receives `game_state_update` | Room notified of disconnect |
| 7 | New player without cookie creates new slot | POST without cookie | new playerId; slot count increases | New player vs reconnect |
| 8 | Reconnect to finished game returns end state | game is finished | gameStatus="finished" in response | Finished game handling |

### Step 2 — Client reconnection flow

**File:** `client/src/pages/GamePage.reconnect.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 9 | Boards blank on reconnect to active round | reconnect with `gameStatus=active` | all boards empty | No history replayed |
| 10 | Timer starts from remaining time on reconnect | `deadline = now + 45000` | timer shows ~0:45 | Remaining time used |
| 11 | Reconnect to `between_rounds` routes correctly | `gameStatus=between_rounds` | navigates to between-rounds page | Routing correct |
| 12 | Reconnect to `finished` routes correctly | `gameStatus=finished` | navigates to end page | Routing correct |
| 13 | Opponent strip updates when player disconnects | receive `game_state_update` with `isConnected=false` | that opponent card goes muted | Disconnect visible to others |
| 14 | Opponent strip updates when player reconnects | receive `game_state_update` with `isConnected=true` | opponent card returns to normal | Reconnect visible to others |
