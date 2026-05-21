import type { PodiumEntry } from "shared/types/game";

type PodiumProps = {
  entries: PodiumEntry[];
};

const rankStyles: Record<number, string> = {
  1: "bg-yellow-400 text-yellow-900 scale-110 shadow-lg",
  2: "bg-gray-300 text-gray-800",
  3: "bg-amber-600 text-amber-100",
};

export function Podium({ entries }: PodiumProps) {
  // Visual podium order: 2nd on left, 1st in centre, 3rd on right
  const displayOrder = [2, 1, 3];
  const ordered = displayOrder
    .map((rank) => entries.find((e) => e.rank === rank))
    .filter((e): e is PodiumEntry => e !== undefined);

  return (
    <div className="flex items-end justify-center gap-4">
      {ordered.map((entry) => (
        <div
          key={entry.rank}
          data-testid="podium-slot"
          data-rank={entry.rank}
          className={`flex flex-col items-center p-6 rounded-lg ${rankStyles[entry.rank] ?? "bg-gray-700 text-gray-100"}`}
        >
          <span className="text-2xl font-bold">{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}</span>
          <span className="font-semibold mt-2">{entry.name}</span>
          <span className="text-lg font-bold mt-1">{entry.score}</span>
        </div>
      ))}
    </div>
  );
}
