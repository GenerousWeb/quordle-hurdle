# Claude Code Implementation Prompts — F3 to F16

Each prompt below is self-contained and ready to paste directly into Claude Code.
Use one prompt per feature. Do not combine features into a single session.

---

---

# PROMPT: Implement F3 · Round Timer

Implement F3 from `@md-files/feature3.md` exactly as written.

## Project context

```
client/
  src/
    components/      ← React components go here
    store/
      boardStore.ts  ← already exists; lockAllBoards() action is implemented
    pages/
      GamePage.tsx   ← already exists; mounts TimerDisplay
shared/
  types/
    game.ts          ← shared TypeScript types
server/
  src/
    game/            ← pure game logic and server jobs
    routes/          ← Fastify route handlers
    socket/          ← Socket.io event handlers
```

## Existing types to import (do not redefine)

```ts
// from shared/types/game.ts
BoardStatus = "unsolved" | "solved" | "failed" | "locked"

// from client/src/store/boardStore.ts
lockAllBoards(): void   // already implemented — call this when timer hits zero
```

## WebSocket events this feature consumes (already defined in spec)

- `round_started` → `{ roundNumber, startTime, deadline, timeLimitSeconds }`
- `timer_sync`    → `{ deadline }`
- `round_ended`   → triggers board lock and timer stop

## Files to create (no others)

```
client/src/components/TimerDisplay.tsx
client/src/components/TimerDisplay.test.tsx
client/src/components/TimerDisplay.sync.test.tsx
server/src/game/timer.ts
server/src/game/timer.test.ts
```

## Hard constraints

- Read only the feature file and the paths listed above
- Do not explore the codebase beyond what is listed
- Do not install npm packages not already in package.json
- Do not create files not listed above
- Do not modify any existing file except to mount `TimerDisplay` in `GamePage.tsx`
- Do not assume anything not stated in the feature file — stop and ask if unclear
- No `any` types; import from `shared/types/game.ts` where applicable
- `tsc --noEmit` must pass with zero errors

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create every test file listed above. Write every test case from the feature3.md test plan.
Run: `npx vitest run`
All tests must FAIL at this point. Do NOT write any implementation code during Phase 1.
Report: confirm all tests are failing before proceeding.

### Phase 2 — Implement Step 1 only
Build `TimerDisplay.tsx` — client countdown display and urgent state only.
No server timer, no sync. Run: `npx vitest run`
Step 1 tests (tests 1–10) must PASS. Step 2 tests still fail.
Stop and report results before continuing.

### Phase 3 — Implement Step 2 only
Build `timer.ts` — server-side Redis TTL job and `timer_sync` broadcast.
Add drift correction to `TimerDisplay`. Wire `round_ended` → lock + stop.
Run: `npx vitest run`
All tests must PASS. Run `tsc --noEmit`. Report final results.

---

---

# PROMPT: Implement F4 · Scoring

Implement F4 from `@md-files/feature4.md` exactly as written.

## Project context

```
client/
  src/
    components/      ← React components go here
    store/
      boardStore.ts  ← already exists; leaderboard[] and myScore fields needed here
    pages/
      GamePage.tsx   ← already exists; mounts ScorePopup and nav bar score badges
shared/
  types/
    game.ts          ← shared TypeScript types
server/
  src/
    game/
      submitGuess.ts ← already exists; wire calculateScore into this handler
    socket/          ← Socket.io handlers
```

## Existing types to import (do not redefine)

```ts
// from shared/types/game.ts
TileResult = "green" | "yellow" | "grey"
BoardStatus = "unsolved" | "solved" | "failed" | "locked"
```

## WebSocket events this feature produces/consumes

- `guess_result` → `{ guess, attemptNumber, totalScoreDelta, boards: [{ boardIndex, result[], scoreDelta, boardStatus }] }`
- `leaderboard_update` → `{ leaderboard: [{ playerId, name, score, boardsSolved }] }`

## Files to create (no others)

```
server/src/game/calculateScore.ts
server/src/game/calculateScore.test.ts
client/src/components/ScorePopup.tsx
client/src/components/ScorePopup.test.tsx
```

## Files to edit (only these)

```
server/src/game/submitGuess.ts   ← wire calculateScore; add totalScoreDelta to response
client/src/store/boardStore.ts   ← add myScore field; update on leaderboard_update
client/src/pages/GamePage.tsx    ← mount ScorePopup; update nav score badges
```

