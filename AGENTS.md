# Development philosophy
- Prefer simple solutions over clever ones.
- Write code that is clear and self-explainatory.
- Build with long term in mind.

  
# After every change
Run these three commands after every code change and fix any failures before considering the task done:
```bash
npm run typecheck:all
npm run lint
npm test
```

# Stack
- node
- typescript
- react-router
- websocket
- fastify
- tailwind

# Testing conventions

## Write real tests before implementation (TDD)
Always write actual test assertions before writing the implementation they cover.
Never use `it.todo()` as a placeholder — write the full test body with real `expect(...)` calls.
Tests are expected to fail (red) until the feature is implemented. A failing test with a clear assertion is more valuable than a passing placeholder.

## What a real test looks like
```typescript
it("tile renders letter in uppercase", () => {
  const { container } = render(<Tile letter="c" state="typing" />);
  expect(container.firstChild).toHaveTextContent("C");
});
```

Not this:
```typescript
it.todo("tile renders letter in uppercase");
```

## DOM conventions for this project
Use `data-*` attributes as the primary test surface — they are stable, framework-agnostic, and decouple tests from CSS class names.

| Concept | Attribute |
|---------|-----------|
| Tile state (F2) | `data-state="empty\|typing\|green\|yellow\|grey"` |
| Tile flip animation | `data-flipping="true"`, `data-flip-mid="true"` |
| Tile shake animation | `data-shaking="true"` |
| Board container | `data-board-index="{0–3}"`, `data-status="{unsolved\|solved\|failed\|locked}"` |
| Row | `data-row-index="{0–8}"` |
| Tile | `data-tile-index="{0–4}"` |
| Failed board reveal row | `data-reveal-row="true"` |
| F1 tile result | `data-result="green\|yellow\|grey"` |

