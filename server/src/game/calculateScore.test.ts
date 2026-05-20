import { describe, it, expect } from "vitest";
import { calculateScore } from "./calculateScore";
import type { TileResult } from "shared/types/game";

describe("calculateScore", () => {
  it("1: all green on one board scores 15 tile points + 10 solve bonus = 25", () => {
    const result: TileResult[] = ["green", "green", "green", "green", "green"];
    expect(calculateScore(result, true, false, 0)).toBe(25);
  });

  it("2: mixed result (2 green, 2 yellow, 1 grey) scores 6 + 2 = 8", () => {
    const result: TileResult[] = ["green", "green", "yellow", "yellow", "grey"];
    expect(calculateScore(result, false, false, 0)).toBe(8);
  });

  it("3: all grey scores 0", () => {
    const result: TileResult[] = ["grey", "grey", "grey", "grey", "grey"];
    expect(calculateScore(result, false, false, 0)).toBe(0);
  });

  it("4: all yellow scores 5", () => {
    const result: TileResult[] = ["yellow", "yellow", "yellow", "yellow", "yellow"];
    expect(calculateScore(result, false, false, 0)).toBe(5);
  });

  it("5: solve bonus not added when isSolved is false (4 green 1 grey = 12, no +10)", () => {
    const result: TileResult[] = ["green", "green", "green", "green", "grey"];
    expect(calculateScore(result, false, false, 0)).toBe(12);
  });

  it("6: early finish bonus floor(14/10) = 1 when isEarlyFinish=true and 14s remaining", () => {
    const result: TileResult[] = ["green", "green", "green", "green", "green"];
    // 15 tile + 10 solve + floor(14/10)=1 = 26
    expect(calculateScore(result, true, true, 14)).toBe(26);
  });

  it("7: early finish bonus is 0 when 0 seconds remaining", () => {
    const result: TileResult[] = ["green", "green", "green", "green", "green"];
    // 15 + 10 + floor(0/10)=0 = 25
    expect(calculateScore(result, true, true, 0)).toBe(25);
  });

  it("8: early finish bonus floor(100/10) = 10 when 100s remaining", () => {
    const result: TileResult[] = ["green", "green", "green", "green", "green"];
    // 15 + 10 + floor(100/10)=10 = 35
    expect(calculateScore(result, true, true, 100)).toBe(35);
  });

  it("9: early finish bonus not added when isEarlyFinish is false (even with secondsRemaining>0)", () => {
    const result: TileResult[] = ["green", "green", "green", "green", "green"];
    expect(calculateScore(result, true, false, 50)).toBe(25);
  });

  it("10: totalScoreDelta is sum across boards (8 + 4 + 0 = 12)", () => {
    // Board 1: 2 green + 2 yellow + 1 grey = 8
    const b1 = calculateScore(
      ["green", "green", "yellow", "yellow", "grey"],
      false,
      false,
      0,
    );
    // Board 2: 1 green + 1 yellow + 3 grey = 4
    const b2 = calculateScore(
      ["green", "yellow", "grey", "grey", "grey"],
      false,
      false,
      0,
    );
    // Board 3: all grey = 0
    const b3 = calculateScore(
      ["grey", "grey", "grey", "grey", "grey"],
      false,
      false,
      0,
    );
    expect(b1 + b2 + b3).toBe(12);
  });
});