## Hard constraints

- Do not read or modify any file not listed above
- `calculateScore` must be a pure function — no I/O, no imports from server infra
- Client never calculates scores — only renders `totalScoreDelta` from `guess_result`
- No `any` types
- `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature4.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `calculateScore.ts` and wire into `submitGuess.ts`.
Run: `npx vitest run` — tests 1–10 must PASS. Report.

### Phase 3 — Implement Step 2 only
Build `ScorePopup.tsx`. Update store and nav bar.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F5 · Game Creation

Implement F5 from `@md-files/feature5.md` exactly as written.

## Project context

```
client/
  src/
    components/      ← CreateGameForm goes here
    pages/
      CreatePage.tsx ← already exists as a route; mount the form here
shared/
  types/
    game.ts          ← shared TypeScript types
server/
  src/
    routes/          ← Fastify route handlers go here
    redis/
      client.ts      ← Redis client already initialised; import and use
```

## Existing types to import (do not redefine)

```ts
// from shared/types/game.ts — add if not present:
GameConfig = {
  maxPlayers: number   // 2–20
  rounds: number       // 1–5
  timeLimitSeconds: number  // 60 | 90 | 120 | 180
}
```

## API contract (implement exactly)

```
POST /game/create
Body:     { adminName: string, maxPlayers: number, rounds: number, timeLimitSeconds: number }
Response 201: { gameId: string, inviteLink: string }
Response 400: { error: "invalid_config" }
```

Session cookie set on 201: `{ playerId, gameId, role: "admin" }` — httpOnly

## Files to create (no others)

```
client/src/components/CreateGameForm.tsx
client/src/components/CreateGameForm.test.tsx
server/src/routes/createGame.ts
server/src/routes/createGame.test.ts
```

## Files to edit (only these)

```
client/src/pages/CreatePage.tsx  ← mount CreateGameForm
server/src/routes/index.ts       ← register the new route
```

## Hard constraints

- Do not read or modify any file not listed above
- `gameId` is server-generated (uuid or nanoid) — client never generates it
- Invite link format: `https://game.app/play/{gameId}` — constructed server-side
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature5.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `CreateGameForm.tsx` with validation only — no API call yet.
Run: `npx vitest run` — tests 1–10 must PASS. Report.

### Phase 3 — Implement Step 2 only
Build `createGame.ts` route. Wire form `onSubmit` to API call. Handle redirect.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F6 · Invite Link & Waiting Room

Implement F6 from `@md-files/feature6.md` exactly as written.

## Project context

```
client/
  src/
    components/      ← WaitingRoom goes here
    store/
      gameStore.ts   ← already exists; players[] and gameStatus fields here
    pages/
      WaitPage.tsx   ← already exists as a route; mount WaitingRoom here
    socket/
      client.ts      ← Socket.io client already initialised; import and use
shared/
  types/
    game.ts          ← shared TypeScript types
```

## Existing types to import (do not redefine)

```ts
// from shared/types/game.ts — add if not present:
Player = { playerId: string; name: string; role: "admin" | "player"; isConnected: boolean }
```

## WebSocket events this feature consumes

- `game_state_update` → `{ players: Player[], status: string, settings: GameConfig }`

## WebSocket events this feature emits

- `join_game`  → `{ gameId: string }`
- `start_game` → `{ gameId: string }`

## Files to create (no others)

```
client/src/components/WaitingRoom.tsx
client/src/components/WaitingRoom.test.tsx
client/src/components/WaitingRoom.realtime.test.tsx
```

## Files to edit (only these)

```
client/src/pages/WaitPage.tsx       ← mount WaitingRoom; wire socket events
client/src/store/gameStore.ts       ← update players[] on game_state_update
```

## Hard constraints

- QR code: use `qrcode` npm package — only if already in package.json; if absent, render plain URL only and note it
- Do not read or modify any file not listed above
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature6.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `WaitingRoom.tsx` as a static component — no socket wiring yet.
Run: `npx vitest run` — tests 1–10 must PASS. Report.

### Phase 3 — Implement Step 2 only
Wire `game_state_update` to store. Connect socket events. Wire Start Game button.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F7 · Joining a Game

Implement F7 from `@md-files/feature7.md` exactly as written.

## Project context

