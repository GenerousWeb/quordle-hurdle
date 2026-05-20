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
    <table className="w-full">
      <thead>
        <tr>
          <th className="text-left">Rank</th>
          <th className="text-left">Name</th>
          <th className="text-right">Round</th>
          <th className="text-right">Total</th>
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
              className={isMe ? "font-bold bg-yellow-50" : ""}
            >
              <td>{rank + 1}</td>
              <td>{entry.name}</td>
              <td className="text-right">+{entry.roundScore}</td>
              <td className="text-right">{entry.totalScore}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
