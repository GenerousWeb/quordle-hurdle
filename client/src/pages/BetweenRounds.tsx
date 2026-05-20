import type { RoundSummary } from "shared/types/game";
import { LeaderboardTable } from "../components/LeaderboardTable";

type BetweenRoundsProps = {
  roundSummary: RoundSummary;
  myPlayerId: string;
  isAdmin: boolean;
  isLastRound: boolean;
  onStartNextRound?: () => void;
  onEndGame?: () => void;
};

export function BetweenRounds({
  roundSummary,
  myPlayerId,
  isAdmin,
  isLastRound,
  onStartNextRound,
  onEndGame,
}: BetweenRoundsProps) {
  const { roundNumber, words, leaderboard } = roundSummary;

  return (
    <div>
      <h2>Round {roundNumber} Summary</h2>

      <div data-testid="word-grid" className="grid grid-cols-2 gap-4">
        {words.map((word, i) => (
          <div key={i} data-testid="word-card" className="p-4 border rounded text-center">
            <div className="text-sm text-gray-500">Board {i + 1}</div>
            <div className="text-xl font-bold">{word.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <LeaderboardTable entries={leaderboard} myPlayerId={myPlayerId} />

      <div className="mt-6">
        {isAdmin ? (
          isLastRound ? (
            <button data-testid="end-game-button" onClick={onEndGame}>
              End Game
            </button>
          ) : (
            <button data-testid="start-next-round-button" onClick={onStartNextRound}>
              Start Next Round
            </button>
          )
        ) : (
          <p data-testid="waiting-message">Waiting for admin…</p>
        )}
      </div>
    </div>
  );
}
