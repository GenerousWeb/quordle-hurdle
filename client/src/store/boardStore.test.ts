import { describe, it, expect, beforeEach } from "vitest";
import {
  boardStore,
  activeBoard,
  activeBoardIndex,
  allTerminal,
} from "./boardStore";

const WORDS = ["CRANE", "SLATE", "GROVE", "AUDIO"];

function reset() {
  boardStore.setState({ boards: [] });
}

function init() {
  boardStore.getState().initBoards(WORDS);
}

beforeEach(() => {
  reset();
});

describe("initBoards", () => {
  it("board 0 is active after init", () => {
    init();
    expect(boardStore.getState().boards[0].status).toBe("active");
  });

  it("boards 1–3 are idle after init", () => {
    init();
    const { boards } = boardStore.getState();
    expect(boards[1].status).toBe("idle");
    expect(boards[2].status).toBe("idle");
    expect(boards[3].status).toBe("idle");
  });

  it("each board's targetWord is set from the words array", () => {
    init();
    const { boards } = boardStore.getState();
    WORDS.forEach((word, i) => {
      expect(boards[i].targetWord).toBe(word);
    });
  });

  it("all boards start with empty guesses", () => {
    init();
    boardStore.getState().boards.forEach((b) => {
      expect(b.guesses).toHaveLength(0);
    });
  });

  it("all boards start with empty currentInput, zero attemptCount, submitting false", () => {
    init();
    boardStore.getState().boards.forEach((b) => {
      expect(b.currentInput).toBe("");
      expect(b.attemptCount).toBe(0);
      expect(b.submitting).toBe(false);
    });
  });
});

describe("appendLetter", () => {
  it("appends a letter to the active board's currentInput", () => {
    init();
    boardStore.getState().appendLetter(0, "A");
    expect(boardStore.getState().boards[0].currentInput).toBe("A");
  });

  it("appends multiple letters up to 5", () => {
    init();
    const { appendLetter } = boardStore.getState();
    "CRANE".split("").forEach((l) => appendLetter(0, l));
    expect(boardStore.getState().boards[0].currentInput).toBe("CRANE");
  });

  it("stops at 5 characters — 6th append is ignored", () => {
    init();
    const { appendLetter } = boardStore.getState();
    "CRANEX".split("").forEach((l) => appendLetter(0, l));
    expect(boardStore.getState().boards[0].currentInput).toBe("CRANE");
  });

  it("is a no-op on an idle board", () => {
    init();
    boardStore.getState().appendLetter(1, "A");
    expect(boardStore.getState().boards[1].currentInput).toBe("");
  });

  it("is a no-op on a locked board", () => {
    init();
    boardStore.getState().lockAllBoards();
    boardStore.getState().appendLetter(0, "A");
    expect(boardStore.getState().boards[0].currentInput).toBe("");
  });
});

describe("deleteLetter", () => {
  it("removes the last character from currentInput", () => {
    init();
    boardStore.getState().appendLetter(0, "A");
    boardStore.getState().appendLetter(0, "B");
    boardStore.getState().deleteLetter(0);
    expect(boardStore.getState().boards[0].currentInput).toBe("A");
  });

  it("is a no-op when currentInput is already empty", () => {
    init();
    boardStore.getState().deleteLetter(0);
    expect(boardStore.getState().boards[0].currentInput).toBe("");
  });

  it("is a no-op on an idle board", () => {
    init();
    // artificially set input on idle board to check delete has no effect
    boardStore.setState({
      boards: boardStore.getState().boards.map((b, i) =>
        i === 1 ? { ...b, currentInput: "AB" } : b,
      ),
    });
    boardStore.getState().deleteLetter(1);
    expect(boardStore.getState().boards[1].currentInput).toBe("AB");
  });
});

describe("setSubmitting", () => {
  it("sets submitting to true on the active board", () => {
    init();
    boardStore.getState().setSubmitting(0, true);
    expect(boardStore.getState().boards[0].submitting).toBe(true);
  });

  it("sets submitting back to false", () => {
    init();
    boardStore.getState().setSubmitting(0, true);
    boardStore.getState().setSubmitting(0, false);
    expect(boardStore.getState().boards[0].submitting).toBe(false);
  });

  it("is a no-op on an idle board", () => {
    init();
    boardStore.getState().setSubmitting(1, true);
    expect(boardStore.getState().boards[1].submitting).toBe(false);
  });
});

