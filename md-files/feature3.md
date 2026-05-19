# F3 · Round Timer

## Summary

Each round runs for a fixed duration configured by the admin at game creation. A live countdown is displayed in the navigation bar throughout the round and is visible to all players. The timer is enforced server-side using a Redis TTL — the client countdown is purely cosmetic. Every 60 seconds the server broadcasts a sync event to correct any client drift. Players who join mid-round receive the remaining time only. When the timer reaches zero, all unsolved boards lock and the round ends.

---

## Goals

- Every player sees a consistent, accurate countdown throughout a round
- The timer turns visually urgent under 20 seconds to prompt focus
- The server enforces the deadline regardless of client state — no client can gain time by manipulating its local clock
- Drift between client and server is silently corrected every 60 seconds without a jarring visual jump
- Mid-round joiners start their countdown from the remaining time, not the full duration
- When the timer expires, all unsolved boards lock immediately

---

## Assumptions

- `round_started` always includes both `startTime` (server Unix timestamp in ms) and `deadline` (absolute Unix timestamp in ms). The client never calculates `deadline` itself
- Network latency between server `round_started` emission and client receipt is acceptable for MVP (sub-second). No latency compensation is applied
- `timer_sync` broadcasts exactly every 60 seconds during an active round, not more frequently. This is a correction mechanism, not a primary clock source
- Drift under 2 seconds is intentionally ignored to avoid visual noise from minor clock skew
- The server-side Redis TTL is the single source of truth. If the server restarts, the TTL-based job re-fires correctly
- The client does not "pause" the timer for any reason — there is no pause mechanic in the game
- `timeLimitSeconds` is always one of: 60, 90, 120, 180. No other values arrive

---

## Edge cases

- **Player opens the game after the round has started** — `deadline` in `round_started` is already in the past relative to full duration; `deadline - Date.now()` gives the correct remaining time; no special case needed
- **`timer_sync` arrives when drift is under 2 seconds** — client ignores the correction silently; no visual change
- **`timer_sync` arrives when drift is over 2 seconds** — countdown adjusts smoothly to `deadline - Date.now()`; no jump or skip in the displayed value
- **Timer reaches zero on client before `round_ended` arrives** — client displays `0:00` and locks boards immediately; `round_ended` may arrive a moment later to confirm; the lock is idempotent
- **`round_ended` arrives before the client timer reaches zero** — round ends server-authoritatively; client timer stops and boards lock regardless of the displayed countdown
- **Two `timer_sync` events arrive in quick succession** (network hiccup) — each is applied independently; the second overwrites the first; both are idempotent since they reference the same `deadline`
- **Timer displays `0:00` for a brief moment before `round_ended` arrives** — acceptable; boards lock immediately at zero; the visual `0:00` state is valid
- **Player joins with fewer than 5 seconds remaining** — timer shows the remaining seconds and counts down normally; boards start blank; the player may not have time to complete a full guess, which is expected

---

## Technical design

### Client timer

```
On round_started({ startTime, deadline, timeLimitSeconds }):
  remaining = deadline - Date.now()
  start local setInterval(1000):
    remaining -= 1000
    display = formatMMSS(remaining)
    if remaining <= 0: lockAllBoards(); clearInterval()

On timer_sync({ deadline }):
  newRemaining = deadline - Date.now()
  if abs(currentRemaining - newRemaining) > 2000:
    currentRemaining = newRemaining  // smooth correction, no jump

On round_ended:
  clearInterval()
  lockAllBoards()
```

### Server timer

- `deadline = startTime + timeLimitSeconds * 1000` stored in Redis as `game:{id}:round:{n}:deadline` with TTL
- A server-side job (Redis keyspace notification or scheduled callback) fires `round_ended` broadcast at deadline
- `timer_sync` is emitted to the room every 60 seconds via a recurring server interval that runs while the round is active
- Both the deadline job and the `timer_sync` interval are cleared when `round_ended` fires

### Display format

- `MM:SS` with leading zero on seconds (e.g. `1:07`, `0:09`)
- Under 20 seconds: red text + CSS pulse animation
- At `0:00`: display freezes; boards lock

---

## Implementation steps

### Step 1 — Client countdown display and urgent state

**Scope:** Implement the countdown timer component in the nav bar, driven by `round_started`. No server enforcement or sync yet — just the local countdown and visual urgency state.

**What to build:**
- `TimerDisplay` component: shows `MM:SS`, accepts `deadline: number` prop, runs its own `setInterval`
- Mounts on `round_started`; unmounts or stops on `round_ended`
- Under 20 seconds: applies red text and pulse animation class
- At zero: displays `0:00` and stops

