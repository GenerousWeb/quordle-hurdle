import { describe, it, expect, beforeEach } from "vitest";
import { boardStore, allTerminal, unsolvedBoards } from "./boardStore";

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

// ---------------------------------------------------------------------------
// initBoards (tests #23–27)
// ---------------------------------------------------------------------------

describe("initBoards", () => {
  it("23: all boards set to unsolved", () => {
    init();
    boardStore.getState().boards.forEach((b) => {
      expect(b.status).toBe("unsolved");
    });
  });

  it("24: target words set correctly", () => {
    init();
    const { boards } = boardStore.getState();
    WORDS.forEach((word, i) => {
      expect(boards[i].targetWord).toBe(word);
    });
  });

  it("25: global currentInput is empty", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("");
  });

  it("26: all guess arrays are empty", () => {
    init();
    boardStore.getState().boards.forEach((b) => {
      expect(b.guesses).toHaveLength(0);
    });
  });

  it("27: resets previous round state", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "crane", ["grey", "grey", "grey", "grey", "grey"], "unsolved");
    init();
    boardStore.getState().boards.forEach((b) => {
      expect(b.guesses).toHaveLength(0);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("");
  });
});

// ---------------------------------------------------------------------------
// appendLetter — shared input (tests #28–31)
// ---------------------------------------------------------------------------

describe("appendLetter", () => {
  it("28: appends to shared currentInput", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).appendLetter("C");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("C");
  });

  it("29: stops at 5 characters", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { appendLetter } = boardStore.getState() as any;
    "CRANEX".split("").forEach((l: string) => appendLetter(l));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput.length).toBe(5);
  });

  it("30: blocked when all boards terminal", () => {
    init();
    WORDS.forEach((_, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyBoardResult(i, "apple", ["green", "green", "green", "green", "green"], "solved");
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).appendLetter("C");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("");
  });

  it("31: builds word correctly", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { appendLetter } = boardStore.getState() as any;
    "CRANE".split("").forEach((l: string) => appendLetter(l));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("CRANE");
  });
});

// ---------------------------------------------------------------------------
// deleteLetter — shared input (tests #32–34)
// ---------------------------------------------------------------------------

describe("deleteLetter", () => {
  it("32: removes last character from shared input", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = boardStore.getState() as any;
    "ABC".split("").forEach((l: string) => state.appendLetter(l));
    state.deleteLetter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput.length).toBe(2);
  });

  it("33: no-op on empty shared input", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).deleteLetter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("");
  });

  it("34: blocked when all boards terminal", () => {
    init();
    WORDS.forEach((_, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyBoardResult(i, "apple", ["green", "green", "green", "green", "green"], "solved");
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).deleteLetter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("");
  });
});

// ---------------------------------------------------------------------------
// setSubmitting — global flag (tests #35–36)
// ---------------------------------------------------------------------------

