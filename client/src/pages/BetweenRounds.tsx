import type { RoundSummary } from "shared/types/game";

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
  const sorted = [...leaderboard].sort((a, b) => b.totalScore - a.totalScore);

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

      <table data-testid="leaderboard" className="w-full mt-6">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Round</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, rank) => (
            <tr
              key={entry.playerId}
              data-testid="leaderboard-row"
              data-player-id={entry.playerId}
              data-highlighted={entry.playerId === myPlayerId ? "true" : undefined}
              className={entry.playerId === myPlayerId ? "font-bold bg-yellow-50" : ""}
            >
              <td>{rank + 1}</td>
              <td>{entry.name}</td>
              <td>+{entry.roundScore}</td>
              <td>{entry.totalScore}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
