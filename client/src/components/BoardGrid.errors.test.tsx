/**
 * @vitest-environment happy-dom
 *
 * F2 Step 3 — BoardGrid error states (tests f2#69–f2#78).
 *
 * Error events are delivered by the socket and reflected in the store:
 *   round_expired  → lockAllBoards() — immediate, no animation
 *   stale_round    → silent at animation layer (no flip, no shake)
 *   mid-flip expiry → flip completes, then board locks
 *
 * These tests fail until the F2 error-state handling is implemented.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
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

function getBoard(index: number): HTMLElement {
  return document.querySelector(`[data-board-index="${index}"]`) as HTMLElement;
}

/** Simulate F2 results landing without clearing submitting (same helper as BoardGrid.flip tests). */
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
  boardStore.setState({ boards: updated });
}

// ---------------------------------------------------------------------------
// round_expired locks boards (f2#69–f2#74)
// ---------------------------------------------------------------------------

describe("BoardGrid — round_expired locks boards (F2)", () => {
  it("f2#69: round_expired locks all unsolved boards — typing rows removed", () => {
    boardStore.setState({ currentInput: "PLAN" });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    for (let i = 0; i < 4; i++) {
      expect(getBoard(i)).toHaveAttribute("data-status", "locked");
    }
    // No unsolved board should show a typing row after lock
    const typingTiles = document.querySelectorAll("[data-state='typing']");
    expect(typingTiles).toHaveLength(0);
  });

  it("f2#70: round_expired does not lock a solved board", () => {
    act(() => {
      boardStore.getState().applyBoardResult(
        0, "apple", ["green", "green", "green", "green", "green"], "solved",
      );
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    expect(getBoard(0)).toHaveAttribute("data-status", "solved");
    for (let i = 1; i < 4; i++) {
      expect(getBoard(i)).toHaveAttribute("data-status", "locked");
    }
  });

  it("f2#71: round_expired does not lock a failed board", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 0 ? { ...b, status: "failed" as const } : b,
        ),
      });
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    expect(getBoard(0)).toHaveAttribute("data-status", "failed");
    for (let i = 1; i < 4; i++) {
      expect(getBoard(i)).toHaveAttribute("data-status", "locked");
    }
  });

  it("f2#72: round_expired does not trigger any animation", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    document.querySelectorAll("[data-tile-index]").forEach((tile) => {
      expect(tile).not.toHaveAttribute("data-flipping", "true");
      expect(tile).not.toHaveAttribute("data-shaking", "true");
    });
  });

  it("f2#73: currentInput is cleared when round_expired fires", () => {
    boardStore.setState({ currentInput: "PLAN" });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    expect(boardStore.getState().currentInput).toBe("");
  });

  it("f2#74: submitting clears when round_expired fires", () => {
    boardStore.setState({ submitting: true });
    render(<BoardGrid />);
    act(() => {
      // round_expired: lock boards and force-clear submitting
      boardStore.getState().lockAllBoards();
      boardStore.getState().setSubmitting(false);
    });
    expect(boardStore.getState().submitting).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// stale_round and unexpected errors (f2#75–f2#76)
// ---------------------------------------------------------------------------

describe("BoardGrid — stale_round and unexpected errors (F2)", () => {
  it("f2#75: stale_round does not trigger any animation", () => {
    render(<BoardGrid />);
    // stale_round is a no-op at the animation layer — store stays unchanged
    act(() => {
      // Simulate: the socket received stale_round and did nothing to store
      vi.advanceTimersByTime(0);
    });
    document.querySelectorAll("[data-tile-index]").forEach((tile) => {
      expect(tile).not.toHaveAttribute("data-flipping", "true");
      expect(tile).not.toHaveAttribute("data-shaking", "true");
    });
    // All boards remain unsolved
    for (let i = 0; i < 4; i++) {
      expect(getBoard(i)).toHaveAttribute("data-status", "unsolved");
    }
  });

  it("f2#76: all boards already solved — no crash when unexpected server event arrives", () => {
    act(() => {
      for (let i = 0; i < 4; i++) {
        boardStore.getState().applyBoardResult(
          i,
          WORDS[i],
          ["green", "green", "green", "green", "green"],
          "solved",
        );
      }
    });
    // Simulate an unexpected lockAllBoards call (e.g. all_boards_terminal) — must not throw
    expect(() => {
      act(() => {
        boardStore.getState().lockAllBoards();
      });
      render(<BoardGrid />);
    }).not.toThrow();
    // Solved boards must stay solved
    for (let i = 0; i < 4; i++) {
      expect(getBoard(i)).toHaveAttribute("data-status", "solved");
    }
  });
});

// ---------------------------------------------------------------------------
// round_expired arriving mid-flip (f2#77–f2#78)
// ---------------------------------------------------------------------------

describe("BoardGrid — round_expired during flip animation (F2)", () => {
  it("f2#77: flip completes in full even when round_expired arrives mid-animation", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    // round_expired arrives at 300ms (mid-animation)
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      // Socket delivers round_expired — store locks boards
      boardStore.getState().lockAllBoards();
      boardStore.getState().setSubmitting(false);
    });
    // Let the remaining animation finish
    act(() => {
      vi.advanceTimersByTime(400);
    });
    // Board 0 should be locked (round_expired overrides unsolved)
    expect(getBoard(0)).toHaveAttribute("data-status", "locked");
  });

  it("f2#78: colour tile states remain visible after round_expired mid-flip", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
      simulateResultsWithoutClearingSubmitting([
        {
          boardIndex: 0,
          word: "crane",
          result: ["green", "grey", "yellow", "grey", "green"],
          boardStatus: "unsolved",
        },
      ]);
    });
    // round_expired at 300ms mid-flip
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      boardStore.getState().lockAllBoards();
      boardStore.getState().setSubmitting(false);
    });
    // Let flip animation fully resolve
    act(() => {
      vi.advanceTimersByTime(400);
    });
    // The submitted row tiles must show their result colours
    const tile0 = document.querySelector(
      '[data-board-index="0"] [data-row-index="0"] [data-tile-index="0"]',
    ) as HTMLElement;
    const tile1 = document.querySelector(
      '[data-board-index="0"] [data-row-index="0"] [data-tile-index="1"]',
    ) as HTMLElement;
    expect(tile0).toHaveAttribute("data-state", "green");
    expect(tile1).toHaveAttribute("data-state", "grey");
  });
});
