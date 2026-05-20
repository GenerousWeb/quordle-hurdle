export type RoundEndedEntry = {
  playerId: string;
  name: string;
  roundScore: number;
  totalScore: number;
};

export type RoundEndedPayload = {
  roundNumber: number;
  words: string[];
  leaderboard: RoundEndedEntry[];
};

export function buildRoundEndedPayload(
  roundNumber: number,
  words: string[],
  playerData: Array<{
    playerId: string;
    name: string;
    totalScore: number;
    roundStartScore: number;
  }>,
): RoundEndedPayload {
  const leaderboard = playerData
    .map((p) => ({
      playerId: p.playerId,
      name: p.name,
      roundScore: p.totalScore - p.roundStartScore,
      totalScore: p.totalScore,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  return { roundNumber, words, leaderboard };
}
