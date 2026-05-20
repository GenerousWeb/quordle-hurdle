import { createStore } from "zustand/vanilla";
import type { GameConfig, Player, RoundSummary } from "shared/types/game";

type GameStore = {
  players: Player[];
  gameStatus: string;
  settings: GameConfig | null;
  roundSummary: RoundSummary | null;

  handleGameStateUpdate: (data: {
    players: Player[];
    status: string;
    settings: GameConfig;
  }) => void;
  handleRoundEnded: (data: RoundSummary) => void;
};

export const gameStore = createStore<GameStore>((set) => ({
  players: [],
  gameStatus: "",
  settings: null,
  roundSummary: null,

  handleGameStateUpdate: ({ players, status, settings }) => {
    set({ players, gameStatus: status, settings });
  },

  handleRoundEnded: (data) => {
    set({ roundSummary: data, gameStatus: "between_rounds" });
  },
}));

export type { GameStore };
