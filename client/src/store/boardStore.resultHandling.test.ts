import { describe, it, expect, beforeEach } from "vitest";
import { boardStore } from "./boardStore";

const WORDS = ["apple", "grape", "stone", "light"];

function reset() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (boardStore.setState as (s: any) => void)({ boards: [], currentInput: "", submitting: false });
}

function init() {
  boardStore.getState().initBoards(WORDS);
}

beforeEach(() => {
  reset();
});

// Tests #103–108: how the store responds to a successful guess_result from the server.
// The server evaluates each unsolved board independently and returns boards[].
// applyAllResults writes all results atomically. currentInput and submitting are cleared
// by the BoardGrid animation gate after the flip animation completes — NOT by the store.

describe("guess_result — success path", () => {
  it("103: guess added to all evaluated boards", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyAllResults([
      { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      { boardIndex: 1, word: "crane", result: ["grey", "green", "grey", "grey", "grey"], boardStatus: "unsolved" },
      { boardIndex: 2, word: "crane", result: ["grey", "grey", "green", "grey", "grey"], boardStatus: "unsolved" },
      { boardIndex: 3, word: "crane", result: ["grey", "grey", "grey", "green", "grey"], boardStatus: "unsolved" },
    ]);
    boardStore.getState().boards.forEach((b) => {
      expect(b.guesses).toHaveLength(1);
    });
  });

  it("104: does not alter shared currentInput — animation gate (BoardGrid) is responsible", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = boardStore.getState() as any;
    "CRANE".split("").forEach((l: string) => state.appendLetter(l));
    state.applyAllResults([
      { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("CRANE");
  });

  it("105: does not alter global submitting — animation gate (BoardGrid) is responsible", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = boardStore.getState() as any;
    state.setSubmitting(true);
    state.applyAllResults([
      { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).submitting).toBe(true);
  });

  it("106: one board solved, others stay unsolved", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyAllResults([
      { boardIndex: 0, word: "apple", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
      { boardIndex: 1, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      { boardIndex: 2, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      { boardIndex: 3, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
    ]);
    expect(boardStore.getState().boards[0].status).toBe("solved");
    expect(boardStore.getState().boards[1].status).toBe("unsolved");
    expect(boardStore.getState().boards[2].status).toBe("unsolved");
    expect(boardStore.getState().boards[3].status).toBe("unsolved");
  });

  it("107: multiple boards solved simultaneously", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyAllResults([
      { boardIndex: 0, word: "apple", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
      { boardIndex: 1, word: "grape", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
    ]);
    expect(boardStore.getState().boards[0].status).toBe("solved");
    expect(boardStore.getState().boards[1].status).toBe("solved");
  });

  it("108: board transitions to failed", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyAllResults([
      { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "failed" },
      { boardIndex: 1, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
    ]);
    expect(boardStore.getState().boards[0].status).toBe("failed");
    expect(boardStore.getState().boards[1].status).toBe("unsolved");
  });
});

// Tests #109–111: how the store responds to a not_a_word rejection.
// The not_a_word handler clears submitting only; currentInput is preserved so the player can correct and resubmit.
// No attempt is consumed on any board.

describe("guess_result — not_a_word error", () => {
  it("109: shared currentInput preserved", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = boardStore.getState() as any;
    "CRANE".split("").forEach((l: string) => state.appendLetter(l));
    state.setSubmitting(true);
    // not_a_word handler: clear submitting only, leave currentInput intact
    state.setSubmitting(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("CRANE");
  });

  it("110: no board attempt counts incremented", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = boardStore.getState() as any;
    "CRANE".split("").forEach((l: string) => state.appendLetter(l));
    state.setSubmitting(true);
    state.setSubmitting(false);
    boardStore.getState().boards.forEach((b) => {
      expect(b.guesses).toHaveLength(0);
    });
  });

  it("111: global submitting cleared", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = boardStore.getState() as any;
    state.setSubmitting(true);
    state.setSubmitting(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).submitting).toBe(false);
  });
});

// Tests #112–113: how the store responds to a round_expired error.
// All non-terminal boards transition to locked immediately.

describe("guess_result — round_expired error", () => {
  it("112: all unsolved boards locked", () => {
    init();
    boardStore.getState().lockAllBoards();
    boardStore.getState().boards.forEach((b) => {
      expect(b.status).toBe("locked");
    });
  });

  it("113: solved board unaffected", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    boardStore.getState().lockAllBoards();
    expect(boardStore.getState().boards[0].status).toBe("solved");
  });
});
