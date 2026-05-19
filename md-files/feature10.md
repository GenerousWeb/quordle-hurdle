# F10 · No-Repeat Words Per Game

## Summary

Words are never reused across rounds within a single game session. Before each round, the server draws 4 words from the answer pool excluding any words used in previous rounds of this game. This is enforced via a Redis Set (`usedWords`) per game. The feature is entirely transparent to players — they simply never encounter the same word twice. On `restartGame`, the `usedWords` set is cleared.

---

## Goals

- No word can appear in two different rounds of the same game session
- The enforcement is server-side and cannot be bypassed
- The full word pool remains available for new games (cross-game repetition is acceptable for MVP)
- The feature is invisible to players — no UI, no messaging

---

## Assumptions

- The answer word pool contains ~2,500 curated 5-letter words, loaded at server startup
- Maximum words consumed per game: 5 rounds × 4 boards = 20 words. Depletion is not a real-world concern
- Cross-game word repetition is acceptable — `usedWords` is scoped per `gameId`, not globally
- `SDIFF` between the full pool and `usedWords` is performed in Redis for O(N) deduplication; the result set is always large enough to sample 4 words from
- Word selection is uniformly random from the remaining pool (no difficulty weighting for MVP)
- `shuffleWords` (F8) re-draws but still excludes `usedWords`

---

## Edge cases

- **`restartGame` clears `usedWords`** — the new game gets the full pool; words from previous rounds are eligible again
- **`shuffleWords` called multiple times before a round** — each shuffle re-draws 4 from the remaining pool; previously drawn but not-yet-used words from this shuffle cycle go back into consideration (only `usedWords` from confirmed rounds is excluded)
- **Theoretical exhaustion** — if somehow >2,500 words were used (impossible with current config), the SDIFF returns empty set; server falls back to sampling from full pool with a warning log; this is a defensive guard only
- **Concurrent round starts on same game** — Redis SADD is atomic; race condition on `usedWords` is not possible

---

## Technical design

### Redis structure

```
game:{gameId}:usedWords   — Redis Set of all words used in confirmed rounds
```

### Word selection algorithm

```
pool = full answer word Set (loaded at startup, ~2,500 words)
usedWords = SMEMBERS game:{gameId}:usedWords

available = pool - usedWords   // set difference
selectedWords = sample(available, 4)  // uniform random

// After round_started fires:
SADD game:{gameId}:usedWords ...selectedWords
```

### Reset on restartGame

```
DEL game:{gameId}:usedWords
```

---

## Implementation steps

### Step 1 — Word selection with deduplication

**Scope:** Implement the word selection function that draws 4 words from the pool excluding `usedWords`. Pure function unit-testable in isolation plus Redis integration.

**What to build:**
- `selectWords(pool: Set<string>, usedWords: Set<string>, count: number): string[]` — pure function
- Fastify/game engine integration: before each `round_started`, call `selectWords`, then `SADD` the result to Redis
- `restartGame` handler: `DEL game:{id}:usedWords`

**Done when:**
- `selectWords` never returns a word in `usedWords`
- `selectWords` returns exactly `count` distinct words
- Words added to `usedWords` after round starts
- `restartGame` clears `usedWords`

---

### Step 2 — Integration: multi-round deduplication verified end-to-end

**Scope:** Verify through an integration test that across multiple rounds of the same game, no word repeats.

**What to build:**
- Integration test: run 3 rounds in a seeded game; collect all 12 words; assert all 12 are distinct
- Verify `shuffleWords` also respects `usedWords`

**Done when:**
- No repeats across 3 rounds in integration test
- `shuffleWords` produces words not in `usedWords`
- `restartGame` allows previously used words in new rounds

---

## Test plan

### Step 1 — Word selection unit tests

**File:** `server/src/game/selectWords.test.ts`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 1 | Returns exactly 4 words | pool=2500, usedWords=empty | array length = 4 | Count correct |
| 2 | No returned word is in usedWords | usedWords has 8 known words | no overlap with usedWords | Deduplication enforced |
| 3 | All returned words are distinct | any call | no duplicates in result | Internal uniqueness |
| 4 | All returned words are in pool | any call | every result word ∈ pool | Source constraint |
| 5 | Works with 0 usedWords | usedWords=empty | 4 words returned normally | Empty set case |
| 6 | Works with large usedWords (16 used) | usedWords has 16 words | 4 new words returned, none in usedWords | Heavy use case |
| 7 | Defensive fallback when pool nearly exhausted | pool=5, usedWords=3 | returns remaining 2 without error | Exhaustion guard |

### Step 2 — Integration: multi-round deduplication

**File:** `server/src/game/wordDedup.integration.test.ts`

| # | Test | Setup | Expected | What it proves |
|---|------|-------|----------|----------------|
| 8 | No word repeats across 3 rounds | run 3 rounds in test game | all 12 words distinct | Cross-round dedup |
| 9 | `restartGame` allows previously used words | restart after 2 rounds; run 2 more rounds | words from pre-restart rounds may reappear | Reset works correctly |
| 10 | `shuffleWords` respects usedWords | shuffle after round 1; inspect new words | no word from round 1 in shuffled set | Shuffle respects history |
| 11 | `usedWords` Redis key cleared on restart | `restartGame` | `SCARD game:{id}:usedWords` = 0 | Redis reset confirmed |
