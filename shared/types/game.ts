export type GameConfig = {
  maxPlayers: number;
  rounds: number;
  timeLimitSeconds: number;
};

export type Player = {
  playerId: string;
  name: string;
  role: "admin" | "player";
  isConnected: boolean;
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

export type RoundSummary = {
  roundNumber: number;
  words: string[];
  leaderboard: Array<{
    playerId: string;
    name: string;
    roundScore: number;
    totalScore: number;
  }>;
};

export type LeaderboardEntry = {
  playerId: string;
  name: string;
  score: number;
  boardsSolved: number;
};

export type PodiumEntry = {
  rank: number;
  name: string;
  score: number;
};
