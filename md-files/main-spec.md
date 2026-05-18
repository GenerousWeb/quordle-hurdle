# 📄 spec.md — Multiplayer Quordle-Style Word Game

## 1. Overview

A real-time multiplayer word puzzle game inspired by Quordle.  
Players simultaneously solve multiple word grids within a time limit across multiple rounds.

This version:

- ❌ No spectator mode
- ❌ No lobby/waiting room
- ✅ Direct join + play model
- ✅ Rejoin via invite link on disconnect (remaining round time only; no prior state replayed)
- ✅ Admin-controlled round progression (no auto-start between rounds)

---

## 2. Core Features

- Multiplayer game sessions via invite link (2–20 players)
- Real-time gameplay (WebSocket based)
- Multiple boards per round (fixed at 4 for MVP)
- Timer-based rounds with client/server sync every 60 seconds
- Admin-controlled game lifecycle including round-to-round progression
- Scoring + leaderboard with podium results
- Per-tile colour feedback on every guess submission

---

## 3. Game Configuration

### 3.1 Game Creation

Admin configures a game with the following options at creation time:

```json
{
  "maxPlayers": 10,
  "rounds": 3,
  "timeLimitSeconds": 120,
  "boards": 4,
  "wordLength": 5,
  "maxAttempts": 9
}
```

#### Configurable fields

| Field              | Range / Options     | Default | Notes                                 |
| ------------------ | ------------------- | ------- | ------------------------------------- |
| `maxPlayers`       | 2–20                | 10      | Configurable by admin at game creation |
| `rounds`           | 1–5                 | 3       | Configurable by admin at game creation |
| `timeLimitSeconds` | 60 / 90 / 120 / 180 | 120     | Configurable by admin at game creation |
| `boards`           | 4 (fixed)           | 4       | Fixed for MVP; configurable in future  |
| `wordLength`       | 5 (fixed)           | 5       | Fixed                                 |
| `maxAttempts`      | 9 (fixed)           | 9       | Fixed                                 |

---

### 3.2 Roles

#### Admin

- Automatically assigned to the game creator
- Controls:
  - `startGame` — start the first round
  - `startNextRound` — manually advance to the next round after a round ends
  - `restartGame` — reset scores and replay from round 1 with same players
  - `shuffleWords` — re-draw words for the upcoming round (pre-round only)
  - `endGame` — terminate the game at any point
- If admin disconnects, the next-longest-joined player is automatically promoted and notified via `admin_transferred`

#### Player

- Joins via invite link
- Name entered on first join; stored in session cookie for reconnection
- Can join or rejoin mid-game — see Join Game flow
- Participates in all rounds from the point of joining

---

## 4. Game Flow

### 4.1 Create Game

- Admin opens the root URL and fills in the game configuration form
- Calls: `POST /game/create`
- Server returns:
  - `gameId`
  - `inviteLink`

Example invite link:
```
https://game.app/play/{gameId}
```

Admin lands on the waiting screen showing the invite link with a one-click copy button and QR code. Joined players appear in real time as they connect via `game_state_update`.

---

### 4.2 Join Game

- Player opens the invite link
- Enters their display name (stored in an httpOnly session cookie on first visit)
- Calls: `POST /game/join`

#### Join behaviour by game status

| Game status      | Behaviour |
| ---------------- | --------- |
| `waiting`        | Player joins immediately and appears on the waiting screen |
| `active`         | Player joins and receives the **remaining** round time only (not full `timeLimitSeconds`). Timer starts from `deadline - now`. All boards start blank — no prior round state is replayed. |
| `between_rounds` | Player joins and sees the between-rounds summary screen; participates from the next round |
| `finished`       | Player sees the final leaderboard only; cannot participate |

#### Reconnection

