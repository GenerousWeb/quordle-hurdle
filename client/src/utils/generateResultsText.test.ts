import { describe, it, expect } from "vitest";
import { generateResultsText } from "./generateResultsText";
import type { LeaderboardEntry } from "shared/types/game";

const LEADERBOARD_4: LeaderboardEntry[] = [
  { playerId: "a", name: "Alex", score: 317, boardsSolved: 4 },
  { playerId: "b", name: "Sam", score: 252, boardsSolved: 3 },
  { playerId: "c", name: "Jordan", score: 185, boardsSolved: 2 },
  { playerId: "d", name: "Riley", score: 42, boardsSolved: 1 },
];

describe("generateResultsText", () => {
  it("1: top 3 get medal emojis", () => {
    const result = generateResultsText(LEADERBOARD_4, "abc123", 3);
    expect(result).toContain("🥇");
    expect(result).toContain("🥈");
    expect(result).toContain("🥉");
  });

  it("2: 4th+ player gets 3-space indent instead of medal", () => {
    const result = generateResultsText(LEADERBOARD_4, "abc123", 3);
    const lines = result.split("\n");
    const rileyLine = lines.find((l) => l.includes("Riley"));
    expect(rileyLine).toBeDefined();
    expect(rileyLine).not.toContain("🥇");
    expect(rileyLine).not.toContain("🥈");
    expect(rileyLine).not.toContain("🥉");
    expect(rileyLine?.startsWith("   ")).toBe(true);
  });

  it("3: game header includes round count", () => {
    const result = generateResultsText(LEADERBOARD_4, "abc123", 3);
    expect(result).toContain("quordle// · 3 rounds");
  });

  it("4: game link is included with gameId", () => {
    const result = generateResultsText(LEADERBOARD_4, "abc123", 3);
    expect(result).toContain("play.app/abc123");
  });

  it("5: 1-player game shows only 1st medal", () => {
    const leaderboard: LeaderboardEntry[] = [
      { playerId: "a", name: "Solo", score: 100, boardsSolved: 4 },
    ];
    const result = generateResultsText(leaderboard, "gid", 2);
    expect(result).toContain("🥇");
    expect(result).not.toContain("🥈");
    expect(result).not.toContain("🥉");
  });

  it("6: 2-player game shows 1st and 2nd medals only", () => {
    const leaderboard: LeaderboardEntry[] = [
      { playerId: "a", name: "Alice", score: 200, boardsSolved: 3 },
      { playerId: "b", name: "Bob", score: 100, boardsSolved: 1 },
    ];
    const result = generateResultsText(leaderboard, "gid", 1);
    expect(result).toContain("🥇");
    expect(result).toContain("🥈");
    expect(result).not.toContain("🥉");
  });

  it("7: score column is right-aligned consistently", () => {
    const result = generateResultsText(LEADERBOARD_4, "abc123", 3);
    const lines = result.split("\n");
    const scoreLine317 = lines.find((l) => l.includes("Alex"));
    const scoreLine42 = lines.find((l) => l.includes("Riley"));
    expect(scoreLine317).toBeDefined();
    expect(scoreLine42).toBeDefined();
    // Both lines should end with aligned scores — verify by checking the scores appear at the same column
    const idx317 = scoreLine317!.lastIndexOf("317");
    const idx42 = scoreLine42!.lastIndexOf("42");
    // The end of "317" and end of "42" should be at the same position
    expect(idx317 + 3).toBe(idx42 + 2);
  });
});
