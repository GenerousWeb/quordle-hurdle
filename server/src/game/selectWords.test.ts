import { describe, it, expect } from "vitest";
import { selectWords } from "./selectWords";

// Build a pool of N fake 5-char words: "wd000", "wd001", …
function buildPool(size: number): Set<string> {
  return new Set(Array.from({ length: size }, (_, i) => `wd${String(i).padStart(3, "0")}`));
}

describe("selectWords — unit tests", () => {
  it("1: returns exactly 4 words from a large pool", () => {
    const pool = buildPool(2500);
    const result = selectWords(pool, new Set(), 4);
    expect(result).toHaveLength(4);
  });

  it("2: no returned word is in usedWords", () => {
    const pool = buildPool(2500);
    const usedWords = new Set(["wd000", "wd001", "wd002", "wd003", "wd004", "wd005", "wd006", "wd007"]);
    const result = selectWords(pool, usedWords, 4);
    for (const word of result) {
      expect(usedWords.has(word)).toBe(false);
    }
  });

  it("3: all returned words are distinct", () => {
    const pool = buildPool(2500);
    const result = selectWords(pool, new Set(), 4);
    expect(new Set(result).size).toBe(result.length);
  });

  it("4: all returned words are in the pool", () => {
    const pool = buildPool(2500);
    const result = selectWords(pool, new Set(), 4);
    for (const word of result) {
      expect(pool.has(word)).toBe(true);
    }
  });

  it("5: works correctly with empty usedWords", () => {
    const pool = buildPool(100);
    const result = selectWords(pool, new Set(), 4);
    expect(result).toHaveLength(4);
    expect(new Set(result).size).toBe(4);
  });

  it("6: works with 16 usedWords — returns 4 new words not in usedWords", () => {
    const pool = buildPool(2500);
    const usedWords = new Set(
      Array.from({ length: 16 }, (_, i) => `wd${String(i).padStart(3, "0")}`),
    );
    const result = selectWords(pool, usedWords, 4);
    expect(result).toHaveLength(4);
    for (const word of result) {
      expect(usedWords.has(word)).toBe(false);
    }
  });

  it("7: defensive fallback — returns available words without error when pool nearly exhausted", () => {
    const tinyPool = new Set(["wd000", "wd001", "wd002", "wd003", "wd004"]);
    const usedWords = new Set(["wd000", "wd001", "wd002"]);
    const result = selectWords(tinyPool, usedWords, 4);
    // Only 2 words available; returns those 2 without throwing
    expect(result).toHaveLength(2);
    for (const word of result) {
      expect(usedWords.has(word)).toBe(false);
      expect(tinyPool.has(word)).toBe(true);
    }
  });
});
