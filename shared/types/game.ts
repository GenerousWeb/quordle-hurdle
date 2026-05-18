export type TileResult = "green" | "yellow" | "grey";

export type BoardStatus = "active" | "idle" | "solved" | "failed" | "locked";

export type GuessRow = {
  word: string;
  result: TileResult[];
};

export type BoardState = {
  status: BoardStatus;
  targetWord: string | null;
  guesses: GuessRow[];
  currentInput: string;
  attemptCount: number;
  submitting: boolean;
};
