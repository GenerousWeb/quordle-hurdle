type LeaderboardTableEntry = {
  playerId: string;
  name: string;
  roundScore: number;
  totalScore: number;
};

type LeaderboardTableProps = {
  entries: LeaderboardTableEntry[];
  myPlayerId: string;
};

export function LeaderboardTable({ entries, myPlayerId }: LeaderboardTableProps) {
  const sorted = [...entries].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <table className="w-full mt-6">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-gray-400 border-b border-gray-700">
          <th className="text-left pb-2">Rank</th>
          <th className="text-left pb-2">Name</th>
          <th className="text-right pb-2">Round</th>
          <th className="text-right pb-2">Total</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((entry, rank) => {
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
              <td className="py-2 px-1">{rank + 1}</td>
              <td className="py-2 px-1">{entry.name}</td>
              <td className="py-2 px-1 text-right text-green-400">+{entry.roundScore}</td>
              <td className="py-2 px-1 text-right">{entry.totalScore}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
