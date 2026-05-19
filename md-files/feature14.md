# F14 · Share Results

## Summary

On the end game screen, any player can tap "Copy Results" to copy a formatted text summary to their clipboard. The summary is suitable for pasting into a group chat. No modal, no confirmation, no server call — the copy is silent and immediate. The format includes the game name, round count, and ranked results with medal emojis for the top 3.

---

## Goals

- One tap to copy a shareable summary — zero friction
- The copied text is readable in any chat app without special formatting
- The feature is available to all players, not just the admin

---

## Assumptions

- The Clipboard API (`navigator.clipboard.writeText`) is used. If unavailable, the text is shown in a selectable `<textarea>` fallback
- The results text is constructed entirely client-side from data already in the Zustand store (`finalLeaderboard[]`, `gameConfig`)
- No server call is needed
- "Copy Results" is a single button — no preview, no edit, no share sheet

---

## Edge cases

- **Clipboard API unavailable** (older browser, non-HTTPS) — show a `<textarea>` with the text pre-selected so the player can manually copy
- **0 players in leaderboard** — still renders; shows only game header line
- **Player names contain special characters** — shown as-is; no escaping needed for plain text
- **Button clicked twice quickly** — second click re-copies same text; no error

---

## Technical design

### Results text format

```
quordle// · 3 rounds
🥇 Alex    317
🥈 Sam     252
🥉 Jordan  185
   Riley    42
play.app/{gameId}
```

Rules: top 3 get medal emoji; remaining players have 3-space indent. Scores right-aligned using spaces for monospaced alignment.

---

## Implementation steps

### Step 1 — Results text generator

**Scope:** Pure function that generates the results string from leaderboard and config data. No UI.

**What to build:**
- `generateResultsText(leaderboard: LeaderboardEntry[], gameId: string, rounds: number): string` — pure function
- Medal emojis for top 3; indent for the rest
- Score column right-aligned with space padding

**Done when:**
- Top 3 get correct medals; others get indent
- Format matches expected output for 1, 2, 3, and 4+ players
- Score column is aligned

---

### Step 2 — Copy button with clipboard and fallback

**Scope:** "Copy Results" button on the end game screen. Writes to clipboard; falls back to `<textarea>` if Clipboard API unavailable.

**What to build:**
- `CopyResultsButton` component: calls `generateResultsText`, writes to `navigator.clipboard.writeText`
- On success: brief "Copied!" text state on button for 1.5 seconds
- On clipboard failure: renders `<textarea>` with text pre-selected

**Done when:**
- Successful copy shows "Copied!" feedback then reverts to "Copy results"
- Fallback `<textarea>` appears when clipboard unavailable
- Button available to all players (not admin-only)

---

## Test plan

### Step 1 — Results text generator

**File:** `client/src/utils/generateResultsText.test.ts`

| # | Test | Input | Expected output | What it proves |
|---|------|-------|-----------------|----------------|
| 1 | Top 3 get medal emojis | 4-player leaderboard | 🥇, 🥈, 🥉 on first 3 rows | Medal assignment |
| 2 | 4th+ player gets indent | 4-player leaderboard | 4th row starts with spaces | Non-medal indent |
| 3 | Game header includes round count | `rounds=3` | "quordle// · 3 rounds" in output | Header format |
| 4 | Game link included | `gameId="abc"` | "play.app/abc" in output | Link included |
| 5 | 1-player game — only 1st medal | 1-player leaderboard | 🥇 on only row | Under-3 handling |
| 6 | 2-player game — 1st and 2nd medals only | 2 players | 🥇 and 🥈; no 🥉 | Exact medal count |
| 7 | Score column formatted consistently | scores 317 and 42 | scores column aligned | Alignment |

### Step 2 — Copy button

**File:** `client/src/components/CopyResultsButton.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 8 | Button present on end game screen | render EndGame | "Copy results" button visible | Button rendered |
| 9 | Click calls clipboard.writeText | mock clipboard, click | `writeText` called with correct text | Clipboard called |
| 10 | "Copied!" feedback shown after click | mock clipboard success, click | button text changes to "Copied!" | Success feedback |
| 11 | Button reverts after 1.5 seconds | advance fake timers 1500ms | button text back to "Copy results" | Revert timing |
| 12 | Fallback textarea appears when clipboard unavailable | mock clipboard.writeText throws, click | `<textarea>` with text appears | Fallback works |
| 13 | Button visible to non-admin | `isAdmin=false` | button still present | Available to all |
