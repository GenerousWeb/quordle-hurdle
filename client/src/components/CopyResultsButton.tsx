import { useState } from "react";
import type { LeaderboardEntry } from "shared/types/game";
import { generateResultsText } from "../utils/generateResultsText";

type Props = {
  leaderboard: LeaderboardEntry[];
  gameId: string;
  rounds: number;
};

export function CopyResultsButton({ leaderboard, gameId, rounds }: Props) {
  const [copied, setCopied] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  async function handleClick() {
    const text = generateResultsText(leaderboard, gameId, rounds);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setFallbackText(text);
    }
  }

  return (
    <div>
      <button data-testid="copy-results-button" onClick={handleClick}>
        {copied ? "Copied!" : "Copy results"}
      </button>
      {fallbackText !== null && (
        <textarea
          data-testid="copy-results-fallback"
          readOnly
          defaultValue={fallbackText}
          ref={(el) => el?.select()}
        />
      )}
    </div>
  );
}
