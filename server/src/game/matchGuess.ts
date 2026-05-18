import type { TileResult } from "shared/types/game";

export function matchGuess(guess: string, target: string): TileResult[] {
  const g = guess.toUpperCase();
  const t = target.toUpperCase();

  const result: TileResult[] = ["grey", "grey", "grey", "grey", "grey"];
  const targetUsed: boolean[] = [false, false, false, false, false];

  // Pass 1: identify exact (green) matches and consume those target positions
  for (let i = 0; i < 5; i++) {
    if (g[i] === t[i]) {
      result[i] = "green";
      targetUsed[i] = true;
    }
  }

  // Pass 2: identify misplaced (yellow) matches from unconsumed target positions
  for (let i = 0; i < 5; i++) {
    if (result[i] === "green") continue;
    for (let j = 0; j < 5; j++) {
      if (targetUsed[j]) continue;
      if (g[i] === t[j]) {
        result[i] = "yellow";
        targetUsed[j] = true;
        break;
      }
    }
  }

  return result;
}
