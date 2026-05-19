import { createStore } from "zustand/vanilla";
import type { BoardState, BoardStatus, GuessRow, TileResult } from "shared/types/game";

export type BoardResultEntry = {
  boardIndex: number;
  word: string;
  result: TileResult[];
  boardStatus: BoardStatus;
};

type BoardStore = {
  boards: BoardState[];
  currentInput: string;
  submitting: boolean;
  shaking: boolean;

  initBoards: (words: string[]) => void;
  appendLetter: (letter: string) => void;
  deleteLetter: () => void;
  setSubmitting: (value: boolean) => void;
  setShaking: (value: boolean) => void;
  applyBoardResult: (
    boardIndex: number,
    word: string,
    result: TileResult[],
    boardStatus: BoardStatus,
  ) => void;
  applyAllResults: (entries: BoardResultEntry[]) => void;
  lockAllBoards: () => void;
};

export const boardStore = createStore<BoardStore>((set, get) => ({
  boards: [],
  currentInput: "",
  submitting: false,
  shaking: false,

  initBoards: (words: string[]) => {
    const boards: BoardState[] = words.map((word) => ({
      status: "unsolved",
      targetWord: word,
      guesses: [],
    }));
    set({ boards, currentInput: "", submitting: false, shaking: false });
  },

  appendLetter: (letter: string) => {
    const state = get();
    if (state.submitting) return;
    if (allTerminal(state)) return;
    if (state.currentInput.length >= 5) return;
    set({ currentInput: state.currentInput + letter });
  },

  deleteLetter: () => {
    const state = get();
    if (state.submitting) return;
    if (allTerminal(state)) return;
    if (state.currentInput.length === 0) return;
    set({ currentInput: state.currentInput.slice(0, -1) });
  },

  setSubmitting: (value: boolean) => {
    set({ submitting: value });
  },

  setShaking: (value: boolean) => {
    set({ shaking: value });
  },

  applyBoardResult: (
    boardIndex: number,
    word: string,
    result: TileResult[],
    boardStatus: BoardStatus,
  ) => {
    const { boards } = get();
    if (boardIndex < 0 || boardIndex >= boards.length) return;
    const newGuess: GuessRow = { word, result };
    set({
      boards: boards.map((b, i) =>
        i === boardIndex
          ? { ...b, guesses: [...b.guesses, newGuess], status: boardStatus }
          : b,
      ),
    });
  },

  applyAllResults: (entries: BoardResultEntry[]) => {
    const { boards } = get();
    const entryMap = new Map(entries.map((e) => [e.boardIndex, e]));
    const updatedBoards = boards.map((b, i) => {
      const entry = entryMap.get(i);
      if (!entry) return b;
      return {
        ...b,
        guesses: [...b.guesses, { word: entry.word, result: entry.result }],
        status: entry.boardStatus,
      };
    });
    set({ boards: updatedBoards });
  },

  lockAllBoards: () => {
    set({
      boards: get().boards.map((b) =>
        b.status === "unsolved" ? { ...b, status: "locked" } : b,
      ),
      currentInput: "",
    });
  },
}));

export function allTerminal(state: BoardStore): boolean {
  return state.boards.length > 0 && state.boards.every((b) => b.status !== "unsolved");
}

export function unsolvedBoards(state: BoardStore): BoardState[] {
  return state.boards.filter((b) => b.status === "unsolved");
}

export type { BoardStore };