```
client/
  src/
    pages/
      JoinPage.tsx    ← already exists as route for /play/{gameId}; mount form here
      GamePage.tsx    ← already exists; receives deadline on mid-round join
    store/
      boardStore.ts   ← already exists; initBoards() clears all boards
      gameStore.ts    ← already exists; stores gameStatus and deadline
shared/
  types/
    game.ts           ← shared TypeScript types
server/
  src/
    routes/
      createGame.ts   ← already exists; joinGame.ts goes in same folder
    redis/
      client.ts       ← Redis client already initialised
```

## API contract (implement exactly)

```
POST /game/join
Body:     { gameId: string, playerName: string }
Response 200: { playerId: string, gameStatus: string, deadline?: number }
Response 403: { error: "game_full" }
Response 404: { error: "game_not_found" }
Response 409: { error: "game_finished" }
```

## Client routing on response (implement exactly)

```
"waiting"        → navigate to /wait/{gameId}
"active"         → navigate to /play/{gameId}
"between_rounds" → navigate to /between/{gameId}
"finished"       → navigate to /end/{gameId}
```

## Files to create (no others)

```
client/src/pages/JoinPage.tsx                    ← name entry form + routing
client/src/pages/JoinPage.test.tsx
client/src/pages/GamePage.midRoundJoin.test.tsx
server/src/routes/joinGame.ts
server/src/routes/joinGame.test.ts
```

## Files to edit (only these)

```
server/src/routes/index.ts    ← register POST /game/join route
client/src/pages/GamePage.tsx ← initialise timer from deadline on mount
```

## Hard constraints

- Do not read or modify any file not listed above
- Session cookie set on success: httpOnly, `{ playerId, gameId }`
- Boards always blank on join — never replay history
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature7.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `JoinPage.tsx` form and `joinGame.ts` route. Wire routing logic.
Run: `npx vitest run` — tests 1–11 must PASS. Report.

### Phase 3 — Implement Step 2 only
Wire `deadline` to timer init in `GamePage.tsx`. Ensure boards start blank.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F8 · Admin Game Controls

Implement F8 from `@md-files/feature8.md` exactly as written.

## Project context

```
client/
  src/
    components/
      AdminControls.tsx ← create here; used by WaitingRoom, BetweenRounds, EndGame
    store/
      gameStore.ts      ← already exists; adminId and isAdmin flag live here
    socket/
      client.ts         ← Socket.io client already initialised
shared/
  types/
    game.ts             ← shared TypeScript types
server/
  src/
    socket/
      handlers/         ← admin WebSocket event handlers go here
    game/
      selectWords.ts    ← already exists (F10 prerequisite — may not exist yet; stub if needed)
    redis/
      client.ts         ← Redis client already initialised
```

## WebSocket events this feature emits (client→server)

All require admin session cookie on socket:
- `start_game`       → `{ gameId }`
- `start_next_round` → `{ gameId }`
- `end_game`         → `{ gameId }`
- `restart_game`     → `{ gameId }`
- `shuffle_words`    → `{ gameId }`

Server rejects non-admin with: `{ error: "not_authorized" }`

## Files to create (no others)

```
client/src/components/AdminControls.tsx
client/src/components/AdminControls.test.tsx
server/src/socket/handlers/adminHandlers.ts
server/src/socket/handlers/adminHandlers.test.ts
```

## Files to edit (only these)

```
client/src/pages/WaitPage.tsx        ← add AdminControls
client/src/pages/BetweenRounds.tsx   ← add AdminControls (may not exist yet; create stub if needed)
client/src/pages/EndGame.tsx         ← add AdminControls (may not exist yet; create stub if needed)
server/src/socket/index.ts           ← register admin handlers
```

## Hard constraints

- Admin role determined from session cookie on socket — never from client payload
- Do not read or modify any file not listed above
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature8.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `AdminControls.tsx` — conditional rendering only, no server wiring.
Run: `npx vitest run` — tests 1–7 must PASS. Report.

### Phase 3 — Implement Step 2 only
Build all five `adminHandlers.ts` handlers with role checks.
Wire client button clicks to emit events.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F9 · Between-Rounds Summary

Implement F9 from `@md-files/feature9.md` exactly as written.

## Project context

```
client/
  src/
    pages/
      BetweenRounds.tsx  ← create here; registered as /between/{gameId} route
    store/
      gameStore.ts       ← already exists; add roundSummary field here
    socket/
      client.ts          ← Socket.io client already initialised
shared/
  types/
    game.ts              ← shared TypeScript types
server/
  src/
    socket/
      handlers/
        adminHandlers.ts ← already exists (F8); add round_ended logic here
    game/
      timer.ts           ← already exists (F3); fires round_ended on deadline
    redis/
      client.ts          ← Redis client already initialised
```

