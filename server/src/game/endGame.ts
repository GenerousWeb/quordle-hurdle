import type { PodiumEntry } from "shared/types/game";

export type EndGamePayload = {
  podium: PodiumEntry[];
  finalLeaderboard: Array<{
    playerId: string;
    name: string;
    score: number;
    boardsSolved: number;
  }>;
};

export function buildGameEndedPayload(
  playerData: Array<{
    playerId: string;
    name: string;
    totalScore: number;
    boardsSolved: number;
  }>,
): EndGamePayload {
  const sorted = [...playerData].sort((a, b) => b.totalScore - a.totalScore);

  const podium: PodiumEntry[] = sorted.slice(0, 3).map((p, i) => ({
    rank: i + 1,
    name: p.name,
    score: p.totalScore,
  }));

  const finalLeaderboard = sorted.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    score: p.totalScore,
    boardsSolved: p.boardsSolved,
  }));

  return { podium, finalLeaderboard };
}