describe("applyResult", () => {
  it("appends a GuessRow to guesses", () => {
    init();
    boardStore.getState().applyResult(0, "CRANE", ["green", "green", "green", "green", "green"], "solved");
    expect(boardStore.getState().boards[0].guesses).toHaveLength(1);
    expect(boardStore.getState().boards[0].guesses[0]).toEqual({
      word: "CRANE",
      result: ["green", "green", "green", "green", "green"],
    });
  });

  it("increments attemptCount", () => {
    init();
    boardStore.getState().applyResult(0, "CRANE", ["grey", "grey", "grey", "grey", "grey"], "active");
    expect(boardStore.getState().boards[0].attemptCount).toBe(1);
  });

  it("clears currentInput after applying result", () => {
    init();
    boardStore.getState().appendLetter(0, "C");
    boardStore.getState().applyResult(0, "CRANE", ["grey", "grey", "grey", "grey", "grey"], "active");
    expect(boardStore.getState().boards[0].currentInput).toBe("");
  });

  it("clears submitting flag after applying result", () => {
    init();
    boardStore.getState().setSubmitting(0, true);
    boardStore.getState().applyResult(0, "CRANE", ["grey", "grey", "grey", "grey", "grey"], "active");
    expect(boardStore.getState().boards[0].submitting).toBe(false);
  });

  it("transitions status to solved", () => {
    init();
    boardStore.getState().applyResult(0, "CRANE", ["green", "green", "green", "green", "green"], "solved");
    expect(boardStore.getState().boards[0].status).toBe("solved");
  });

  it("transitions status to failed", () => {
    init();
    boardStore.getState().applyResult(0, "CRANE", ["grey", "grey", "grey", "grey", "grey"], "failed");
    expect(boardStore.getState().boards[0].status).toBe("failed");
  });

  it("keeps board active when boardStatus is active", () => {
    init();
    boardStore.getState().applyResult(0, "CRANE", ["grey", "grey", "grey", "grey", "grey"], "active");
    expect(boardStore.getState().boards[0].status).toBe("active");
  });

  it("is a no-op for an out-of-range boardIndex", () => {
    init();
    const before = boardStore.getState().boards;
    boardStore.getState().applyResult(4, "CRANE", ["grey", "grey", "grey", "grey", "grey"], "active");
    expect(boardStore.getState().boards).toEqual(before);
  });
});

describe("lockAllBoards", () => {
  it("transitions active board to locked", () => {
    init();
    boardStore.getState().lockAllBoards();
    expect(boardStore.getState().boards[0].status).toBe("locked");
  });

  it("transitions idle boards to locked", () => {
    init();
    boardStore.getState().lockAllBoards();
    expect(boardStore.getState().boards[1].status).toBe("locked");
    expect(boardStore.getState().boards[2].status).toBe("locked");
    expect(boardStore.getState().boards[3].status).toBe("locked");
  });

  it("does not affect solved boards", () => {
    init();
    boardStore.getState().applyResult(0, "CRANE", ["green", "green", "green", "green", "green"], "solved");
    boardStore.getState().lockAllBoards();
    expect(boardStore.getState().boards[0].status).toBe("solved");
  });

  it("does not affect failed boards", () => {
    init();
    boardStore.getState().applyResult(0, "CRANE", ["grey", "grey", "grey", "grey", "grey"], "failed");
    boardStore.getState().lockAllBoards();
    expect(boardStore.getState().boards[0].status).toBe("failed");
  });

  it("clears currentInput on boards being locked", () => {
    init();
    boardStore.getState().appendLetter(0, "A");
    boardStore.getState().appendLetter(0, "B");
    boardStore.getState().lockAllBoards();
    expect(boardStore.getState().boards[0].currentInput).toBe("");
  });
});

describe("setFocus", () => {
  it("activates an idle board and deactivates the previously active board", () => {
    init();
    boardStore.getState().setFocus(1);
    expect(boardStore.getState().boards[0].status).toBe("idle");
    expect(boardStore.getState().boards[1].status).toBe("active");
  });

  it("is a no-op when target board is solved", () => {
    init();
    // use setState directly to avoid applyResult's advanceFocus side-effect
    boardStore.setState({
      boards: boardStore.getState().boards.map((b, i) =>
        i === 1 ? { ...b, status: "solved" } : b,
      ),
    });
    boardStore.getState().setFocus(1);
    expect(boardStore.getState().boards[1].status).toBe("solved");
    expect(boardStore.getState().boards[0].status).toBe("active");
  });

  it("is a no-op when target board is failed", () => {
    init();
    boardStore.getState().applyResult(1, "SLATE", ["grey", "grey", "grey", "grey", "grey"], "failed");
    boardStore.getState().setFocus(1);
    expect(boardStore.getState().boards[1].status).toBe("failed");
  });

  it("is a no-op when target board is locked", () => {
    init();
    boardStore.getState().lockAllBoards();
    boardStore.getState().setFocus(2);
    expect(boardStore.getState().boards[2].status).toBe("locked");
  });
});