## Existing types to import — add to shared/types/game.ts if not present

```ts
RoundSummary = {
  roundNumber: number
  words: string[]
  leaderboard: Array<{ playerId: string; name: string; roundScore: number; totalScore: number }>
}
```

## WebSocket events this feature consumes

- `round_ended` → `{ roundNumber, words: string[], leaderboard: RoundSummary['leaderboard'] }`

## Files to create (no others)

```
client/src/pages/BetweenRounds.tsx
client/src/pages/BetweenRounds.test.tsx
server/src/game/roundEnd.ts
server/src/game/roundEnd.test.ts
```

## Files to edit (only these)

```
client/src/store/gameStore.ts       ← add roundSummary; update on round_ended
server/src/game/timer.ts            ← call roundEnd logic on deadline expiry
server/src/socket/handlers/adminHandlers.ts ← add start_next_round state guard
```

## Hard constraints

- Screen holds indefinitely — no auto-advance, no countdown
- Admin button is "Start Next Round" unless `currentRound === totalRounds`, then "End Game"
- Do not read or modify any file not listed above
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature9.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `BetweenRounds.tsx` as a static screen driven from store.
Run: `npx vitest run` — tests 1–8 must PASS. Report.

### Phase 3 — Implement Step 2 only
Build `roundEnd.ts`. Wire round_ended broadcast. Add start_next_round state guard.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F10 · No-Repeat Words Per Game

Implement F10 from `@md-files/feature10.md` exactly as written.

## Project context

```
server/
  src/
    game/
      selectWords.ts  ← create here (pure function + Redis integration)
      wordList.ts     ← already exists; exports answerPool: Set<string> (~2500 words)
    socket/
      handlers/
        adminHandlers.ts ← already exists; wire selectWords into start_game and start_next_round
    redis/
      client.ts       ← Redis client already initialised
```

## Redis key to use (implement exactly)

```
game:{gameId}:usedWords   ← Redis Set
SMEMBERS to read, SADD to add, DEL to clear on restart
```

## Files to create (no others)

```
server/src/game/selectWords.ts
server/src/game/selectWords.test.ts
server/src/game/wordDedup.integration.test.ts
```

## Files to edit (only these)

```
server/src/socket/handlers/adminHandlers.ts ← call selectWords before round_started; SADD after
```

## Hard constraints

- `selectWords` is a pure function — takes `pool` and `usedWords` as `Set<string>` params; no Redis calls inside it
- Redis calls (SMEMBERS, SADD, DEL) happen in the caller (adminHandlers.ts), not inside selectWords
- No UI — feature is entirely server-side and invisible to players
- Do not read or modify any file not listed above
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature10.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `selectWords.ts` pure function. Wire into adminHandlers with Redis SMEMBERS/SADD.
Run: `npx vitest run` — tests 1–7 must PASS. Report.

### Phase 3 — Implement Step 2 only
Add integration test verifying no repeats across 3 rounds.
Verify shuffleWords and restartGame respect/clear usedWords.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F11 · Live Leaderboard

Implement F11 from `@md-files/feature11.md` exactly as written.

## Project context

```
client/
  src/
    components/
      PlayerDot.tsx        ← create here; used in NavBar
      LeaderboardTable.tsx ← create here; used in BetweenRounds and EndGame
      Podium.tsx           ← create here; used in EndGame
    store/
      gameStore.ts         ← already exists; add leaderboard[] field
    pages/
      GamePage.tsx         ← already exists; NavBar with PlayerDot lives here
      BetweenRounds.tsx    ← already exists (F9); add LeaderboardTable here
      EndGame.tsx          ← already exists (F13); add Podium here
    socket/
      client.ts            ← Socket.io client already initialised
shared/
  types/
    game.ts                ← shared TypeScript types
```

## Existing types to import — add to shared/types/game.ts if not present

```ts
LeaderboardEntry = { playerId: string; name: string; score: number; boardsSolved: number }
PodiumEntry      = { rank: number; name: string; score: number }
```

## WebSocket events this feature consumes

- `leaderboard_update` → `{ leaderboard: LeaderboardEntry[] }` — during round, after every guess
- `game_ended`         → `{ podium: PodiumEntry[], finalLeaderboard: LeaderboardEntry[] }`

