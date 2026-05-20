import { OpponentCard } from "./OpponentCard";
import type { LeaderboardEntry } from "shared/types/game";

type Opponent = LeaderboardEntry & { isConnected: boolean };

type OpponentStripProps = {
  opponents: Opponent[];
  myPlayerId: string;
};

export function OpponentStrip({ opponents, myPlayerId }: OpponentStripProps) {
  const filtered = opponents.filter((o) => o.playerId !== myPlayerId);

  if (filtered.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap justify-center" data-testid="opponent-strip">
      {filtered.map((opponent) => (
        <OpponentCard
          key={opponent.playerId}
          name={opponent.name}
          score={opponent.score}
          boardsSolved={opponent.boardsSolved}
          isConnected={opponent.isConnected}
        />
      ))}
    </div>
  );
}