describe("advanceFocus", () => {
  it("moves focus to the next idle board", () => {
    init();
    boardStore.getState().advanceFocus(0);
    expect(boardStore.getState().boards[1].status).toBe("active");
    expect(boardStore.getState().boards[0].status).toBe("idle");
  });

  it("skips non-idle boards and finds the next available", () => {
    init();
    // use setState directly to mark board 1 solved without triggering advanceFocus side-effect
    boardStore.setState({
      boards: boardStore.getState().boards.map((b, i) =>
        i === 1 ? { ...b, status: "solved" } : b,
      ),
    });
    // board 0 active, board 1 solved, boards 2-3 idle; advance from 0 → skips solved(1), finds idle(2)
    boardStore.getState().advanceFocus(0);
    expect(boardStore.getState().boards[2].status).toBe("active");
  });

  it("wraps around from the end", () => {
    init();
    // mark boards 1, 2, 3 all as idle (already are); advance from board 3
    boardStore.getState().setFocus(3);
    boardStore.getState().advanceFocus(3);
    expect(boardStore.getState().boards[0].status).toBe("active");
  });

  it("sets no board active when all remaining boards are terminal", () => {
    init();
    // solve/fail all boards
    boardStore.getState().applyResult(0, "CRANE", ["green", "green", "green", "green", "green"], "solved");
    boardStore.getState().applyResult(1, "SLATE", ["green", "green", "green", "green", "green"], "solved");
    boardStore.getState().applyResult(2, "GROVE", ["green", "green", "green", "green", "green"], "solved");
    boardStore.getState().applyResult(3, "AUDIO", ["grey", "grey", "grey", "grey", "grey"], "failed");
    boardStore.getState().advanceFocus(3);
    const { boards } = boardStore.getState();
    const hasActive = boards.some((b) => b.status === "active");
    expect(hasActive).toBe(false);
  });
});

describe("activeBoard selector", () => {
  it("returns the active board object", () => {
    init();
    const board = activeBoard(boardStore.getState());
    expect(board).not.toBeNull();
    expect(board?.status).toBe("active");
    expect(board?.targetWord).toBe("CRANE");
  });

  it("returns null when no board is active", () => {
    init();
    boardStore.getState().lockAllBoards();
    expect(activeBoard(boardStore.getState())).toBeNull();
  });
});

describe("activeBoardIndex selector", () => {
  it("returns the index of the active board", () => {
    init();
    expect(activeBoardIndex(boardStore.getState())).toBe(0);
  });

  it("returns the correct index after focus shifts", () => {
    init();
    boardStore.getState().setFocus(2);
    expect(activeBoardIndex(boardStore.getState())).toBe(2);
  });

  it("returns null when no board is active", () => {
    init();
    boardStore.getState().lockAllBoards();
    expect(activeBoardIndex(boardStore.getState())).toBeNull();
  });
});

describe("allTerminal selector", () => {
  it("returns false when boards are active/idle", () => {
    init();
    expect(allTerminal(boardStore.getState())).toBe(false);
  });

  it("returns true when all boards are solved", () => {
    init();
    WORDS.forEach((_, i) => {
      boardStore.getState().applyResult(i, WORDS[i], ["green", "green", "green", "green", "green"], "solved");
    });
    expect(allTerminal(boardStore.getState())).toBe(true);
  });

  it("returns true when mix of solved, failed, and locked", () => {
    init();
    boardStore.getState().applyResult(0, "CRANE", ["green", "green", "green", "green", "green"], "solved");
    boardStore.getState().applyResult(1, "SLATE", ["grey", "grey", "grey", "grey", "grey"], "failed");
    boardStore.getState().lockAllBoards();
    expect(allTerminal(boardStore.getState())).toBe(true);
  });

  it("returns false when even one board is idle", () => {
    init();
    boardStore.getState().applyResult(0, "CRANE", ["green", "green", "green", "green", "green"], "solved");
    boardStore.getState().applyResult(1, "SLATE", ["grey", "grey", "grey", "grey", "grey"], "failed");
    boardStore.getState().applyResult(2, "GROVE", ["green", "green", "green", "green", "green"], "solved");
    // board 3 still idle
    expect(allTerminal(boardStore.getState())).toBe(false);
  });
});