## Files to create (no others)

```
client/src/components/PlayerDot.tsx
client/src/components/PlayerDot.test.tsx
client/src/components/NavBar.leaderboard.test.tsx
client/src/components/LeaderboardTable.tsx
client/src/components/LeaderboardTable.test.tsx
client/src/components/Podium.tsx
client/src/components/Podium.test.tsx
```

## Files to edit (only these)

```
client/src/store/gameStore.ts    ← update leaderboard[] on leaderboard_update
client/src/pages/GamePage.tsx    ← render PlayerDot per player in NavBar
client/src/pages/BetweenRounds.tsx ← add LeaderboardTable
client/src/pages/EndGame.tsx     ← add Podium and LeaderboardTable
```

## Hard constraints

- Current player identified by `myPlayerId` from gameStore — never hardcoded
- Podium renders 1, 2, or 3 slots based on actual player count — no empty slots
- Do not read or modify any file not listed above
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature11.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `PlayerDot.tsx`. Update store. Wire nav bar.
Run: `npx vitest run` — tests 1–5 must PASS. Report.

### Phase 3 — Implement Step 2 only
Build `LeaderboardTable.tsx` and `Podium.tsx`. Mount in BetweenRounds and EndGame.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F12 · Opponent Progress

Implement F12 from `@md-files/feature12.md` exactly as written.

## Project context

```
client/
  src/
    components/
      OpponentCard.tsx  ← create here
      OpponentStrip.tsx ← create here; mounted above BoardGrid in GamePage
    store/
      gameStore.ts      ← already exists; add opponents[] derived field
    pages/
      GamePage.tsx      ← already exists; mount OpponentStrip above boards
    socket/
      client.ts         ← Socket.io client already initialised
shared/
  types/
    game.ts             ← shared TypeScript types
```

## Existing types to import (do not redefine)

```ts
// from shared/types/game.ts
LeaderboardEntry = { playerId: string; name: string; score: number; boardsSolved: number }
Player           = { playerId: string; name: string; isConnected: boolean }
```

## WebSocket events this feature consumes

- `leaderboard_update` → drives `score` and `boardsSolved` (pip count) per opponent
- `game_state_update`  → drives `isConnected` per opponent

## Derived store field (add to gameStore.ts)

```ts
opponents: Array<LeaderboardEntry & { isConnected: boolean }>
// = leaderboard entries merged with isConnected from players[], excluding myPlayerId
```

## Files to create (no others)

```
client/src/components/OpponentCard.tsx
client/src/components/OpponentCard.test.tsx
client/src/components/OpponentStrip.tsx
client/src/components/OpponentStrip.test.tsx
client/src/components/OpponentStrip.realtime.test.tsx
```

## Files to edit (only these)

```
client/src/store/gameStore.ts  ← add opponents[] derived field; merge on both events
client/src/pages/GamePage.tsx  ← mount OpponentStrip above BoardGrid
```

## Hard constraints

- Current player is excluded from the strip — never show myPlayerId
- Strip renders nothing (null) when opponents[] is empty — no placeholder
- Pips show filled/empty only — no failed or locked distinction
- Player order in strip is stable (join order) — do not re-sort on score updates
- Do not read or modify any file not listed above
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature12.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `OpponentCard.tsx` and `OpponentStrip.tsx` as static components from props.
Run: `npx vitest run` — tests 1–9 must PASS. Report.

### Phase 3 — Implement Step 2 only
Add `opponents[]` to gameStore. Wire both WebSocket events. Mount strip in GamePage.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F13 · End Game & Podium

Implement F13 from `@md-files/feature13.md` exactly as written.

## Project context

```
client/
  src/
    pages/
      EndGame.tsx      ← create here; registered as /end/{gameId} route
    components/
      Podium.tsx       ← already exists (F11); import and use here
      LeaderboardTable.tsx ← already exists (F11); import and use here
    store/
      gameStore.ts     ← already exists; add endGameData field
    socket/
      client.ts        ← Socket.io client already initialised
shared/
  types/
    game.ts            ← shared TypeScript types
server/
  src/
    socket/
      handlers/
        adminHandlers.ts ← already exists; add game_ended broadcast and restart_game
    redis/
      client.ts        ← Redis client already initialised
    db/
      prisma.ts        ← Prisma client already initialised; async persist on game_ended
```

## WebSocket events this feature produces/consumes

