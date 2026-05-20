import type { LeaderboardEntry, PodiumEntry } from "shared/types/game";
import { Podium } from "../components/Podium";
import { LeaderboardTable } from "../components/LeaderboardTable";
import { CopyResultsButton } from "../components/CopyResultsButton";

type EndGameProps = {
  podium: PodiumEntry[];
  finalLeaderboard: LeaderboardEntry[];
  myPlayerId: string;
  isAdmin: boolean;
  gameId?: string;
  rounds?: number;
  onRestartGame?: () => void;
};

export function EndGame({ podium, finalLeaderboard, myPlayerId, isAdmin, gameId, rounds, onRestartGame }: EndGameProps) {
  const tableEntries = finalLeaderboard.map((e) => ({
    playerId: e.playerId,
    name: e.name,
    roundScore: 0,
    totalScore: e.score,
  }));

  return (
    <div>
      <h1>Game Over</h1>
      <Podium entries={podium} />
      <LeaderboardTable entries={tableEntries} myPlayerId={myPlayerId} />
      {gameId !== undefined && rounds !== undefined && (
        <CopyResultsButton leaderboard={finalLeaderboard} gameId={gameId} rounds={rounds} />
      )}
      {isAdmin && (
        <button data-testid="play-again-button" onClick={onRestartGame}>
          Play Again
        </button>
      )}
    </div>
  );
}
