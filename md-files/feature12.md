# F12 · Opponent Progress

## Summary

During a round, a horizontal strip above the boards shows a card for each opponent (not the current player). Each card shows the opponent's name, their current score, and four pip indicators showing how many boards they have solved. Disconnected players are shown in a muted state. Players do not see opponent guesses — only solved board counts. The strip updates in real time via `leaderboard_update` events.

---

## Goals

- Players can gauge opponent progress at a glance without seeing their guesses
- Disconnected opponents are visually distinguishable from active ones
- The strip is compact enough not to disrupt the board grid layout

---

## Assumptions

- Opponent progress is derived from `leaderboard_update` which includes `boardsSolved` per player
- The current player's card is excluded from the strip — they see their own progress on the boards
- `isConnected` status comes from `game_state_update` events (not `leaderboard_update`)
- Pip indicators show filled (solved) vs empty (unsolved) — not failed or locked distinction
- Player order in the strip is stable (join order) to prevent the strip from reordering on each update

---

## Edge cases

- **Solo game (1 player)** — strip is empty; renders nothing or is hidden
- **Player disconnects mid-round** — their card becomes muted; pips remain at last known state
- **Player reconnects** — card returns to normal styling; pips unchanged (still show last known boardsSolved)
- **All opponent boards solved** — all 4 pips filled; card remains visible until round ends
- **New player joins mid-round** — their card appears in the strip with 0 pips and their join-time score

---

## Technical design

### Data sources

- `leaderboard_update`: `{ leaderboard: [{ playerId, name, score, boardsSolved }] }` — drives pip count and score
- `game_state_update`: `{ players: [{ playerId, isConnected }] }` — drives connected/disconnected styling

Both are merged in the Zustand store before rendering `OpponentStrip`.

---

## Implementation steps

### Step 1 — Opponent strip UI component

**Scope:** Build `OpponentStrip` and `OpponentCard` as static components driven from props. No real-time wiring yet.

**What to build:**
- `OpponentCard`: avatar initial, name, score, 4 pip indicators (filled/empty), disconnected state (muted)
- `OpponentStrip`: renders one card per opponent (excludes current player)
- Pips: 4 small squares; filled = solved, empty = unsolved
- Disconnected card: reduced opacity + italic name

**Done when:**
- 0–4 pips render correctly based on `boardsSolved`
- Disconnected card is visually muted
- Current player excluded from strip
- Strip renders nothing when no opponents

---

### Step 2 — Real-time updates from store

**Scope:** Wire `OpponentStrip` to Zustand store. Update on `leaderboard_update` and `game_state_update`.

**What to build:**
- Zustand store: `opponents[]` derived from leaderboard minus current player
- Store updated on `leaderboard_update` (scores and pips) and `game_state_update` (connected status)
- `OpponentStrip` subscribes to store slice

**Done when:**
- Pips update when opponent solves a board
- Score updates in real time
- Disconnected state updates when player disconnects
- New opponent joining mid-round appears in strip

---

## Test plan

### Step 1 — Static UI

**File:** `client/src/components/OpponentCard.test.tsx` + `client/src/components/OpponentStrip.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Card shows opponent name | `name="Sam"` | "Sam" in DOM | Name rendered |
| 2 | Card shows current score | `score=124` | "124" visible | Score rendered |
| 3 | 0 pips filled for 0 boards solved | `boardsSolved=0` | 0 filled pips | Zero solved state |
| 4 | 2 pips filled for 2 boards solved | `boardsSolved=2` | 2 filled, 2 empty pips | Partial solved state |
| 5 | 4 pips filled for 4 boards solved | `boardsSolved=4` | all 4 filled | Full solved state |
| 6 | Disconnected card has muted styling | `isConnected=false` | muted class or opacity | Disconnected state |
| 7 | Connected card has normal styling | `isConnected=true` | no muted class | Connected state |
| 8 | Strip excludes current player | `myPlayerId="abc"`, opponents include "abc" | "abc" not in strip | Self-exclusion |
| 9 | Strip with 0 opponents renders nothing | `opponents=[]` | no cards in DOM | Empty state |

### Step 2 — Real-time updates

**File:** `client/src/components/OpponentStrip.realtime.test.tsx`

| # | Test | Action | Expected | What it proves |
|---|------|--------|----------|----------------|
| 10 | Pip count updates on `leaderboard_update` | receive update with `boardsSolved=2` for opponent | 2 filled pips | Real-time pip update |
| 11 | Score updates on `leaderboard_update` | receive update with new score | score badge updated | Real-time score |
| 12 | Card goes muted on `game_state_update` disconnect | `isConnected=false` for opponent | muted styling applied | Disconnect update |
| 13 | New opponent appears on `game_state_update` | new player joins mid-round | new card in strip | Dynamic addition |
