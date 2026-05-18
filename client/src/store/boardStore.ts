import { createStore } from "zustand/vanilla";
import type { BoardState, BoardStatus, GuessRow, TileResult } from "shared/types/game";

type BoardStore = {
  boards: BoardState[];

  initBoards: (words: string[]) => void;
  appendLetter: (boardIndex: number, letter: string) => void;
  deleteLetter: (boardIndex: number) => void;
  setSubmitting: (boardIndex: number, value: boolean) => void;
  applyResult: (
    boardIndex: number,
    word: string,
    result: TileResult[],
    boardStatus: BoardStatus,
  ) => void;
  lockAllBoards: () => void;
  setFocus: (boardIndex: number) => void;
  advanceFocus: (fromIndex: number) => void;
};

export const boardStore = createStore<BoardStore>((set, get) => ({
  boards: [],

  initBoards: (words: string[]) => {
    const boards: BoardState[] = words.map((word, i) => ({
      status: i === 0 ? "active" : "idle",
      targetWord: word,
      guesses: [],
      currentInput: "",
      attemptCount: 0,
      submitting: false,
    }));
    set({ boards });
  },

  appendLetter: (boardIndex: number, letter: string) => {
    const { boards } = get();
    const board = boards[boardIndex];
    if (!board || board.status !== "active" || board.currentInput.length >= 5) return;
    set({
      boards: boards.map((b, i) =>
        i === boardIndex ? { ...b, currentInput: b.currentInput + letter } : b,
      ),
    });
  },

  deleteLetter: (boardIndex: number) => {
    const { boards } = get();
    const board = boards[boardIndex];
    if (!board || board.status !== "active" || board.currentInput.length === 0) return;
    set({
      boards: boards.map((b, i) =>
        i === boardIndex ? { ...b, currentInput: b.currentInput.slice(0, -1) } : b,
      ),
    });
  },

  setSubmitting: (boardIndex: number, value: boolean) => {
    const { boards } = get();
    const board = boards[boardIndex];
    if (!board || board.status !== "active") return;
    set({
      boards: boards.map((b, i) =>
        i === boardIndex ? { ...b, submitting: value } : b,
      ),
    });
  },

  applyResult: (
    boardIndex: number,
    word: string,
    result: TileResult[],
    boardStatus: BoardStatus,
  ) => {
    const { boards } = get();
    if (boardIndex < 0 || boardIndex >= boards.length) return;
    const board = boards[boardIndex];
    const newGuess: GuessRow = { word, result };
    const updatedBoard: BoardState = {
      ...board,
      guesses: [...board.guesses, newGuess],
      currentInput: "",
      attemptCount: board.attemptCount + 1,
      submitting: false,
      status: boardStatus,
    };
    set({ boards: boards.map((b, i) => (i === boardIndex ? updatedBoard : b)) });
    if (boardStatus === "solved") {
      get().advanceFocus(boardIndex);
    }
  },

  lockAllBoards: () => {
    set({
      boards: get().boards.map((b) => {
        if (b.status === "solved" || b.status === "failed") return b;
        return { ...b, status: "locked", currentInput: "" };
      }),
    });
  },

  setFocus: (boardIndex: number) => {
    const { boards } = get();
    const board = boards[boardIndex];
    if (
      !board ||
      board.status === "solved" ||
      board.status === "failed" ||
      board.status === "locked"
    )
      return;
    set({
      boards: boards.map((b, i) => {
        if (i === boardIndex) return { ...b, status: "active" };
        if (b.status === "active") return { ...b, status: "idle" };
        return b;
      }),
    });
  },

  advanceFocus: (fromIndex: number) => {
    const { boards } = get();
    for (let offset = 1; offset < boards.length; offset++) {
      const idx = (fromIndex + offset) % boards.length;
      if (boards[idx].status === "idle") {
        get().setFocus(idx);
        return;
      }
    }
  },
}));

export function activeBoard(state: BoardStore): BoardState | null {
  return state.boards.find((b) => b.status === "active") ?? null;
}

export function activeBoardIndex(state: BoardStore): number | null {
  const idx = state.boards.findIndex((b) => b.status === "active");
  return idx === -1 ? null : idx;
}

export function allTerminal(state: BoardStore): boolean {
  return state.boards.every(
    (b) => b.status === "solved" || b.status === "failed" || b.status === "locked",
  );
}

export type { BoardStore };
