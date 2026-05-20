import type { LeaderboardEntry } from "shared/types/game";

const MEDALS = ["🥇", "🥈", "🥉"];
const MIN_GAP = 2;

export function generateResultsText(
  leaderboard: LeaderboardEntry[],
  gameId: string,
  rounds: number,
): string {
  const maxNameLen = Math.max(...leaderboard.map((e) => e.name.length), 0);
  const maxScoreLen = Math.max(...leaderboard.map((e) => String(e.score).length), 0);

  const playerLines = leaderboard.map((entry, i) => {
    const isMedal = i < 3;
    const prefix = isMedal ? `${MEDALS[i]} ` : "   ";
    // Emoji is 2 JS chars so "🥇 " and "   " are both 3 chars — same namePad for all rows.
    const namePad = maxNameLen + MIN_GAP;
    const scoreStr = String(entry.score).padStart(maxScoreLen);
    return `${prefix}${entry.name.padEnd(namePad)}${scoreStr}`;
  });

  return [
    `quordle// · ${rounds} rounds`,
    ...playerLines,
    `play.app/${gameId}`,
  ].join("\n");
}