## Handling future APIs in tests
When tests cover a component API that does not exist yet, cast the component to `any` to avoid TypeScript errors at the call site while still compiling cleanly:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const F2Tile = Tile as any;
```
The tests will fail at assertion level (not compilation) until the implementation lands. This keeps `npm run typecheck:all` green while the test suite is red.

---

# Codebase map

## Hard constraints
- Do not add any imports not listed in this prompt or the feature file
- Do not create files not listed in the file list below
- Do not install new npm packages
- Do not read or modify any existing file except those listed under "files to create or edit"
- If something is unclear, stop and ask — do not assume

> **Maintenance rule:** After every feature implementation, update the file list, exports, socket events, and store shapes below to reflect the new state of the codebase. Do NOT read the project tree at the start of a new feature — use this map instead.

## Monorepo layout

```
quordle-hurdle/
├── app/                        React Router SSR app (pages + layout)
├── client/src/                 Shared client code (components, stores, socket)
├── server/src/                 Socket.io game server
├── shared/types/               Types shared across client and server
├── md-files/                   Feature spec files (featureN.md)
├── tsconfig.json               Root — paths for app/ (see aliases below)
├── package.json                Root — runs typecheck:all, lint, test across all workspaces
├── client/package.json         Client workspace — vitest, react, testing-library
└── server/package.json         Server workspace — socket.io (+ ioredis when added)
```

## Import path aliases

### Root tsconfig.json (used by app/)
```
"shared/*"             → ./shared/*
"client/components/*"  → ./client/src/components/*
"client/store/*"       → ./client/src/store/*
"client/socket/*"      → ./client/src/socket/*
```

### client/tsconfig.json (used by client/src/)
```
"shared/*"             → ../shared/*
```

### server/tsconfig.json (used by server/src/)
```
"shared/*"             → ../shared/*
```

# Project context

## Key source files

### app/ — pages and layout
| File | Purpose |
|------|---------|
| `app/routes.ts` | Route config: `/` HomePage, `/wait/:gameId` WaitingRoomPage, `/play/:gameId` GamePage, `/between/:gameId` BetweenRoundsPage, `/end/:gameId` EndGamePage |
| `app/components/layout/AppShell.tsx` | Wraps every page: `<NavBar /> + <main> + <Footer />` |
| `app/components/layout/NavBar.tsx` | Fixed top nav bar (logo + nav links). **Extend here to add timer display.** |
| `app/components/layout/Footer.tsx` | Static footer |
| `app/pages/GamePage.tsx` | Active game page. Uses `useGameSocket`, renders `<BoardGrid onEnter>` inside `<AppShell>`. Seeds boards locally on mount as placeholder. |
| `app/pages/WaitingRoomPage.tsx` | Waiting room page (`/wait/:gameId`). Mounts `<WaitingRoom>`. Connects socket, emits `join_game`, handles `game_state_update` → `gameStore`. Emits `start_game` on admin button click. |
| `app/pages/GamePage.tsx` | Active game page (`/play/:gameId`). Reads `location.state.deadline` (from mid-round join) to pre-seed `timerDeadline` on mount. |

### client/src/components/ — React components (tested with Vitest + RTL)
| File | Exports | Test files |
|------|---------|------------|
| `Tile.tsx` | `Tile` — single letter tile. Props: `letter, state, flipping, flipMid, shaking`. Data attrs: `data-state`, `data-flipping`, `data-flip-mid`, `data-shaking`, `data-result`. | `Tile.test.tsx`, `Tile.animation.test.tsx` |
| `BoardGrid.tsx` | `BoardGrid` — 4-board grid. Props: `onEnter?`. Reads `boardStore`. Data attrs: `data-board-index`, `data-status`, `data-row-index`, `data-tile-index`, `data-reveal-row`. | `BoardGrid.test.tsx`, `BoardGrid.flip.test.tsx`, `BoardGrid.shake.test.tsx`, `BoardGrid.errors.test.tsx`, `BoardGrid.staticStates.test.tsx`, `BoardGrid.timerLock.test.tsx` |
| `TimerDisplay.tsx` | `TimerDisplay` — countdown timer. Props: `deadline: number, syncedDeadline?: number, stopped?: boolean`. Data attrs: `data-testid="timer-display"`, `data-urgent="true\|false"`. Calls `lockAllBoards()` at zero or when stopped. | `TimerDisplay.test.tsx`, `TimerDisplay.sync.test.tsx` |
| `WaitingRoom.tsx` | `WaitingRoom` — waiting room UI. Props: `inviteLink, players, isAdmin, rounds, timeLimitSeconds, maxPlayers, onStart`. Data attrs: `data-testid="copy-link-button"`, `data-testid="qr-code-area"`, `data-testid="config-summary"`, `data-testid="player-list"`, `data-testid="admin-badge"`, `data-testid="start-game-button"`, `data-testid="waiting-message"`. | `WaitingRoom.test.tsx`, `WaitingRoom.realtime.test.tsx` |
| `AdminControls.tsx` | `AdminControls` — contextual admin action buttons. Props: `isAdmin, status, players, onStartGame?, onStartNextRound?, onEndGame?, onRestartGame?, onShuffleWords?`. Renders: Start Game (`data-testid="admin-start-game"`) in `waiting`; Start Next Round (`data-testid="admin-start-next-round"`) + End Game (`data-testid="admin-end-game"`) in `between_rounds`; Play Again (`data-testid="admin-play-again"`) in `finished`; waiting message (`data-testid="admin-waiting-message"`) for non-admin in `waiting`. Start Game disabled when `players.length === 0`. | `AdminControls.test.tsx` |

### client/src/pages/ — page-level components (tested with Vitest + RTL)
| File | Exports | Test files |
|------|---------|------------|
| `JoinPage.tsx` | `JoinPage` — name entry form + routing. Uses `useParams` for `gameId`, `useNavigate` for routing. Posts to `POST /game/join`; navigates to correct route based on `gameStatus`. Passes `{ state: { deadline } }` when navigating to active game. Data attrs: `data-testid="name-input"`, `data-testid="name-error"`, `data-testid="server-error"`, `data-testid="join-button"`. | `JoinPage.test.tsx`, `GamePage.midRoundJoin.test.tsx` |

### client/src/store/ — Zustand vanilla stores
| File | Store | State shape | Key actions |
|------|-------|-------------|-------------|
| `boardStore.ts` | `boardStore` | `boards: BoardState[], currentInput: string, submitting: bool, shaking: bool, myScore: number` | `initBoards(words)`, `appendLetter`, `deleteLetter`, `setSubmitting`, `setShaking`, `setMyScore`, `applyAllResults(entries)`, `lockAllBoards()` |
| `gameStore.ts` | `gameStore` | `players: Player[], gameStatus: string, settings: GameConfig \| null` | `handleGameStateUpdate({ players, status, settings })` |

### server/src/routes/ — HTTP route handlers
| File | Exports | Purpose |
|------|---------|---------|
| `createGame.ts` | `handleCreateGame`, `gameSessions` | `POST /game/create` — creates game, sets admin session cookie |
| `joinGame.ts` | `handleJoinGame`, `gamePlayers`, `gameDeadlines` | `POST /game/join` — adds player, sets session cookie; returns `{ playerId, gameStatus, deadline? }`. `gamePlayers`: Map of gameId→players. `gameDeadlines`: Map of gameId→deadline (set by round start logic). |
| `index.ts` | `handleRequest` | Routes `POST /game/create` and `POST /game/join` |

### client/src/socket/
| File | Exports | Socket events handled |
|------|---------|----------------------|
| `useGameSocket.ts` | `useGameSocket({ gameId, roundNumber, playerId, serverUrl })` → `{ handleEnter }` | **In:** `round_started({ words })`, `guess_result`, `round_ended`. **Out:** `join_game`, `submit_guess` |

### server/src/ — Socket.io server
| File | Exports | Purpose |
|------|---------|---------|
| `index.ts` | `io`, `games` | Server entry. Handles: `join_game`, `submit_guess`. Registers `registerAdminHandlers` per connection. Emits: `guess_result`, `leaderboard_update`. |
| `socket/handlers/adminHandlers.ts` | `registerAdminHandlers(io, socket)`, `adminGames` (Map), `AdminGameState` | Admin WebSocket handlers. `adminGames`: Map of gameId→`AdminGameState` (status, totalRounds, roundNumber, timeLimitSeconds, currentWords, usedWords, adminPlayerId). Handles: `start_game`, `start_next_round`, `end_game`, `restart_game`, `shuffle_words`. All reject non-admin with `not_authorized`. |
| `game/submitGuess.ts` | `handleSubmitGuess`, `games` (Map), types: `GameState`, `PlayerState`, `BoardState`, `GuessResultSuccess`, `GuessResultError` | Pure guess handler. `GameState` has `status, roundNumber, deadline, players`. |
| `game/matchGuess.ts` | `matchGuess(guess, target)` → `TileResult[]` | Wordle-style tile scoring. |
| `game/wordList.ts` | `VALID_WORDS: Set<string>` | Valid 5-letter word list. |
| `game/timer.ts` | `startRoundTimer(io, gameId, deadline)`, `stopRoundTimer(gameId)` | Server-side round timer. Fires `round_ended` at deadline via setTimeout; emits `timer_sync` every 60s via setInterval. Tracks active timers in an in-memory Map. |

### shared/types/game.ts
```typescript
TileResult  = "green" | "yellow" | "grey"
TileState   = "empty" | "typing" | "green" | "yellow" | "grey"
BoardStatus = "unsolved" | "solved" | "failed" | "locked"
GuessRow    = { word: string; result: TileResult[] }
BoardState  = { status: BoardStatus; targetWord: string | null; guesses: GuessRow[] }
GameConfig  = { maxPlayers: number; rounds: number; timeLimitSeconds: number }
Player      = { playerId: string; name: string; role: "admin" | "player"; isConnected: boolean }
```

# Test infrastructure

## Implementation sequence — follow strictly

Phase 1: Write all tests first
  - Create every test file listed in the Test Plan
  - Write every test case from the test plan tables
  - Run the tests: npx vitest run
  - All tests must FAIL at this point (red phase)
  - Do NOT write any implementation code during Phase 1

Phase 2: Implement Step 1 only
  - Write the minimum code to make Step 1 tests pass
  - Run: npx vitest run
  - All Step 1 tests must PASS; Step 2 tests still fail
  - Stop and report results before continuing

Phase 3: Implement Step 2 only
  - Write minimum code to make Step 2 tests pass
  - Run: npx vitest run
  - All tests must PASS
  - Stop and report results

| Workspace | Runner | Config | Setup file | Environment |
|-----------|--------|--------|------------|-------------|
| `client/` | `vitest run` | `client/vitest.config.ts` | `client/vitest.setup.ts` (imports `@testing-library/jest-dom/vitest`, runs `cleanup()` after each) | `happy-dom` (per file via `@vitest-environment happy-dom` docstring) or `node` |
| `server/` | `vitest run` | `server/vitest.config.ts` | none | `node` |

**Root scripts (run from repo root):**
```
npm run typecheck:all   → tsc --noEmit in app, client, server
npm run lint            → eslint across app, client, server
npm test                → vitest run in client + server
```

## Server GameState shape (in-memory, server/src/game/submitGuess.ts)
```typescript
GameState = {
  status: "waiting" | "active" | "ended"
  roundNumber: number
  deadline: number          // Unix timestamp ms
  players: Map<string, PlayerState>
}
PlayerState = { score: number; boards: BoardState[] }
BoardState  = { targetWord: string; attemptCount: number; status: "unsolved"|"solved"|"failed" }
```

## Socket event reference (current state)

| Direction | Event | Payload | Handler location |
|-----------|-------|---------|-----------------|
| Client → Server | `join_game` | `{ gameId }` | `server/src/index.ts` |
| Client → Server | `submit_guess` | `{ gameId, roundNumber, guess }` | `server/src/index.ts` → `handleSubmitGuess` |
| Server → Client | `guess_result` | `GuessResultSuccess \| GuessResultError` | `client/src/socket/useGameSocket.ts` |
| Server → Client | `leaderboard_update` | `{ leaderboard: [{playerId, score, boardsSolved}] }` | (not yet consumed client-side) |
| Server → Client | `round_started` | `{ words: string[] }` | `client/src/socket/useGameSocket.ts` → `initBoards` |
| Server → Client | `round_ended` | (none) | `client/src/socket/useGameSocket.ts` → `lockAllBoards`; `app/pages/GamePage.tsx` → `setTimerStopped(true)` |
| Server → Client | `round_started` | `{ words: string[], startTime: number, deadline: number, timeLimitSeconds: number }` | `client/src/socket/useGameSocket.ts` → `initBoards`; `app/pages/GamePage.tsx` → `setTimerDeadline` |
| Server → Client | `timer_sync` | `{ deadline: number }` | `app/pages/GamePage.tsx` → `setSyncedDeadline` → passed as prop to `TimerDisplay` |
| Client → Server | `start_game` | `{ gameId }` | `server/src/socket/handlers/adminHandlers.ts` — admin only; transitions to `active`, fires `round_started` |
| Client → Server | `start_next_round` | `{ gameId }` | `server/src/socket/handlers/adminHandlers.ts` — admin only; from `between_rounds`, fires `round_started` |
| Client → Server | `end_game` | `{ gameId }` | `server/src/socket/handlers/adminHandlers.ts` — admin only; transitions to `finished`, fires `game_ended` |
| Client → Server | `restart_game` | `{ gameId }` | `server/src/socket/handlers/adminHandlers.ts` — admin only; resets scores/usedWords to `waiting` |
| Client → Server | `shuffle_words` | `{ gameId }` | `server/src/socket/handlers/adminHandlers.ts` — admin only; re-draws 4 words server-side silently |
| Server → Client | `game_ended` | `{}` | fired on `end_game`; client navigates to end screen |
| Server → Client | `game_state_update` | `{ players: Player[], status: string, settings: GameConfig }` | `app/pages/WaitingRoomPage.tsx` → `gameStore.handleGameStateUpdate`; also fired on `restart_game` |

## API route reference (current state)

| Method | Path | Handler | Response |
|--------|------|---------|----------|
| POST | `/game/create` | `handleCreateGame` | 201: `{ gameId, inviteLink }` + session cookie |
| POST | `/game/join` | `handleJoinGame` | 200: `{ playerId, gameStatus, deadline? }` + session cookie / 403 / 404 / 409 |