describe("setSubmitting", () => {
  it("35: sets global flag true", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).setSubmitting(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).submitting).toBe(true);
  });

  it("36: sets global flag false", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = boardStore.getState() as any;
    state.setSubmitting(true);
    state.setSubmitting(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).submitting).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyBoardResult (tests #37–42)
// ---------------------------------------------------------------------------

describe("applyBoardResult", () => {
  it("37: guess appended to correct board", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "crane", ["grey", "green", "grey", "grey", "green"], "unsolved");
    expect(boardStore.getState().boards[0].guesses).toHaveLength(1);
  });

  it("38: correct word and result stored", () => {
    init();
    const result = ["grey", "green", "grey", "grey", "green"] as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "crane", [...result], "unsolved");
    expect(boardStore.getState().boards[0].guesses[0]).toEqual({ word: "crane", result: [...result] });
  });

  it("39: status stays unsolved", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "crane", ["grey", "grey", "grey", "grey", "grey"], "unsolved");
    expect(boardStore.getState().boards[0].status).toBe("unsolved");
  });

  it("40: status transitions to solved", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    expect(boardStore.getState().boards[0].status).toBe("solved");
  });

  it("41: status transitions to failed", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "crane", ["grey", "grey", "grey", "grey", "grey"], "failed");
    expect(boardStore.getState().boards[0].status).toBe("failed");
  });

  it("42: other boards unaffected", () => {
    init();
    const before = boardStore.getState().boards.slice(1).map((b) => ({ ...b }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "crane", ["grey", "grey", "grey", "grey", "grey"], "unsolved");
    const after = boardStore.getState().boards.slice(1);
    expect(after).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// applyAllResults (tests #43–47)
// ---------------------------------------------------------------------------

describe("applyAllResults", () => {
  it("43: applies results to multiple boards at once", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyAllResults([
      { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      { boardIndex: 2, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
    ]);
    expect(boardStore.getState().boards[0].guesses).toHaveLength(1);
    expect(boardStore.getState().boards[2].guesses).toHaveLength(1);
    expect(boardStore.getState().boards[1].guesses).toHaveLength(0);
    expect(boardStore.getState().boards[3].guesses).toHaveLength(0);
  });

  it("44: does not alter shared currentInput — animation gate (BoardGrid) is responsible", () => {
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

  it("45: does not alter global submitting — animation gate (BoardGrid) is responsible", () => {
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

  it("46: one board solves, others stay unsolved", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyAllResults([
      { boardIndex: 1, word: "grape", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
    ]);
    expect(boardStore.getState().boards[1].status).toBe("solved");
    expect(boardStore.getState().boards[0].status).toBe("unsolved");
    expect(boardStore.getState().boards[2].status).toBe("unsolved");
    expect(boardStore.getState().boards[3].status).toBe("unsolved");
  });

  it("47: multiple boards solve simultaneously", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyAllResults([
      { boardIndex: 0, word: "apple", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
      { boardIndex: 2, word: "stone", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
    ]);
    expect(boardStore.getState().boards[0].status).toBe("solved");
    expect(boardStore.getState().boards[2].status).toBe("solved");
    expect(boardStore.getState().boards[1].status).toBe("unsolved");
    expect(boardStore.getState().boards[3].status).toBe("unsolved");
  });
});

// ---------------------------------------------------------------------------
// lockAllBoards (tests #48–51)
// ---------------------------------------------------------------------------

describe("lockAllBoards", () => {
  it("48: unsolved boards locked", () => {
    init();
    boardStore.getState().lockAllBoards();
    boardStore.getState().boards.forEach((b) => {
      expect(b.status).toBe("locked");
    });
  });

  it("49: solved board unchanged", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    boardStore.getState().lockAllBoards();
    expect(boardStore.getState().boards[0].status).toBe("solved");
  });

  it("50: failed board unchanged", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "crane", ["grey", "grey", "grey", "grey", "grey"], "failed");
    boardStore.getState().lockAllBoards();
    expect(boardStore.getState().boards[0].status).toBe("failed");
  });

  it("51: shared currentInput cleared", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = boardStore.getState() as any;
    "CRANE".split("").forEach((l: string) => state.appendLetter(l));
    boardStore.getState().lockAllBoards();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("");
  });
});

// ---------------------------------------------------------------------------
// allTerminal selector (tests #52–55)
// ---------------------------------------------------------------------------

describe("allTerminal selector", () => {
  it("52: false during active round", () => {
    init();
    expect(allTerminal(boardStore.getState())).toBe(false);
  });

  it("53: true when all solved", () => {
    init();
    WORDS.forEach((_, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyBoardResult(i, WORDS[i], ["green", "green", "green", "green", "green"], "solved");
    });
    expect(allTerminal(boardStore.getState())).toBe(true);
  });

  it("54: true on mix of terminal states", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(1, "grape", ["grey", "grey", "grey", "grey", "grey"], "failed");
    boardStore.getState().lockAllBoards();
    expect(allTerminal(boardStore.getState())).toBe(true);
  });

  it("55: false when one board still unsolved", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(1, "grape", ["grey", "grey", "grey", "grey", "grey"], "failed");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(2, "stone", ["green", "green", "green", "green", "green"], "solved");
    // board 3 still unsolved
    expect(allTerminal(boardStore.getState())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// unsolvedBoards selector (tests #56–59)
// ---------------------------------------------------------------------------

describe("unsolvedBoards selector", () => {
  it("56: returns all boards on init", () => {
    init();
    expect(unsolvedBoards(boardStore.getState())).toHaveLength(4);
  });

  it("57: excludes solved board", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(1, "grape", ["green", "green", "green", "green", "green"], "solved");
    const unsolved = unsolvedBoards(boardStore.getState());
    expect(unsolved).toHaveLength(3);
    expect(unsolved.some((b) => b.targetWord === "grape")).toBe(false);
  });

  it("58: excludes failed board", () => {
    init();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (boardStore.getState() as any).applyBoardResult(2, "crane", ["grey", "grey", "grey", "grey", "grey"], "failed");
    const unsolved = unsolvedBoards(boardStore.getState());
    expect(unsolved).toHaveLength(3);
  });

  it("59: returns empty when all terminal", () => {
    init();
    WORDS.forEach((_, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyBoardResult(i, WORDS[i], ["green", "green", "green", "green", "green"], "solved");
    });
    expect(unsolvedBoards(boardStore.getState())).toHaveLength(0);
  });
});
