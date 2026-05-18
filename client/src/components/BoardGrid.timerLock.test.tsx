/**
 * @vitest-environment happy-dom
 *
 * Step 4B — Timer expiry lock (tests #138–146).
 *
 * All tests simulate the round_ended event by calling lockAllBoards() directly on
 * the store, which is the state transition the component triggers in response to
 * receiving round_ended (or a round_expired error) from the server.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { BoardGrid } from "./BoardGrid";
import { boardStore } from "../store/boardStore";

const WORDS = ["apple", "grape", "stone", "light"];

function resetAndInit() {
  boardStore.setState({ boards: [] });
  boardStore.getState().initBoards(WORDS);
}

beforeEach(() => {
  resetAndInit();
});

afterEach(() => {
  vi.useRealTimers();
});

function getBoard(index: number): HTMLElement {
  return document.querySelector(`[data-board-index="${index}"]`) as HTMLElement;
}

function pressKey(key: string) {
  fireEvent.keyDown(document.body, { key });
}

// ---------------------------------------------------------------------------
// Lock transitions (tests #138–142)
// ---------------------------------------------------------------------------

describe("BoardGrid — round_ended timer expiry", () => {
  it("138: active board transitions to locked on round_ended", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    expect(getBoard(0)).toHaveAttribute("data-status", "locked");
  });

  it("139: all idle boards transition to locked on round_ended", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    expect(getBoard(1)).toHaveAttribute("data-status", "locked");
    expect(getBoard(2)).toHaveAttribute("data-status", "locked");
    expect(getBoard(3)).toHaveAttribute("data-status", "locked");
  });

  it("140: round_ended does not overwrite a solved board", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore
          .getState()
          .boards.map((b, i) => (i === 0 ? { ...b, status: "solved" } : b)),
      });
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    expect(getBoard(0)).toHaveAttribute("data-status", "solved");
  });

  it("141: round_ended does not overwrite a failed board", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore
          .getState()
          .boards.map((b, i) => (i === 0 ? { ...b, status: "failed" } : b)),
      });
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    expect(getBoard(0)).toHaveAttribute("data-status", "failed");
  });

  it("142: currentInput on the active board is cleared when it locks", () => {
    render(<BoardGrid />);
    pressKey("a");
    pressKey("p");
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    expect(boardStore.getState().boards[0].currentInput).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Input and focus blocked post-lock (tests #143–144)
// ---------------------------------------------------------------------------

describe("BoardGrid — input and focus blocked after lock", () => {
  it("143: keyboard input is blocked on all boards after round_ended", () => {
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    render(<BoardGrid />);
    pressKey("c");
    for (let i = 0; i < 4; i++) {
      expect(boardStore.getState().boards[i].currentInput).toBe("");
    }
  });

  it("144: clicking a locked board does not shift focus to it", () => {
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    render(<BoardGrid />);
    fireEvent.click(getBoard(1));
    expect(getBoard(1)).toHaveAttribute("data-status", "locked");
  });
});

// ---------------------------------------------------------------------------
// Mid-animation expiry (tests #145–146)
// ---------------------------------------------------------------------------

describe("BoardGrid — mid-animation round expiry", () => {
  it("145: board locks cleanly even when a flip animation was in progress at expiry", () => {
    vi.useFakeTimers();
    render(<BoardGrid />);
    // A guess is in-flight: set the submitting flag before the round expires
    act(() => {
      boardStore.getState().setSubmitting(0, true);
    });
    // Round expires
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    // Advance past the full animation window to confirm the board stays locked
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(getBoard(0)).toHaveAttribute("data-status", "locked");
  });

  it("146: a guess in-flight at expiry does not count — board remains locked, not solved or failed", () => {
    vi.useFakeTimers();
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(0, true);
    });
    // Round expires before guess_result arrives from the server
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    const status = boardStore.getState().boards[0].status;
    expect(status).toBe("locked");
    expect(status).not.toBe("solved");
    expect(status).not.toBe("failed");
  });
});
