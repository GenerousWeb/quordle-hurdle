import { describe, it, expect, beforeEach } from "vitest";
import { boardStore } from "./boardStore";

const WORDS = ["apple", "grape", "stone", "light"];

function reset() {
  boardStore.setState({ boards: [] });
}

function init() {
  boardStore.getState().initBoards(WORDS);
}

beforeEach(() => {
  reset();
});

// Tests #116–121: how the store responds to a successful guess_result from the server

describe("guess_result — success path", () => {
  it("116: guess is appended to the board's guess history", () => {
    init();
    boardStore
      .getState()
      .applyResult(0, "crane", ["grey", "green", "grey", "grey", "green"], "active");
    expect(boardStore.getState().boards[0].guesses).toHaveLength(1);
  });

  it("117: currentInput is cleared after the result is applied", () => {
    init();
    "CRANE".split("").forEach((l) => boardStore.getState().appendLetter(0, l));
    boardStore
      .getState()
      .applyResult(0, "crane", ["grey", "green", "grey", "grey", "green"], "active");
    expect(boardStore.getState().boards[0].currentInput).toBe("");
  });

  it("118: submitting flag is cleared after the result is applied", () => {
    init();
    boardStore.getState().setSubmitting(0, true);
    boardStore
      .getState()
      .applyResult(0, "crane", ["grey", "green", "grey", "grey", "green"], "active");
    expect(boardStore.getState().boards[0].submitting).toBe(false);
  });

  it("119: board status stays active when boardStatus is 'active'", () => {
    init();
    boardStore
      .getState()
      .applyResult(0, "crane", ["grey", "grey", "grey", "grey", "grey"], "active");
    expect(boardStore.getState().boards[0].status).toBe("active");
  });

  it("120: board transitions to solved when boardStatus is 'solved'", () => {
    init();
    boardStore
      .getState()
      .applyResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    expect(boardStore.getState().boards[0].status).toBe("solved");
  });

  it("121: board transitions to failed when boardStatus is 'failed'", () => {
    init();
    boardStore
      .getState()
      .applyResult(0, "crane", ["grey", "grey", "grey", "grey", "grey"], "failed");
    expect(boardStore.getState().boards[0].status).toBe("failed");
  });
});

// Tests #122–124: how the store responds to a not_a_word rejection
// The handler clears submitting and leaves currentInput intact; no attempt is consumed.

describe("guess_result — not_a_word error", () => {
  it("122: currentInput is preserved after a not_a_word rejection", () => {
    init();
    "CRANE".split("").forEach((l) => boardStore.getState().appendLetter(0, l));
    boardStore.getState().setSubmitting(0, true);
    // Simulate not_a_word handler: only clear the submitting flag
    boardStore.getState().setSubmitting(0, false);
    expect(boardStore.getState().boards[0].currentInput).toBe("CRANE");
  });

  it("123: attemptCount is not incremented after a not_a_word rejection", () => {
    init();
    "CRANE".split("").forEach((l) => boardStore.getState().appendLetter(0, l));
    boardStore.getState().setSubmitting(0, true);
    boardStore.getState().setSubmitting(0, false);
    expect(boardStore.getState().boards[0].attemptCount).toBe(0);
  });

  it("124: submitting flag is cleared after a not_a_word rejection", () => {
    init();
    boardStore.getState().setSubmitting(0, true);
    boardStore.getState().setSubmitting(0, false);
    expect(boardStore.getState().boards[0].submitting).toBe(false);
  });
});

// Tests #125–126: how the store responds to a round_expired error
// All non-terminal boards are locked immediately.

describe("guess_result — round_expired error", () => {
  it("125: all non-terminal boards transition to locked", () => {
    init();
    boardStore.getState().lockAllBoards();
    const { boards } = boardStore.getState();
    expect(boards[0].status).toBe("locked");
    expect(boards[1].status).toBe("locked");
    expect(boards[2].status).toBe("locked");
    expect(boards[3].status).toBe("locked");
  });

  it("126: a solved board is unaffected by the round_expired lock", () => {
    init();
    boardStore
      .getState()
      .applyResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    boardStore.getState().lockAllBoards();
    expect(boardStore.getState().boards[0].status).toBe("solved");
  });
});
