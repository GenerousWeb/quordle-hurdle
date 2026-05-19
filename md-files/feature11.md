# F11 · Live Leaderboard

## Summary

A ranked leaderboard updates in real time throughout the game. During a round, player scores appear as small badges on player dots in the nav bar. Between rounds, a full table shows rank, name, points earned that round, and the cumulative total. At game end, a podium highlights 1st, 2nd, and 3rd place. The current player's row is always highlighted. Updates are pushed via `leaderboard_update` WebSocket events after every scored guess.

---

## Goals

- Every player sees score changes within one WebSocket round-trip of any guess
- The current player can always identify their own position
- Between rounds, players can see both their round contribution and their running total
- The podium at game end celebrates the top three players visually

---

## Assumptions

- `leaderboard_update` is broadcast to the room after every scored guess (fired by the server from the `submit_guess` handler)
- The leaderboard payload includes `playerId`, `name`, `score`, `boardsSolved` per entry, sorted by score descending
- The current player identifies their own row via `myPlayerId` stored in the Zustand store from their session
- Ties are broken by completion time then boards solved (server-side sort)
- The podium shows exactly the top 3 players; if fewer than 3 players exist, show only those that exist
- Scores are never negative

---

## Edge cases

- **Only 1 player in the game** — podium shows 1st only; no 2nd or 3rd slots rendered
- **Tie on total score** — server sorts by completion time; if still tied, by boards solved; display shows them in server-determined order
- **Player who never guessed** — appears at the bottom of the leaderboard with score 0
- **Player who disconnected mid-game** — still appears in leaderboard with their last recorded score
- **`leaderboard_update` arrives during animation** — update is applied to the store immediately; the nav badge updates; the between-rounds table is not visible during a round anyway

---

## Technical design

### `leaderboard_update` payload (Server→Room)

```json
{
  "leaderboard": [
    { "playerId": "abc", "name": "Alex", "score": 158, "boardsSolved": 2 },
    { "playerId": "def", "name": "Sam",  "score": 124, "boardsSolved": 2 }
  ]
}
```

Server sorts by score desc, then completionTime asc, then boardsSolved desc before emitting.

### Podium data (from `game_ended` payload)

```json
{
  "podium": [
    { "rank": 1, "name": "Alex", "score": 317 },
    { "rank": 2, "name": "Sam",  "score": 252 },
    { "rank": 3, "name": "Jordan", "score": 185 }
  ],
  "finalLeaderboard": [...]
}
```

---

## Implementation steps

### Step 1 — Nav bar score badges and in-round leaderboard

**Scope:** During a round, update player score badges in the nav bar on each `leaderboard_update`. Build the player dot component with score badge.

**What to build:**
- `PlayerDot` component: avatar initial, score badge below
- Zustand store: `leaderboard[]` updated on each `leaderboard_update`
- Nav bar renders `PlayerDot` per player from store
- Current player's dot has a distinct border/colour

**Done when:**
- Score badge updates without full page re-render
- Current player dot is visually distinct
- New players appearing mid-game are added to the nav dots

---

### Step 2 — Between-rounds leaderboard table and end-game podium

**Scope:** Full leaderboard table on the between-rounds screen with round score and total. Podium component on the end-game screen.

**What to build:**
- `LeaderboardTable` component: rank, name, round score (+N), total score; current player row highlighted
- `Podium` component: three slots (1st/2nd/3rd) with player name and score; renders fewer slots if < 3 players
- Both driven from Zustand store data populated by `round_ended` and `game_ended` events

**Done when:**
- Table sorted by total score descending
- Round score shown with `+` prefix
- Current player row highlighted in table
- Podium renders 1, 2, or 3 slots based on player count
- Podium visually distinguishes 1st from 2nd and 3rd

---

## Test plan

### Step 1 — Nav bar badges

**File:** `client/src/components/PlayerDot.test.tsx` + `client/src/components/NavBar.leaderboard.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Score badge shows player score | `score=158` | badge text "158" | Score displayed |
| 2 | Score updates on `leaderboard_update` | receive update with new scores | badge reflects new value | Real-time update |
| 3 | Current player dot has distinct styling | `isMe=true` | distinct border/colour class | Self-identification |
| 4 | All players rendered in nav | 4-player leaderboard update | 4 dots in nav | All players shown |
| 5 | New player added mid-game appears | receive `leaderboard_update` with new player | new dot appears | Dynamic addition |

### Step 2 — Table and podium

**File:** `client/src/components/LeaderboardTable.test.tsx` + `client/src/components/Podium.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 6 | Table sorted by total score | 4 players with mixed scores | rows in descending total score order | Sort correct |
| 7 | Round score has `+` prefix | `roundScore: 64` | "+64" in cell | Format correct |
| 8 | Current player row highlighted | `myPlayerId` matches one entry | that row has highlight class | Self-highlight |
| 9 | Podium shows top 3 | 4 players | 3 podium slots rendered | Podium count |
| 10 | Podium with 2 players shows 2 slots | 2-player game | 2 slots only | Under-3 handling |
| 11 | 1st place visually distinct from 2nd/3rd | render podium | 1st slot has distinct styling | Visual hierarchy |
| 12 | Podium shows correct names and scores | `podium=[{rank:1,name:"Alex",score:317}]` | "Alex" and "317" in 1st slot | Data correct |
