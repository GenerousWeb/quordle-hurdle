# F5 · Game Creation

## Summary

The admin creates a new game session by filling in a configuration form: their display name, max players (2–20), number of rounds (1–5), and time per round. Fixed settings (4 boards, 5-letter words, 9 attempts) are shown as read-only labels. On submit, the server creates the game, returns a `gameId` and invite link, and redirects the admin to the waiting room. All validation is lightweight — the form enforces ranges and required fields.

---

## Goals

- Admin can configure a game in one screen with sensible defaults
- The form clearly distinguishes configurable settings from fixed ones
- Submitting the form creates a real game session and returns a usable invite link
- The admin is immediately placed in the waiting room after creation
- The form is usable on mobile (375px) and desktop

---

## Assumptions

- The admin is automatically assigned as the game creator — no explicit role selection
- `gameId` is a server-generated opaque string (UUID or short random ID); the client never generates it
- The invite link format is `https://game.app/play/{gameId}` — constructed server-side and returned in the API response
- Default values are pre-filled: maxPlayers=10, rounds=3, timeLimitSeconds=120
- Name field max length is 20 characters, enforced client-side
- No authentication required — the admin is identified by their session cookie set on game creation

---

## Edge cases

- **Name field submitted empty** — inline error shown; form not submitted
- **Name field with only whitespace** — trimmed before validation; treated as empty; error shown
- **Name longer than 20 characters** — input is capped at 20 characters; no submission with over-length name
- **Slider set to boundary values** — `maxPlayers=2`, `maxPlayers=20`, `rounds=1`, `rounds=5` are all valid
- **Server returns an error on `POST /game/create`** — show an inline error message; form remains intact
- **Double-tap submit** — button disabled after first click; second submit ignored
- **Navigating away mid-form** — no partial game created; server only creates on explicit POST

---

## Technical design

### API

```
POST /game/create
Body: { adminName, maxPlayers, rounds, timeLimitSeconds }
Response 201: { gameId, inviteLink }
Response 400: { error: "invalid_config" }
```

### Session

On successful game creation, the server sets an httpOnly session cookie: `{ playerId, gameId, role: "admin" }`. This cookie is used by subsequent WebSocket connections to identify the admin.

---

## Implementation steps

### Step 1 — Creation form UI with validation

**Scope:** Build the game creation form as a controlled React component with full validation. No API call yet — just the form, its state, and inline error handling.

**What to build:**
- `CreateGameForm` component with controlled inputs: name (text), maxPlayers (range 2–20), rounds (range 1–5), timeLimitSeconds (select)
- Fixed settings displayed as non-interactive tags
- Name validation: required, non-empty after trim, max 20 chars
- Submit button disabled while validation fails or submission in-flight
- `onSubmit` callback prop (wired to API in Step 2)

**Done when:**
- Empty name shows inline error on submit attempt
- Whitespace-only name shows error
- Slider values render correctly with live readout
- Form renders correctly at 375px and 1280px

---

### Step 2 — API integration and redirect to waiting room

**Scope:** Wire form submission to `POST /game/create`, handle response and errors, redirect to waiting room on success.

**What to build:**
- `POST /game/create` Fastify route handler
- On success: set session cookie, return `{ gameId, inviteLink }`, redirect client to `/wait/{gameId}`
- On network/server error: show inline error; re-enable submit button
- Button disabled during in-flight request

**Done when:**
- Successful submission creates game in Redis, returns gameId and link
- Admin is redirected to `/wait/{gameId}`
- Server error shows inline error without crashing
- Double-tap submit is prevented

---

## Test plan

### Step 1 — Form UI

**File:** `client/src/components/CreateGameForm.test.tsx`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Empty name shows error on submit | submit with empty name | error message visible | Required field validation |
| 2 | Whitespace name shows error | name=" ", submit | error shown | Trim before validation |
| 3 | Valid name clears error | type valid name after error | error disappears | Error recovery |
| 4 | Name capped at 20 characters | type 25 characters | input shows only 20 | Max length enforced |
| 5 | maxPlayers slider default is 10 | render | slider value = 10 | Default value correct |
| 6 | Slider readout updates on drag | drag maxPlayers slider | readout matches slider value | Live readout works |
| 7 | rounds slider range is 1–5 | check slider attributes | min=1, max=5 | Range correct |
| 8 | Fixed settings are not interactive | render | board count has no input | Fixed settings read-only |
| 9 | Submit button enabled with valid form | valid name entered | button not disabled | Enabled state correct |
| 10 | Submit button disabled during submission | set submitting state | button disabled | Double-submit prevented |

### Step 2 — API integration

**File:** `server/src/routes/createGame.test.ts` (integration)

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 11 | POST /game/create returns 201 with gameId | valid body | 201, body has gameId and inviteLink | Happy path |
| 12 | gameId is unique per request | two POST requests | different gameIds | Uniqueness enforced |
| 13 | Session cookie set on success | POST /game/create | response has Set-Cookie header | Session created |
| 14 | POST with missing name returns 400 | no adminName | 400 error | Server-side validation |
| 15 | POST with out-of-range maxPlayers returns 400 | maxPlayers=21 | 400 error | Range enforced server-side |
| 16 | Game stored in Redis after creation | POST /game/create | HGET game:{id} returns game object | Persistence correct |
| 17 | Network error shows inline form error | mock server failure | inline error visible | Error handling correct |
