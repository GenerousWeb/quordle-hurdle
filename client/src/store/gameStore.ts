import { createStore } from "zustand/vanilla";
import type { GameConfig, LeaderboardEntry, Player, PodiumEntry, RoundSummary } from "shared/types/game";

type EndGameData = {
  podium: PodiumEntry[];
  finalLeaderboard: LeaderboardEntry[];
};

type GameStore = {
  players: Player[];
  gameStatus: string;
  settings: GameConfig | null;
  roundSummary: RoundSummary | null;
  leaderboard: LeaderboardEntry[];
  endGameData: EndGameData | null;

  handleGameStateUpdate: (data: {
    players: Player[];
    status: string;
    settings: GameConfig;
  }) => void;
  handleRoundEnded: (data: RoundSummary) => void;
  handleLeaderboardUpdate: (data: { leaderboard: LeaderboardEntry[] }) => void;
  handleGameEnded: (data: EndGameData) => void;
};

export const gameStore = createStore<GameStore>((set) => ({
  players: [],
  gameStatus: "",
  settings: null,
  roundSummary: null,
  leaderboard: [],
  endGameData: null,

  handleGameStateUpdate: ({ players, status, settings }) => {
    set({ players, gameStatus: status, settings });
  },

  handleRoundEnded: (data) => {
    set({ roundSummary: data, gameStatus: "between_rounds" });
  },

  handleLeaderboardUpdate: ({ leaderboard }) => {
    set({ leaderboard });
  },

  handleGameEnded: (data) => {
    set({ endGameData: data, gameStatus: "finished" });
  },
}));

export type { GameStore };
