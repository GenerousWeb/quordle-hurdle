import type { LeaderboardEntry, PodiumEntry } from "shared/types/game";
import { Podium } from "../components/Podium";
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
  const sorted = [...finalLeaderboard].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-100 mb-1">Game over</h1>
      {rounds !== undefined && (
        <p className="text-gray-400 mb-8">Final standings after {rounds} rounds.</p>
      )}
      <Podium entries={podium} />
      <table className="w-full mt-8">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-700">
            <th className="text-left pb-2 w-8">#</th>
            <th className="text-left pb-2">Player</th>
            <th className="text-right pb-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, idx) => {
            const isMe = entry.playerId === myPlayerId;
            return (
              <tr
                key={entry.playerId}
                data-testid="leaderboard-row"
                data-player-id={entry.playerId}
                data-highlighted={isMe ? "true" : undefined}
                className={
                  isMe
                    ? "font-bold bg-indigo-900/60 text-white"
                    : "text-gray-300 border-b border-gray-800"
                }
              >
                <td className="py-3 px-1">{idx + 1}</td>
                <td className="py-3 px-1">
                  {entry.name}
                  {isMe && <span className="ml-1 text-xs text-indigo-400">(you)</span>}
                </td>
                <td className="py-3 px-1 text-right">{entry.score}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {gameId !== undefined && rounds !== undefined && (
        <CopyResultsButton leaderboard={finalLeaderboard} gameId={gameId} rounds={rounds} />
      )}
      {isAdmin && (
        <div className="mt-8 flex justify-end">
          <button
            data-testid="play-again-button"
            onClick={onRestartGame}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Play again →
          </button>
        </div>
      )}
    </div>
  );
}
