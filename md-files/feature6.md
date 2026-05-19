# F6 · Invite Link & Waiting Room

## Summary

After creating a game, the admin is shown a waiting room with the invite link and a QR code. As players open the link and enter their names, they appear in a live player list. The admin can start the game at any point once at least one player has joined. A game configuration summary is shown. The admin sees a "Start Game" button; players see a holding screen.

---

## Goals

- Admin can share the invite link with one tap
- All participants see the live player list update in real time without refreshing
- The waiting room clearly communicates the game configuration
- Admin can start the game the moment they're ready
- Players have a clear, non-blocking holding experience

---

## Assumptions

- QR code is generated client-side from the invite link using a library (`qrcode` npm package). No server involvement needed
- The player list updates via `game_state_update` WebSocket events — no polling
- "Start Game" button is visible and enabled when `players.length >= 1`
- A player who opens the invite link before the game starts goes through the name entry flow (F7) then lands here
- The admin's own name appears in the player list with an "admin" badge
- Player status in the list is either "joined" (connected) or "joining…" (name submitted but socket not yet confirmed)

---

## Edge cases

- **Admin opens the waiting room with no other players** — "Start Game" still enabled (admin counts as a player); they can start solo
- **Player joins while admin is reading the screen** — their name appears in the list without any page refresh
- **Player cap reached** — new players attempting to join are shown a "game is full" message; existing list unchanged
- **Admin clicks "Start Game" before the button is enabled** — button is disabled until `players.length >= 1`; no action taken
- **Admin refreshes the page** — session cookie re-identifies them; they rejoin the waiting room with the same game state
- **Clipboard API unavailable** (older browsers) — "Copy" button falls back to showing the URL in a selectable text field

---

## Technical design

### WebSocket events

- `game_state_update` (Room): player list, game status, and settings; emitted on every player join
- `join_game` (Client→Server): player sends this after POST /game/join to join the Socket.io room

### QR code

Generated client-side from `inviteLink` using `qrcode` npm package rendered to a `<canvas>`. No server involvement.

---

## Implementation steps

### Step 1 — Waiting room UI with static player list and invite link

**Scope:** Build the waiting room screen as a static component. Invite link with copy button, QR code, game config summary, player list (from props), and "Start Game" / holding message.

**What to build:**
- `WaitingRoom` component: invite URL display, copy button, QR code canvas, config summary (rounds, time, cap), player list, admin/player conditional button
- Copy button writes to clipboard; falls back to selecting text on failure
- "Start Game" button disabled when no players; calls `onStart` prop

**Done when:**
- Invite link rendered and copy button works
- QR code renders from invite link string
- Player list shows name and status badge per player
- Admin sees "Start Game" button; non-admin sees holding message
- Button disabled with 0 players; enabled with ≥1

---

### Step 2 — Live player list via WebSocket

**Scope:** Connect the waiting room to `game_state_update` events so the player list updates in real time.

**What to build:**
- Socket.io connection established after joining; player emits `join_game`
- On `game_state_update`: update Zustand store player list
- `WaitingRoom` re-renders from store on each update
- "Start Game" triggers `start_game` WebSocket event

**Done when:**
- New player joining causes their name to appear without page refresh
- "Start Game" triggers game start WebSocket event
- Player list correctly shows all joined players
- Admin badge shown only on admin's entry

---

## Test plan

### Step 1 — Static UI

**File:** `client/src/components/WaitingRoom.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Invite link displayed | `inviteLink="https://game.app/play/abc"` | URL visible in DOM | Link renders |
| 2 | Copy button copies to clipboard | click copy | `navigator.clipboard.writeText` called | Copy action fires |
| 3 | QR code canvas rendered | render with invite link | canvas element present | QR code mounted |
| 4 | Config summary shows correct values | `rounds=3, time=120, max=8` | "3 rounds", "2:00", "8 players" visible | Config displayed |
| 5 | Player list shows all players | `players=[{name:"Alex",role:"admin"},{name:"Sam"}]` | both names in list | Player list renders |
| 6 | Admin badge shown on admin player | admin player in list | "admin" badge visible on Alex | Role badge correct |
| 7 | Admin sees Start Game button | `isAdmin=true` | button in DOM | Admin conditional |
| 8 | Non-admin sees holding message | `isAdmin=false` | no start button; holding text visible | Player view correct |
| 9 | Start button disabled with 0 players | `players=[]` | button has disabled attribute | Disabled state |
| 10 | Start button enabled with 1+ players | `players=[{name:"Alex"}]` | button not disabled | Enabled state |

### Step 2 — Live updates

**File:** `client/src/components/WaitingRoom.realtime.test.tsx`

| # | Test | Setup | Action | Expected | What it proves |
|---|------|-------|--------|----------|----------------|
| 11 | New player appears on `game_state_update` | 1 player in list | emit `game_state_update` with 2 players | 2nd player appears | Real-time update works |
| 12 | Start Game emits `start_game` event | admin, ≥1 player | click Start Game | `start_game` event emitted | Start action correct |
| 13 | Store updates from `game_state_update` | empty store | receive event | store has updated player list | Store integration |
