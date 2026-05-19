/**
 * @vitest-environment happy-dom
 *
 * F2 Step 2 — BoardGrid flip animation and input gate (tests f2#39–f2#56).
 *
 * Key F2 architecture change tested here:
 *   In F2, `applyAllResults` does NOT clear `submitting`. The BoardGrid
 *   component keeps `submitting === true` for the full animation duration
 *   (~650ms), then calls setSubmitting(false) and clears currentInput after
 *   the last tile's flip completes.
 *
 * DOM conventions:
 *   data-flipping="true"  — tile is currently animating
 *   data-state            — tile colour state
 *   data-status           — board container status
 *
 * These tests fail until the F2 BoardGrid animation + gate is implemented.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { BoardGrid } from "./BoardGrid";
import { boardStore } from "../store/boardStore";

const WORDS = ["apple", "grape", "stone", "light"];

function resetAndInit() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (boardStore.setState as (s: any) => void)({ boards: [], currentInput: "", submitting: false });
  boardStore.getState().initBoards(WORDS);
}

beforeEach(() => {
  resetAndInit();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function getTile(
  boardIndex: number,
  rowIndex: number,
  tileIndex: number,
): HTMLElement {
  return document.querySelector(
    `[data-board-index="${boardIndex}"] [data-row-index="${rowIndex}"] [data-tile-index="${tileIndex}"]`,
  ) as HTMLElement;
}

/** Simulate the socket delivering results while keeping submitting=true (F2 behaviour). */
function simulateResultsWithoutClearingSubmitting(
  entries: { boardIndex: number; word: string; result: readonly string[]; boardStatus: "unsolved" | "solved" | "failed" | "locked" }[],
) {
  const { boards } = boardStore.getState();
  const updated = boards.map((b, i) => {
    const entry = entries.find((e) => e.boardIndex === i);
    if (!entry) return b;
    return {
      ...b,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      guesses: [...b.guesses, { word: entry.word, result: entry.result as any }],
      status: entry.boardStatus as "unsolved" | "solved" | "failed" | "locked",
    };
  });
  // submitting intentionally left untouched — F2: component clears it after animation
  boardStore.setState({ boards: updated });
}

// ---------------------------------------------------------------------------
// Input gate — Enter triggers submitting (f2#39)
// ---------------------------------------------------------------------------

describe("BoardGrid — Enter sets submitting=true (F2)", () => {
  it("f2#39: submitting becomes true immediately when Enter is pressed with a 5-char input", () => {
    const handleEnter = (guess: string) => {
      // Simulate what the F2 socket handler does on emit
      boardStore.getState().setSubmitting(true);
      void guess;
    };
    boardStore.setState({ currentInput: "CRANE" });
    render(<BoardGrid onEnter={handleEnter} />);
    act(() => {
      fireEvent.keyDown(document.body, { key: "Enter" });
    });
    expect(boardStore.getState().submitting).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Keyboard gate while submitting (f2#40–f2#42)
// ---------------------------------------------------------------------------

describe("BoardGrid — keyboard blocked during animation (F2)", () => {
  it("f2#40: letter key ignored while submitting is true", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
    });
    fireEvent.keyDown(document.body, { key: "c" });
    expect(boardStore.getState().currentInput).toBe("");
  });

  it("f2#41: Backspace ignored while submitting is true", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.setState({ currentInput: "CRA", submitting: true });
    });
    fireEvent.keyDown(document.body, { key: "Backspace" });
    expect(boardStore.getState().currentInput).toBe("CRA");
  });

  it("f2#42: Enter ignored while submitting is true — no second emission", () => {
    let emitCount = 0;
    const handleEnter = () => {
      emitCount++;
    };
    boardStore.setState({ currentInput: "CRANE", submitting: true });
    render(<BoardGrid onEnter={handleEnter} />);
    act(() => {
      fireEvent.keyDown(document.body, { key: "Enter" });
    });
    expect(emitCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Parallel animation across boards (f2#43–f2#45)
// ---------------------------------------------------------------------------

describe("BoardGrid — parallel flip animation (F2)", () => {
  it("f2#43: all 3 unsolved boards begin animating at t=0 after guess_result", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 1, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 2, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    // All three boards' row-0 tile-0 should be flipping
    for (let b = 0; b < 3; b++) {
      expect(getTile(b, 0, 0)).toHaveAttribute("data-flipping", "true");
    }
  });

  it("f2#44: already-solved board does not animate when new results arrive", () => {
    act(() => {
      boardStore.getState().applyBoardResult(
        0, "apple", ["green", "green", "green", "green", "green"], "solved",
      );
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 1, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 2, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 3, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    // Board 0 row-0 was the solved guess — it should not be flipping
    expect(getTile(0, 0, 0)).not.toHaveAttribute("data-flipping", "true");
  });

  it("f2#45: already-failed board does not animate when new results arrive", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 0 ? { ...b, status: "failed" as const } : b,
        ),
      });
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 1, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 2, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 3, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    // Board 0 is failed — no animation class
    const board0Tiles = document.querySelectorAll(
      '[data-board-index="0"] [data-tile-index]',
    );
    board0Tiles.forEach((tile) => {
      expect(tile).not.toHaveAttribute("data-flipping", "true");
    });
  });
});

// ---------------------------------------------------------------------------
// submitting gate timing (f2#46–f2#49)
// ---------------------------------------------------------------------------

describe("BoardGrid — submitting gate timing (F2)", () => {
  it("f2#46: submitting remains true at 599ms — last tile has not completed yet", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 1, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 2, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(599);
    });
    expect(boardStore.getState().submitting).toBe(true);
  });

  it("f2#47: submitting clears after full animation (~650ms)", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 1, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 2, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(boardStore.getState().submitting).toBe(false);
  });

  it("f2#48: currentInput is cleared only after all animations complete", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.setState({ currentInput: "CRANE", submitting: true });
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(599);
    });
    // Still blocked — currentInput not cleared yet
    expect(boardStore.getState().currentInput).toBe("CRANE");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // After animation: cleared
    expect(boardStore.getState().currentInput).toBe("");
  });

  it("f2#49: keyboard accepts input again after animation completes", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(700);
    });
    fireEvent.keyDown(document.body, { key: "c" });
    expect(boardStore.getState().currentInput).toBe("C");
  });
});