- A player who loses connection (browser close, network drop) rejoins using the same invite link
- Their session cookie identifies them; the server reassigns them to their existing player record without consuming an additional player slot
- They receive the remaining time for the current round — no full state snapshot or prior guess history is replayed
- Boards start blank on reconnect; they continue from where the round currently is
- If the round ended while they were disconnected, they rejoin into the between-rounds screen

#### Constraints

- Total active players must not exceed `maxPlayers`
- Reconnecting players do not count against the player cap (they already hold a slot)
- New players cannot join if the cap is reached

---

### 4.3 Start Game

- Admin clicks "Start Game" from the waiting screen
- Can be triggered at any time once at least one player has joined
- Game transitions to `active`
- Round 1 begins immediately; `round_started` fires to all clients

---

### 4.4 Round Lifecycle

Each round:

1. Words selected server-side (4 boards) — drawn from the word pool excluding any words already used in previous rounds of this game
2. `round_started` fires to all clients — includes `startTime` (server timestamp) and `deadline`
3. Players submit guesses; server evaluates each and returns tile feedback via `guess_result`
4. Every 60 seconds, server broadcasts `timer_sync` with `{ deadline }` for drift correction
5. Round ends when:
   - Server-side deadline expires (Redis TTL), **OR**
   - All active players have finished all boards
6. `round_ended` fires — reveals all 4 target words, round scores, and updated leaderboard
7. Game enters `between_rounds` status — no automatic progression
8. Admin triggers `startNextRound` when ready, OR if this was the last round, `game_ended` fires

---

### 4.5 Between Rounds

- After `round_ended`, all players see:
  - The 4 target words revealed, displayed in a 2×2 grid matching the board layout
  - Per-player round score breakdown
  - Cumulative leaderboard ranked table
- The screen holds indefinitely — no countdown, no auto-advance
- **Admin only** sees a "Start Next Round" button
- Admin clicks → `POST /game/next-round` → `round_started` fires to all clients
- If it was the final round, admin sees "End Game" instead, which triggers `game_ended`

---

### 4.6 End Game

- Fires after the final round when admin confirms, or when admin calls `endGame` mid-game
- `game_ended` event delivers final scores and podium
- Podium screen shows 1st / 2nd / 3rd with full ranked table below
- Admin sees "Play Again" → `POST /game/restart` (resets scores, same players, returns to waiting)
- All players see a "Copy Results" button generating a shareable text summary

---

## 5. UI Requirements

### 5.1 Layout

Fixed 2×2 grid of boards. No on-screen keyboard for MVP.

```
[ Board 1 ] [ Board 2 ]
[ Board 3 ] [ Board 4 ]
```

Input is captured exclusively via physical keyboard. Typing applies to the currently active board (highlighted with a border). Boards cycle automatically when solved; player can also click any unsolved board to focus it.

#### Timer display

The round countdown is shown prominently in the navigation bar in a monospaced minutes:seconds format. When 20 seconds or fewer remain, the timer turns red and pulses to signal urgency.

---

### 5.2 Tile States

Each tile in a submitted guess row is coloured immediately on receiving `guess_result`:

| Colour   | Meaning                                    |
| -------- | ------------------------------------------ |
| 🟩 Green  | Correct letter, correct position           |
| 🟨 Yellow | Letter exists in the word, wrong position  |
| ⬜ Grey   | Letter not in the word                     |

#### Tile feedback behaviour

- On `guess_result`, each tile in the submitted row flips to its result colour — animated card-flip style (~300ms stagger, left to right)
- A fully solved board (all 5 tiles green on the final guess row) receives a distinct completion border/highlight
- A board that exhausts all `maxAttempts` without solving enters a "failed" state — tiles mute and the target word is revealed in a row below the grid
- Each board shows its feedback independently; solving Board 1 does not affect Board 2's display

#### Active board indicator

- The board currently accepting keyboard input shows a highlighted border
- Unsolved boards can be clicked to shift focus
- Solved and failed boards do not accept input

#### Opponent progress strip

