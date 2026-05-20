import { createStore } from "zustand/vanilla";
import type { GameConfig, Player } from "shared/types/game";

type GameStore = {
  players: Player[];
  gameStatus: string;
  settings: GameConfig | null;

  handleGameStateUpdate: (data: {
    players: Player[];
    status: string;
    settings: GameConfig;
  }) => void;
};

export const gameStore = createStore<GameStore>((set) => ({
  players: [],
  gameStatus: "",
  settings: null,

  handleGameStateUpdate: ({ players, status, settings }) => {
    set({ players, gameStatus: status, settings });
  },
}));

export type { GameStore };