- `game_ended`    ← server fires; client renders end screen
  payload: `{ podium: PodiumEntry[], finalLeaderboard: LeaderboardEntry[] }`
- `restart_game`  → client emits (admin only); server resets to waiting

## Files to create (no others)

```
client/src/pages/EndGame.tsx
client/src/pages/EndGame.test.tsx
server/src/game/endGame.ts
server/src/game/endGame.test.ts
```

## Files to edit (only these)

```
client/src/store/gameStore.ts            ← add endGameData; update on game_ended
server/src/socket/handlers/adminHandlers.ts ← add end_game handler; restart_game handler
server/src/socket/index.ts               ← register new events if needed
```

## Hard constraints

- `restart_game` resets: scores=0, usedWords=[], status="waiting", currentRound=1
- Non-admin `restart_game` must be rejected with `not_authorized`
- Do not read or modify any file not listed above
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature13.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `EndGame.tsx` page with Podium and LeaderboardTable from existing components.
Run: `npx vitest run` — tests 1–9 must PASS. Report.

### Phase 3 — Implement Step 2 only
Build `endGame.ts`. Wire `game_ended` broadcast and `restart_game` handler.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F14 · Share Results

Implement F14 from `@md-files/feature14.md` exactly as written.

## Project context

```
client/
  src/
    utils/
      generateResultsText.ts  ← create here; pure function, no React
    components/
      CopyResultsButton.tsx   ← create here; mounted in EndGame
    pages/
      EndGame.tsx             ← already exists (F13); mount CopyResultsButton here
    store/
      gameStore.ts            ← already exists; finalLeaderboard[] and gameConfig available
shared/
  types/
    game.ts                   ← shared TypeScript types
```

## Existing types to import (do not redefine)

```ts
// from shared/types/game.ts
LeaderboardEntry = { playerId: string; name: string; score: number; boardsSolved: number }
```

## Results text format (implement exactly)

```
quordle// · {rounds} rounds
🥇 {name1}    {score1}
🥈 {name2}    {score2}
🥉 {name3}    {score3}
   {name4}     {score4}
play.app/{gameId}
```

Rules: top 3 get medal emoji + 1 space; 4th+ get 3-space indent. Score column right-aligned with space padding.

## Files to create (no others)

```
client/src/utils/generateResultsText.ts
client/src/utils/generateResultsText.test.ts
client/src/components/CopyResultsButton.tsx
client/src/components/CopyResultsButton.test.tsx
```

## Files to edit (only these)

```
client/src/pages/EndGame.tsx  ← mount CopyResultsButton
```

## Hard constraints

- `generateResultsText` is a pure function — no React, no DOM, no clipboard calls inside it
- No server call at any point — all data comes from the Zustand store
- Button must be visible to ALL players (not admin-only)
- Clipboard fallback: if `navigator.clipboard.writeText` throws, render a `<textarea>` with the text pre-selected
- Do not read or modify any file not listed above
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature14.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `generateResultsText.ts` pure function only.
Run: `npx vitest run` — tests 1–7 must PASS. Report.

### Phase 3 — Implement Step 2 only
Build `CopyResultsButton.tsx`. Mount in EndGame.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F15 · Reconnection

Implement F15 from `@md-files/feature15.md` exactly as written.

## Project context

```
client/
  src/
    pages/
      JoinPage.tsx    ← already exists (F7); extend POST /game/join handling for reconnect
      GamePage.tsx    ← already exists; verify blank boards + timer on reconnect
    store/
      gameStore.ts    ← already exists; opponents[] isConnected field used here
    socket/
      client.ts       ← Socket.io client already initialised
server/
  src/
    routes/
      joinGame.ts     ← already exists (F7); extend to handle cookie-based reconnect
    socket/
      index.ts        ← already exists; add disconnect handler
    redis/
      client.ts       ← Redis client already initialised
```

## Reconnection logic in POST /game/join (extend, do not rewrite)

```
If request has session cookie with playerId:
  Look up playerId in Redis for this gameId
  If found and game not finished:
    Set isConnected=true in Redis
    Return { playerId (same), gameStatus, deadline? }   ← no new slot
  Else:
    Treat as new player (existing logic)
```

## New socket events this feature handles

- On socket `disconnect`:
  - Set `isConnected=false` in Redis for this playerId
  - Emit `game_state_update` to room
- On `join_game` (already exists — extend):
  - Re-add socket to game room
  - Set `isConnected=true` in Redis
  - Emit `game_state_update` to room

