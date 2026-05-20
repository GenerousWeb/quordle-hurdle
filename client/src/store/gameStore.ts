import { createStore } from "zustand/vanilla";
import type { GameConfig, LeaderboardEntry, Player, RoundSummary } from "shared/types/game";

type GameStore = {
  players: Player[];
  gameStatus: string;
  settings: GameConfig | null;
  roundSummary: RoundSummary | null;
  leaderboard: LeaderboardEntry[];

  handleGameStateUpdate: (data: {
    players: Player[];
    status: string;
    settings: GameConfig;
  }) => void;
  handleRoundEnded: (data: RoundSummary) => void;
  handleLeaderboardUpdate: (data: { leaderboard: LeaderboardEntry[] }) => void;
};

export const gameStore = createStore<GameStore>((set) => ({
  players: [],
  gameStatus: "",
  settings: null,
  roundSummary: null,
  leaderboard: [],

  handleGameStateUpdate: ({ players, status, settings }) => {
    set({ players, gameStatus: status, settings });
  },

  handleRoundEnded: (data) => {
    set({ roundSummary: data, gameStatus: "between_rounds" });
  },

  handleLeaderboardUpdate: ({ leaderboard }) => {
    set({ leaderboard });
  },
}));

export type { GameStore };