During an active round, a horizontal strip above the boards shows a card for each opponent. Each card displays the opponent's name, their current score, and four small pip indicators showing how many boards they have solved (filled for solved, empty for unsolved). Opponents who are disconnected are shown in a muted state to distinguish them from active players. Players do not see opponent guesses — only solved board count.

---

### 5.3 Input (MVP — Physical Keyboard Only)

- Letter keys append to the active board's current guess row (up to `wordLength` characters)
- `Enter` submits the current guess
- `Backspace` deletes the last typed letter
- Input is blocked on solved and failed boards
- If a player has solved all 4 boards, all input is blocked until the round ends

> **Future enhancement:** On-screen keyboard with per-letter colour state (best result across all boards) to be added post-MVP.

---

## 6. Scoring System

### 6.1 Points

| Event                   | Points                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| Correct letter (yellow) | +1                                                                     |
| Correct position (green)| +3                                                                     |
| Word solved             | +10                                                                    |
| Early finish bonus      | `+floor(secondsRemaining / 10)` when all 4 boards solved before timer expires |

All points are calculated server-side. The `scoreDelta` for each guess is included in the `guess_result` payload. Running totals are pushed to all clients via `leaderboard_update` after each scored guess.

A score popup briefly appears on screen after each guess showing the points just earned. Running totals are visible as small badges on each player's indicator in the navigation bar.

---

### 6.2 Ranking

Sorted by (in order of precedence):

1. Total score (descending)
2. Completion time (ascending — finished sooner ranks higher on equal score)
3. Words solved (descending)

---

## 7. Data Models

### 7.1 Game

```json
{
  "id": "string",
  "adminId": "string",
  "players": ["Player"],
  "status": "waiting | active | between_rounds | finished",
  "settings": {
    "maxPlayers": 10,
    "rounds": 3,
    "timeLimitSeconds": 120,
    "boards": 4,
    "wordLength": 5,
    "maxAttempts": 9
  },
  "currentRound": 1,
  "usedWords": ["apple", "grape", "stone", "light"]
}
```

> `between_rounds` added as an explicit status for the admin-gated pause between rounds.  
> `usedWords` accumulates every answer word used across all rounds in the game. The word selection engine checks this set before drawing words for each new round, guaranteeing no repeats within a single game session. On `restartGame`, `usedWords` is reset to `[]`.

---

### 7.2 Player

```json
{
  "id": "string",
  "name": "string",
  "sessionToken": "string",
  "score": 0,
  "isFinished": false,
  "isConnected": true
}
```

> `sessionToken` is stored in an httpOnly cookie; used to identify reconnecting players without a full auth system.  
> `isConnected` tracks live socket presence. Disconnected players remain in the player list and can rejoin.

---

### 7.3 Round

```json
{
  "roundNumber": 1,
  "words": ["apple", "grape", "stone", "light"],
  "startTime": "timestamp",
  "deadline": "timestamp",
  "endTime": "timestamp",
  "guesses": [
    {
      "playerId": "string",
      "boardIndex": 0,
      "guess": "crane",
      "result": ["green", "grey", "yellow", "grey", "green"],
      "scoreDelta": 7,
      "timestamp": "timestamp"
    }
  ]
}
```

> `result` is a flat array of 5 strings — one per letter position.  
> `deadline` is `startTime + timeLimitSeconds`, stored in Redis with a TTL for server-side enforcement.

---

## 8. API Specification

### 8.1 REST APIs

| Method | Endpoint            | Description                                       |
| ------ | ------------------- | ------------------------------------------------- |
| POST   | `/game/create`      | Admin creates a new game; returns gameId + link   |
| POST   | `/game/join`        | Player joins or rejoins by gameId                 |
| POST   | `/game/start`       | Admin starts round 1                              |
| POST   | `/game/next-round`  | Admin starts the next round after between-rounds  |
| POST   | `/game/restart`     | Admin resets game to waiting with same players    |
| POST   | `/game/end`         | Admin terminates game early                       |

