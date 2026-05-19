/**
 * @vitest-environment happy-dom
 *
 * Step 4B — Timer expiry lock (tests #126–132).
 *
 * All tests simulate the round_ended event by calling lockAllBoards() directly on
 * the store, which is the state transition the component triggers in response to
 * receiving round_ended (or a round_expired error) from the server.
 *
 * In the shared simultaneous input model there is no active/idle board distinction.
 * Boards are either unsolved (receiving shared input) or terminal (not receiving input).
 * lockAllBoards() transitions all unsolved boards to locked and clears the global currentInput.
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
// Lock transitions (tests #126–129)
// ---------------------------------------------------------------------------

describe("BoardGrid — round_ended timer expiry", () => {
  it("126: round_ended locks all unsolved boards", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    for (let i = 0; i < 4; i++) {
      expect(getBoard(i)).toHaveAttribute("data-status", "locked");
    }
  });

  it("127: round_ended does not lock a solved board", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 0 ? { ...b, status: "solved" } : b,
        ),
      });
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    expect(getBoard(0)).toHaveAttribute("data-status", "solved");
  });

  it("128: round_ended does not lock a failed board", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 0 ? { ...b, status: "failed" } : b,
        ),
      });
    });
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    expect(getBoard(0)).toHaveAttribute("data-status", "failed");
  });

  it("129: shared currentInput is cleared when boards lock", () => {
    render(<BoardGrid />);
    pressKey("a");
    pressKey("p");
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Input blocked post-lock (test #130)
// ---------------------------------------------------------------------------

describe("BoardGrid — input blocked after lock", () => {
  it("130: keyboard input is blocked on all boards after round_ended", () => {
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    render(<BoardGrid />);
    pressKey("c");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Mid-animation expiry (tests #131–132)
// ---------------------------------------------------------------------------

describe("BoardGrid — mid-animation round expiry", () => {
  it("131: board locks cleanly even when a flip animation was in progress at expiry", () => {
    vi.useFakeTimers();
    render(<BoardGrid />);
    // A guess is in-flight: global submitting flag is true before the round expires
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).setSubmitting(true);
    });
    // Round expires
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    // Advance past the full animation window (~600ms for 5 tiles)
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(getBoard(0)).toHaveAttribute("data-status", "locked");
  });

  it("132: a guess in-flight at expiry does not count — board stays locked, not solved or failed", () => {
    vi.useFakeTimers();
    render(<BoardGrid />);
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).setSubmitting(true);
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