## Files to create (no others)

```
server/src/routes/reconnection.test.ts
client/src/pages/GamePage.reconnect.test.tsx
```

## Files to edit (only these)

```
server/src/routes/joinGame.ts     ← add cookie-based reconnect branch
server/src/socket/index.ts        ← add disconnect handler; extend join_game handler
client/src/pages/GamePage.tsx     ← verify blank board init and deadline-based timer on mount
```

## Hard constraints

- Reconnecting player NEVER gets a new player slot — slot count is unchanged
- Boards ALWAYS start blank on reconnect — no history replayed, ever
- Original admin reconnecting does NOT get admin role back (F16 handles promotion)
- Do not create any new UI components — reconnection is invisible to the reconnecting player
- Do not read or modify any file not listed above
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create both test files. Write every test from feature15.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Extend `joinGame.ts` with cookie-based reconnect branch.
Add disconnect handler and join_game isConnected update to socket/index.ts.
Run: `npx vitest run` — tests 1–8 must PASS. Report.

### Phase 3 — Implement Step 2 only
Verify GamePage initialises correctly on reconnect. Fill any gaps in routing.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.

---

---

# PROMPT: Implement F16 · Admin Auto-Promotion

Implement F16 from `@md-files/feature16.md` exactly as written.

## Project context

```
client/
  src/
    components/
      AdminTransferNotification.tsx ← create here; toast banner, auto-dismisses in 3s
    store/
      gameStore.ts                  ← already exists; adminId field lives here
    pages/
      GamePage.tsx                  ← already exists; mount notification here
      WaitPage.tsx                  ← already exists; admin controls re-evaluate reactively
      BetweenRounds.tsx             ← already exists; admin controls re-evaluate reactively
    socket/
      client.ts                     ← Socket.io client already initialised
server/
  src/
    socket/
      index.ts    ← already exists; extend disconnect handler from F15
    redis/
      client.ts   ← Redis client already initialised
shared/
  types/
    game.ts       ← shared TypeScript types
```

## Server promotion logic (implement exactly as specified)

```
On disconnect of admin socket:
  1. Set isConnected=false in Redis (already done by F15 disconnect handler — extend it)
  2. eligible = connected players with joinedAt < disconnecting admin's joinedAt, sorted asc
  3. If eligible.length > 0:
       newAdmin = eligible[0]
       HSET game:{id} adminId newAdmin.playerId
       emit admin_transferred: { newAdminId, newAdminName } to room
  4. If eligible.length === 0:
       HSET game:{id} adminId null
```

## WebSocket event this feature emits (server→room)

- `admin_transferred` → `{ newAdminId: string, newAdminName: string }`

## isAdmin derivation (implement this way in gameStore)

```ts
isAdmin: (state) => state.myPlayerId === state.adminId
```

All screens that show admin controls must use this derived value reactively — not a stored boolean.

## Files to create (no others)

```
client/src/components/AdminTransferNotification.tsx
client/src/components/AdminTransfer.test.tsx
client/src/components/AdminControls.promotion.test.tsx
server/src/game/adminPromotion.ts
server/src/game/adminPromotion.test.ts
```

## Files to edit (only these)

```
server/src/socket/index.ts        ← extend disconnect handler to call promotion logic
client/src/store/gameStore.ts     ← update adminId on admin_transferred; expose isAdmin
client/src/pages/GamePage.tsx     ← mount AdminTransferNotification
```

## Hard constraints

- Admin role is NEVER restored to the original admin on reconnect — promotion is permanent for the session
- Original admin who reconnects after promotion is a regular player — they do NOT get the Start Game button back
- Promotion cascade must work: if newly promoted admin also disconnects, run promotion again
- Do not read or modify any file not listed above
- No `any` types; `tsc --noEmit` must pass

## Implementation sequence — follow strictly

### Phase 1 — Write all tests first (red phase)
Create all test files. Write every test from feature16.md test plan.
Run: `npx vitest run` — all must FAIL. Report before continuing.

### Phase 2 — Implement Step 1 only
Build `adminPromotion.ts`. Extend disconnect handler in socket/index.ts to call it.
Run: `npx vitest run` — tests 1–9 must PASS. Report.

### Phase 3 — Implement Step 2 only
Build `AdminTransferNotification.tsx`. Update gameStore adminId. Mount notification.
Run: `npx vitest run` — all tests PASS. Run `tsc --noEmit`. Report.