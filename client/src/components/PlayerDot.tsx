type PlayerDotProps = {
  name: string;
  score: number;
  isMe: boolean;
};

export function PlayerDot({ name, score, isMe }: PlayerDotProps) {
  return (
    <div
      data-me={isMe ? "true" : undefined}
      className={`flex flex-col items-center gap-1 ${isMe ? "ring-2 ring-indigo-400 rounded-full" : ""}`}
    >
      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </div>
      <span data-testid="player-score-badge" className="text-xs text-gray-300 font-mono">
        {score}
      </span>
    </div>
  );
}
