import type { TileResult } from "shared/types/game";

export function calculateScore(
  result: TileResult[],
  isSolved: boolean,
  isEarlyFinish: boolean,
  secondsRemaining: number,
): number {
  const tileScore = result.reduce(
    (s, r) => s + (r === "green" ? 3 : r === "yellow" ? 1 : 0),
    0,
  );
  const solveBonus = isSolved ? 10 : 0;
  const earlyBonus = isEarlyFinish ? Math.floor(secondsRemaining / 10) : 0;
  return tileScore + solveBonus + earlyBonus;
}