---

## 9. WebSocket Events

### Client → Server

| Event              | Payload                         | Description                          |
| ------------------ | ------------------------------- | ------------------------------------ |
| `join_game`        | `{ gameId, playerId }`          | Establish socket room membership     |
| `submit_guess`     | `{ gameId, boardIndex, guess }` | Submit a word for a specific board   |
| `start_game`       | `{ gameId }`                    | Admin: start round 1                 |
| `start_next_round` | `{ gameId }`                    | Admin: advance after between-rounds  |
| `restart_game`     | `{ gameId }`                    | Admin: reset and replay              |
| `end_game`         | `{ gameId }`                    | Admin: terminate early               |

### Server → Client

| Event                | Recipient    | Payload                                                        |
| -------------------- | ------------ | -------------------------------------------------------------- |
| `game_state_update`  | Room         | Full current game state (player list, status, settings)        |
| `round_started`      | Room         | `{ roundNumber, startTime, deadline, timeLimitSeconds }`       |
| `guess_result`       | Player only  | `{ boardIndex, guess, result[], scoreDelta }`                  |
| `timer_sync`         | Room         | `{ deadline }` — broadcast every 60 seconds for drift correction |
| `round_ended`        | Room         | `{ roundNumber, words[], leaderboard[] }`                      |
| `game_ended`         | Room         | `{ finalLeaderboard[], podium[] }`                             |
| `leaderboard_update` | Room         | `{ leaderboard[] }` — after each scored guess                  |
| `admin_transferred`  | Room         | `{ newAdminId }` — fired when admin disconnects                |

---

## 10. Constraints

- Players may join or rejoin mid-game; they receive only the remaining round time and start with blank boards
- Reconnecting players are matched by session cookie; they do not consume an additional player slot
- Player cap (`maxPlayers`) enforced on new joins only
- One active guess submission at a time per player per board (server debounces duplicates)
- Server-authoritative scoring — clients never calculate scores
- Timer strictly enforced server-side; client timer is display-only
- Round progression between rounds is manual — admin must trigger `start_next_round`
- Guesses submitted after the server deadline are rejected with a `round_expired` error
- `boards` fixed at 4 for MVP
- Words must not repeat within a single game session — each round's 4 words are drawn exclusively from words not used in any prior round of that game; `usedWords` is checked server-side before selection and reset on `restartGame`

---

## 11. Timer Architecture

### Client timer

- On `round_started`, client receives `startTime` and `deadline`
- Client calculates remaining time as `deadline - Date.now()` and starts a local countdown
- For mid-game joiners, `deadline` is already set; client applies the same calculation — naturally reflecting only the remaining time

### Server timer

- Server stores `deadline` in Redis: `game:{id}:round:{n}:deadline` with a TTL matching `timeLimitSeconds`
- A server-side job fires `round_ended` at `deadline` — implemented as a Redis-persisted timeout so it survives pod restarts
- Every 60 seconds during an active round, the server broadcasts `timer_sync: { deadline }` to the room

### Drift correction

- On receiving `timer_sync`, each client silently adjusts its local countdown to `deadline - Date.now()`
- Correction is applied smoothly (no visual jump); if drift is under 2 seconds it is ignored

### Enforcement

- The server ends the round at `deadline` regardless of client-side countdown state
- Any `submit_guess` received after `deadline` is rejected server-side with a `round_expired` error response

---

## 12. Tech Stack

All open source, MIT/Apache licensed, deployable at scale.

### 12.1 Frontend

| Technology       | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| React + Vite     | Component UI, fast dev/build tooling                 |
| TailwindCSS      | 2×2 grid layout, tile states, responsive design      |
| Zustand          | Lightweight client-side game state management        |
| Socket.io client | Real-time WebSocket event handling + auto-reconnect  |

### 12.2 Backend

