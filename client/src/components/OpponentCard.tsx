type OpponentCardProps = {
  name: string;
  score: number;
  boardsSolved: number;
  isConnected: boolean;
};

export function OpponentCard({ name, score, boardsSolved, isConnected }: OpponentCardProps) {
  return (
    <div
      data-connected={String(isConnected)}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded bg-gray-800${!isConnected ? " opacity-50" : ""}`}
    >
      <div className={`text-sm font-semibold text-white${!isConnected ? " italic" : ""}`}>
        {name}
      </div>
      <div className="text-xs text-gray-300">{score}</div>
      <div className="flex gap-1 mt-1">
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            data-pip={i < boardsSolved ? "filled" : "empty"}
            className={`w-2 h-2 rounded-sm${i < boardsSolved ? " bg-green-500" : " bg-gray-600"}`}
          />
        ))}
      </div>
    </div>
  );
}
