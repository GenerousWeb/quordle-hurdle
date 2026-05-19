/**
 * @vitest-environment happy-dom
 *
 * F2 Step 3 — BoardGrid shake animation (tests f2#57–f2#68).
 *
 * The shake is triggered by the socket delivering a `not_a_word` error.
 * In tests this is simulated via setShaking(true) / setShaking(false) on the
 * store, which is how useGameSocket drives the shake in the F2 implementation.
 *
 * DOM conventions:
 *   data-shaking="true"  — applied to the current-input-row tiles of all
 *                          unsolved boards while the shake is active
 *
 * Shake duration: ~400ms. After shake: submitting=false, currentInput preserved.
 *
 * These tests fail until the F2 shake + board-exclusion logic is implemented.
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

function getCurrentRowTile(boardIndex: number, tileIndex: number): HTMLElement {
  // Current row is the first row with no submitted guess
  const rowIndex = boardStore.getState().boards[boardIndex]?.guesses.length ?? 0;
  return document.querySelector(
    `[data-board-index="${boardIndex}"] [data-row-index="${rowIndex}"] [data-tile-index="${tileIndex}"]`,
  ) as HTMLElement;
}

// ---------------------------------------------------------------------------
// Shake triggering and board targeting (f2#57–f2#58)
// ---------------------------------------------------------------------------

describe("BoardGrid — shake triggers on unsolved boards (F2)", () => {
  it("f2#57: shake class applied to current-row tiles of all 4 unsolved boards on not_a_word", () => {
    boardStore.setState({ currentInput: "CRANE" });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setShaking(true);
    });
    for (let b = 0; b < 4; b++) {
      for (let t = 0; t < 5; t++) {
        expect(getCurrentRowTile(b, t)).toHaveAttribute("data-shaking", "true");
      }
    }
  });

  it("f2#58: shake applies only to unsolved boards — solved board is excluded", () => {
    act(() => {
      boardStore.getState().applyBoardResult(
        0, "apple", ["green", "green", "green", "green", "green"], "solved",
      );
    });
    boardStore.setState({ currentInput: "CRANE" });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setShaking(true);
    });
    // Board 0 is solved — no shake
    for (let t = 0; t < 5; t++) {
      expect(getCurrentRowTile(0, t)).not.toHaveAttribute("data-shaking", "true");
    }
    // Boards 1–3 shake
    for (let b = 1; b < 4; b++) {
      expect(getCurrentRowTile(b, 0)).toHaveAttribute("data-shaking", "true");
    }
  });
});

// ---------------------------------------------------------------------------
// Shake lifecycle (f2#59–f2#64)
// ---------------------------------------------------------------------------

describe("BoardGrid — shake lifecycle (F2)", () => {
  it("f2#59: shake class removed after animation completes (~400ms)", () => {
    boardStore.setState({ currentInput: "CRANE" });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setShaking(true);
    });
    act(() => {
      vi.advanceTimersByTime(450);
    });
    for (let b = 0; b < 4; b++) {
      expect(getCurrentRowTile(b, 0)).not.toHaveAttribute("data-shaking", "true");
    }
  });

  it("f2#60: no colour change during or after shake — tile states unchanged", () => {
    // Submit one guess to give row 0 a result, then shake on row 1
    act(() => {
      boardStore.getState().applyAllResults([
        { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
      boardStore.setState({ currentInput: "LIGHT" });
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setShaking(true);
      vi.advanceTimersByTime(500);
    });
    // Row 0 tile 0 was submitted as grey — must remain grey
    const submittedTile = document.querySelector(
      '[data-board-index="0"] [data-row-index="0"] [data-tile-index="0"]',
    ) as HTMLElement;
    expect(submittedTile).toHaveAttribute("data-state", "grey");
  });

  it("f2#61: current row index does not advance after shake", () => {
    boardStore.setState({ currentInput: "CRANE" });
    render(<BoardGrid />);
    const guessCountBefore = boardStore.getState().boards[0].guesses.length;
    act(() => {
      boardStore.getState().setShaking(true);
      vi.advanceTimersByTime(500);
    });
    expect(boardStore.getState().boards[0].guesses.length).toBe(guessCountBefore);
  });

  it("f2#62: currentInput is preserved after shake", () => {
    boardStore.setState({ currentInput: "CRANE" });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setShaking(true);
      vi.advanceTimersByTime(500);
    });
    expect(boardStore.getState().currentInput).toBe("CRANE");
  });

  it("f2#63: submitting clears after shake completes", () => {
    boardStore.setState({ currentInput: "CRANE", submitting: true });
    render(<BoardGrid />);
    // Simulate socket: not_a_word response → clears submitting after shake
    act(() => {
      boardStore.getState().setShaking(true);
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(boardStore.getState().submitting).toBe(false);
  });

  it("f2#64: player can retype after shake completes", () => {
    boardStore.setState({ currentInput: "CRANE", submitting: false });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setShaking(true);
      vi.advanceTimersByTime(500);
    });
    // Backspace removes the last letter, then retype
    fireEvent.keyDown(document.body, { key: "Backspace" });
    fireEvent.keyDown(document.body, { key: "s" });
    expect(boardStore.getState().currentInput).toBe("CRANS");
  });
});

// ---------------------------------------------------------------------------
// Shake / flip mutual exclusivity (f2#65–f2#68)
// ---------------------------------------------------------------------------

describe("BoardGrid — shake does not conflict with flip (F2)", () => {
  it("f2#65: shake does not apply data-flipping to any tile", () => {
    boardStore.setState({ currentInput: "CRANE" });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setShaking(true);
    });
    document.querySelectorAll("[data-tile-index]").forEach((tile) => {
      expect(tile).not.toHaveAttribute("data-flipping", "true");
    });
  });

  it("f2#66: board at 9 attempts receives shake on not_a_word — does not fail", () => {
    // Seed 9 guesses (unsolved each time) — the board should NOT be failed
    act(() => {
      for (let g = 0; g < 9; g++) {
        boardStore.getState().applyBoardResult(
          0, "crane", ["grey", "grey", "grey", "grey", "grey"], "unsolved",
        );
      }
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setShaking(true);
      vi.advanceTimersByTime(500);
    });
    // Board status must still be unsolved — shake does not fail the board
    expect(boardStore.getState().boards[0].status).toBe("unsolved");
    expect(
      document.querySelector('[data-board-index="0"] [data-reveal-row="true"]'),
    ).not.toBeInTheDocument();
  });

  it("f2#67: shake does not apply to already-locked boards", () => {
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setShaking(true);
    });
    document.querySelectorAll("[data-tile-index]").forEach((tile) => {
      expect(tile).not.toHaveAttribute("data-shaking", "true");
    });
  });

  it("f2#68: shake is ignored when submitting is true — flip takes precedence", () => {
    boardStore.setState({ currentInput: "CRANE", submitting: true });
    render(<BoardGrid />);
    act(() => {
      // Attempting to shake while submitting (flip in progress) should be a no-op
      boardStore.getState().setShaking(true);
    });
    // With submitting=true the shake must not be applied to any tile
    document.querySelectorAll("[data-tile-index]").forEach((tile) => {
      expect(tile).not.toHaveAttribute("data-shaking", "true");
    });
  });
});
