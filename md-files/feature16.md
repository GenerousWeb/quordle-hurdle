# F16 · Admin Auto-Promotion

## Summary

If the admin disconnects, the game must not stall indefinitely waiting for them to return. The server automatically promotes the next-longest-joined player to admin. All players receive an `admin_transferred` notification. The newly promoted player sees admin controls appear immediately without any action on their part. The promoted player retains all admin capabilities for the remainder of the game.

---

## Goals

- A disconnected admin never permanently stalls the game
- The promotion is automatic, immediate, and transparent to all players
- The new admin can exercise all controls from the moment of promotion
- The notification is clear so players understand who the new admin is

---

## Assumptions

- Admin promotion is triggered when the admin's socket disconnects — not on a timeout delay
- "Next-longest-joined" means the player with the earliest `joinedAt` timestamp among currently connected players (excluding the disconnecting admin)
- If all other players are also disconnected when the admin disconnects, the admin slot is held until another player reconnects and then gets promoted at that time
- The original admin loses admin status permanently for this game session (even if they reconnect) — they rejoin as a regular player
- If the original admin reconnects, they do NOT get their admin role back
- Promotion is silent on the server: no confirmation required from the promoted player
- `admin_transferred` payload includes the `newAdminId` and `newAdminName` so all clients can update their UI

---

## Edge cases

- **Admin disconnects with 0 other connected players** — no promotion possible; `adminId` is cleared; when any player reconnects, they are promoted
- **Admin disconnects and immediately reconnects** — promotion has already fired; they rejoin as a regular player; the other player retains admin
- **The promoted player disconnects immediately after promotion** — promotion cascade: the next eligible player is promoted; another `admin_transferred` fires
- **Only 1 player total (admin only)** — no one to promote; game enters a stalled state; admin can still reconnect and regain control (special case: single-player games only)
- **`admin_transferred` received by client while on the waiting room** — the new admin's "Start Game" button should appear immediately
- **`admin_transferred` received during an active round** — the new admin's "End Game" button appears; "Start Next Round" will appear when the round ends

---

## Technical design

### Server promotion logic

```
On socket disconnect event for adminId:
  1. Set player.isConnected = false in Redis
  2. Find next eligible player:
     eligible = players
       .filter(p => p.isConnected && p.playerId !== adminId)
       .sort((a, b) => a.joinedAt - b.joinedAt)  // oldest joiner first
  3. If eligible.length > 0:
     newAdmin = eligible[0]
     game.adminId = newAdmin.playerId
     HSET game:{id} adminId newAdmin.playerId
     emit admin_transferred to room: { newAdminId, newAdminName }
  4. If eligible.length === 0:
     game.adminId = null  // no admin until reconnect
     HSET game:{id} adminId null
```

### Client handling of `admin_transferred`

```
On admin_transferred({ newAdminId, newAdminName }):
  store.adminId = newAdminId
  if store.myPlayerId === newAdminId:
    // I am the new admin — admin controls become visible
  show notification: "{newAdminName} is now the admin"
```

### Notification

- Brief toast/banner visible to all players: "{name} is now the admin"
- Duration: ~3 seconds; dismisses automatically
- No action required to dismiss

---

## Implementation steps

### Step 1 — Server-side promotion logic and `admin_transferred` event

**Scope:** Implement promotion on admin socket disconnect. Select next eligible player by join order. Emit `admin_transferred` to room.

**What to build:**
- Socket disconnect handler: if disconnecting player is admin, run promotion logic
- Select next-longest-joined connected player
- Update `adminId` in Redis
- Emit `admin_transferred: { newAdminId, newAdminName }` to room
- Handle edge case: no connected players → set adminId to null

**Done when:**
- Admin disconnect triggers promotion to correct next player
- `admin_transferred` fires with correct payload
- Original admin's role is revoked in Redis
- No promotion fires when a non-admin disconnects
- Edge case: no connected players → adminId set to null

---

### Step 2 — Client: admin controls appear on promotion, notification shown

**Scope:** Client handles `admin_transferred`. New admin sees controls appear. All players see notification.

**What to build:**
- Store: `adminId` updated on `admin_transferred`
- All screens with admin controls re-evaluate `isAdmin = (myPlayerId === adminId)` reactively
- `AdminTransferNotification` component: toast banner with "{name} is now the admin"; auto-dismisses in 3 seconds
- Notification shown to all players including the new admin

**Done when:**
- New admin sees admin buttons appear without refreshing
- Former admin's buttons disappear if they reconnect
- Notification appears for all players, auto-dismisses after 3 seconds
- Notification shows correct new admin name
- Admin controls visible on correct screens immediately after promotion

---

## Test plan

### Step 1 — Server promotion

**File:** `server/src/game/adminPromotion.test.ts` (integration)

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Admin disconnect triggers `admin_transferred` | admin socket closes | all clients receive `admin_transferred` | Promotion fires |
| 2 | Correct player promoted — oldest join time | 3 players, admin + 2 others with known join times | player with earliest `joinedAt` promoted | Join order selection |
| 3 | `admin_transferred` payload has correct newAdminId | admin disconnects | payload matches promoted player | Correct payload |
| 4 | Promoted player has admin role in Redis | after promotion | `game.adminId` = promoted player's ID | Redis updated |
| 5 | Original admin loses admin role | after promotion | original adminId no longer matches `game.adminId` | Role revoked |
| 6 | Non-admin disconnect does not trigger promotion | non-admin socket closes | no `admin_transferred` event | Only admin triggers |
| 7 | No promotion when no connected players remain | admin disconnects as last connected player | `game.adminId` set to null; no event | No eligible player |
| 8 | Admin reconnects after promotion — NOT re-promoted | original admin reconnects | adminId unchanged (still promoted player) | Reconnect does not restore role |
| 9 | Promotion cascade: new admin also disconnects | first promoted player disconnects | second `admin_transferred` fires; next player promoted | Cascade works |

### Step 2 — Client admin controls and notification

**File:** `client/src/components/AdminTransfer.test.tsx` + `client/src/components/AdminControls.promotion.test.tsx`

| # | Test | Setup | Action | Expected | What it proves |
|---|------|-------|--------|----------|----------------|
| 10 | New admin sees admin buttons appear | `myPlayerId=X`, receive `admin_transferred` with `newAdminId=X` | — | admin buttons visible | Controls appear |
| 11 | Former admin loses buttons after promotion | `myPlayerId=admin`, receive `admin_transferred` to someone else | — | no admin buttons | Role revoked in UI |
| 12 | Notification appears for all players | receive `admin_transferred` | — | toast notification visible | Notification shown |
| 13 | Notification shows correct name | `admin_transferred: { newAdminName: "Sam" }` | — | "Sam is now the admin" in notification | Name correct |
| 14 | Notification auto-dismisses in 3 seconds | receive `admin_transferred`, advance timers 3s | — | notification no longer in DOM | Auto-dismiss works |
| 15 | Admin buttons visible on waiting room after promotion | on waiting room screen, receive promotion | — | Start Game button appears | Correct screen |
| 16 | Admin buttons visible on between-rounds after promotion | on between-rounds screen, receive promotion | — | Start Next Round appears | Correct screen |