| Technology           | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| Node.js              | Runtime (non-blocking I/O, ideal for WebSockets)  |
| Fastify              | REST API server                                   |
| Socket.io server     | WebSocket rooms per game session, broadcasting    |
| Game engine (custom) | Scoring logic, round lifecycle, word validation   |
| Prisma ORM           | Type-safe database access layer                   |

### 12.3 Data Layer

| Technology              | Purpose                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| Redis                   | Active game state, pub/sub for multi-instance sync, round deadline TTLs, leaderboard sorted sets |
| PostgreSQL              | Persistent storage — completed game history, scores, word lists       |
| `english-words` npm pkg | Curated 5-letter word list (open source)                              |

> **Scaling note:** Redis with `@socket.io/redis-adapter` enables multiple backend Node.js pods to share game state without siloing. This is the key architectural decision for horizontal scale.

### 12.4 Deployment

| Technology       | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| Docker + Compose | Local dev parity, containerised services            |
| Kubernetes       | Production scale-out (multiple backend pods)        |
| Nginx            | Reverse proxy — handles WebSocket upgrades + HTTP   |
| Fly.io / Railway | Simple cloud deployment (free-tier friendly)        |

### 12.5 Performance Notes

- **Timer sync:** Server sends `startTime` + `deadline` at round start. Clients run local countdowns. Every 60 seconds the server broadcasts `timer_sync` to correct drift. No per-second server broadcasts.
- **Mid-game join timer:** Joining players receive the same `deadline` already set for the round; they calculate remaining time locally as `deadline - Date.now()`.
- **Server-authoritative scoring:** All guess evaluation and scoring on the server; `scoreDelta` returned in `guess_result`.
- **Word validation:** Word list loaded at startup into a JavaScript `Set` — O(1) lookup per guess.
- **Word deduplication:** `usedWords` for each game is stored in Redis as a Set (`game:{id}:usedWords`). Before drawing words for a new round, the server performs a `SDIFF` between the full answer pool and `usedWords`, then selects 4 at random from the remainder. After `round_started` fires, the 4 new words are added to `usedWords` via `SADD`. With a maximum of 5 rounds × 4 boards = 20 words consumed per game, the ~2,500-word answer pool makes collisions effectively impossible.
- **Reconnection:** No full state snapshot on reconnect. Players rejoin with a blank board and remaining time only.

---

## 13. Implementation Phases

Features are grouped into four phases in order of build dependency. Each phase must be stable before the next begins.

| Phase | Focus | Features |
| ----- | ----- | -------- |
| 1 · Core Gameplay Loop | The playable foundation — single player can guess, see feedback, and earn points | Multi-board gameplay, tile colour feedback, round timer, scoring |
| 2 · Session Management | Wraps gameplay in a full session — create, join, progress through rounds | Game creation, invite link & waiting room, joining, admin controls, between-rounds summary, no-repeat words |
| 3 · Multiplayer & Social | Adds competitive and social dimension requiring concurrent players | Live leaderboard, opponent progress, end game podium, share results |
| 4 · Resilience | Hardens the experience against real-world failures | Reconnection, admin auto-promotion |

---

## 14. Deliverables

- Backend (Node.js + WebSocket + Fastify)
- Frontend UI (physical keyboard only for MVP; 2×2 board grid with per-tile flip animation)
- Real-time sync with 60-second timer drift correction via `timer_sync`
- Scoring engine (server-side; `scoreDelta` per guess in `guess_result`)
- Timer system (client display + server enforcement + 60s sync)
- Game lifecycle management (admin-controlled round progression via `startNextRound`)
- Reconnection support via session cookie (remaining time only; no state replay)

---

## 15. Future Enhancements

- On-screen keyboard with per-letter colour state (best result across all boards)
- Configurable board count (currently fixed at 4)
- Word difficulty tiers (easy / medium / hard weighted draws per round)
- Spectator mode
- Lobby / waiting room with chat