**Done when:**
- Timer counts down correctly from any starting value
- `1:07` displays as `1:07` not `1:7`
- Red pulse class appears at exactly 19 seconds remaining, not 20 or 21
- Timer shows `0:00` and stops — does not go negative
- Unmounts cleanly without memory leak (interval cleared)

---

### Step 2 — Server enforcement, `timer_sync` drift correction, and mid-round join

**Scope:** Wire `round_started` deadline to the server-side Redis TTL job; implement 60-second `timer_sync` broadcast; handle mid-round joiners receiving remaining time; lock boards on server-authoritative expiry.

**What to build:**
- Server: Redis TTL key for `deadline`; scheduled job fires `round_ended` at expiry
- Server: `timer_sync` interval every 60 seconds during active round
- Client: on `timer_sync`, apply drift correction if delta > 2 seconds
- Client: on `round_ended` (from server), clear interval and lock all boards regardless of local timer state
- Mid-round join: `deadline` from `round_started` already set; client computes remaining time as `deadline - Date.now()`

**Done when:**
- Server fires `round_ended` at the correct time regardless of client state
- `timer_sync` arrives every 60 seconds during an active round
- Client silently corrects countdown when drift exceeds 2 seconds
- Client ignores `timer_sync` when drift is under 2 seconds (no visible change)
- A player joining mid-round sees the correct remaining time immediately
- `round_ended` from server locks all boards even if client timer shows time remaining

---

## Test plan

### Step 1 — Client countdown display

**File:** `client/src/components/TimerDisplay.test.tsx`
**Type:** Component (React Testing Library + fake timers)

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Displays correct initial time from deadline | `deadline = now + 107000` | renders `1:47` | Initial format correct |
| 2 | Counts down by 1 each second | advance timer 1s | displays `1:46` | Interval fires correctly |
| 3 | Leading zero on seconds under 10 | `deadline = now + 9000` | renders `0:09` | Zero-padding correct |
| 4 | Displays `1:00` not `1:0` at 60 seconds | `deadline = now + 60000` | renders `1:00` | Boundary format correct |
| 5 | No red class above 20 seconds | `deadline = now + 21000` | no urgent class | Threshold not triggered early |
| 6 | Red class applies at exactly 19 seconds | advance to 19s remaining | urgent/red class present | Threshold triggers correctly |
| 7 | Pulse animation class present under 20 seconds | advance to 15s remaining | pulse class present | Urgency animation applied |
| 8 | Stops at `0:00` — does not go negative | advance past deadline | displays `0:00`; no further change | Floor at zero |
| 9 | Interval cleared on unmount | unmount component | no `act()` warnings; no further state updates | Memory leak prevented |
| 10 | Re-mounts cleanly with new deadline | unmount then remount with new deadline | new countdown starts correctly | Component reuse across rounds |

### Step 2 — Server enforcement and sync

**File:** `server/src/game/timer.test.ts` (unit + integration)
**File:** `client/src/components/TimerDisplay.sync.test.tsx`

| # | Test | Type | Setup | Expected | What it proves |
|---|------|------|-------|----------|----------------|
| 11 | Server fires `round_ended` at deadline | Integration | seed Redis TTL to expire in 2s | `round_ended` received by test socket within 2.5s | Server enforcement correct |
| 12 | `timer_sync` received every 60 seconds | Integration | active round running | socket receives `timer_sync` at ~60s intervals | Sync broadcast fires |
| 13 | `timer_sync` payload contains `deadline` | Integration | receive `timer_sync` | payload has numeric `deadline` field | Payload shape correct |
| 14 | Drift > 2s corrected on `timer_sync` | Unit | local remaining=90000, `timer_sync` deadline gives 85000 | display updates to ~85s | Large drift corrected |
| 15 | Drift < 2s ignored on `timer_sync` | Unit | local remaining=85000, `timer_sync` gives 84500 | display unchanged | Small drift ignored |
| 16 | `round_ended` locks boards regardless of local timer | Component | timer showing 10s; receive `round_ended` | boards locked; timer stops | Server authority over client |
| 17 | Mid-round join shows remaining time | Component | `deadline = now + 45000` in `round_started` | displays `0:45` not full round time | Remaining time calculation |
| 18 | Mid-round join with 3 seconds remaining | Component | `deadline = now + 3000` | displays `0:03`; counts down | Very short remaining time handled |