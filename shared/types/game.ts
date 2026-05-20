export type GameConfig = {
  maxPlayers: number;
  rounds: number;
  timeLimitSeconds: number;
};

export type TileResult = "green" | "yellow" | "grey";

export type TileState = "empty" | "typing" | "green" | "yellow" | "grey";

export type BoardStatus = "unsolved" | "solved" | "failed" | "locked";

export type GuessRow = {
  word: string;
  result: TileResult[];
};

export type BoardState = {
  status: BoardStatus;
  targetWord: string | null;
  guesses: GuessRow[];
};