// ---------------------------------------------------------------------------
// Post-animation state transitions (f2#50–f2#53)
// ---------------------------------------------------------------------------

describe("BoardGrid — post-animation state transitions (F2)", () => {
  it("f2#50: completion highlight (data-status=solved) applied only after flip completes", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "apple", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(
      document.querySelector('[data-board-index="0"]'),
    ).toHaveAttribute("data-status", "solved");
  });

  it("f2#51: completion highlight not applied mid-animation", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "apple", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(100); // mid-animation
    });
    // The board status is 'solved' in store but the visual highlight is deferred
    // The test verifies the component does not prematurely render the solved highlight
    expect(
      document.querySelector('[data-board-index="0"]'),
    ).not.toHaveAttribute("data-status", "solved");
  });

  it("f2#52: failed state (data-status=failed) applied after flip on 9th-attempt failure", () => {
    // Seed 8 guesses on board 0 so the next is the 9th
    act(() => {
      for (let g = 0; g < 8; g++) {
        boardStore.getState().applyBoardResult(
          0, "crane", ["grey", "grey", "grey", "grey", "grey"], "unsolved",
        );
      }
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "failed" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(
      document.querySelector('[data-board-index="0"]'),
    ).toHaveAttribute("data-status", "failed");
    // Target word should be revealed
    expect(
      document.querySelector('[data-board-index="0"] [data-reveal-row="true"]'),
    ).toBeInTheDocument();
  });

  it("f2#53: failed state not applied mid-animation on 9th attempt", () => {
    act(() => {
      for (let g = 0; g < 8; g++) {
        boardStore.getState().applyBoardResult(
          0, "crane", ["grey", "grey", "grey", "grey", "grey"], "unsolved",
        );
      }
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "failed" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(100); // mid-animation
    });
    expect(
      document.querySelector('[data-board-index="0"]'),
    ).not.toHaveAttribute("data-status", "failed");
  });
});

// ---------------------------------------------------------------------------
// Gate aggregation across multiple boards (f2#54–f2#56)
// ---------------------------------------------------------------------------

describe("BoardGrid — gate aggregates all boards (F2)", () => {
  it("f2#54: gate waits for both boards when two solve simultaneously", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "apple", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
        { boardIndex: 1, word: "crane", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
      ]);
    });
    // Not cleared mid-animation
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(boardStore.getState().submitting).toBe(true);
    // Cleared after all animations
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(boardStore.getState().submitting).toBe(false);
  });

  it("f2#55: gate waits for all boards regardless of their guess history depth", () => {
    // Board 0 has 3 existing guesses, board 1 has 1 — both get a new guess
    act(() => {
      for (let g = 0; g < 3; g++) {
        boardStore.getState().applyBoardResult(
          0, "crane", ["grey", "grey", "grey", "grey", "grey"], "unsolved",
        );
      }
      boardStore.getState().applyBoardResult(
        1, "crane", ["grey", "grey", "grey", "grey", "grey"], "unsolved",
      );
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "light", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 1, word: "light", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(boardStore.getState().submitting).toBe(true);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(boardStore.getState().submitting).toBe(false);
  });

  it("f2#56: only the newly submitted row animates — previously submitted rows stay static", () => {
    // Pre-seed 2 guess rows on all boards
    act(() => {
      for (let g = 0; g < 2; g++) {
        boardStore.getState().applyAllResults([
          { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
          { boardIndex: 1, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
          { boardIndex: 2, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
          { boardIndex: 3, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        ]);
      }
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "light", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 1, word: "light", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    // Row 0 and row 1 (old guesses) must not have data-flipping
    expect(getTile(0, 0, 0)).not.toHaveAttribute("data-flipping", "true");
    expect(getTile(0, 1, 0)).not.toHaveAttribute("data-flipping", "true");
    // Row 2 (new guess) should be flipping
    expect(getTile(0, 2, 0)).toHaveAttribute("data-flipping", "true");
  });
});
