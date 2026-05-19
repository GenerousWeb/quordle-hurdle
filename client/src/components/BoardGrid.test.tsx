/**
 * @vitest-environment happy-dom
 *
 * Step 2 — Board grid UI, shared keyboard input (tests #60–81).
 *
 * All four boards receive the same typed input simultaneously. There is no focus
 * model — every unsolved board displays the shared currentInput identically.
 *
 * Expected DOM conventions:
 *   - Each board container: data-board-index="{0–3}" data-status="{unsolved|solved|failed|locked}"
 *   - Each row inside a board: data-row-index="{0–8}"
 *   - Each tile inside a row: data-tile-index="{0–4}" (data-result absent until submitted)
 *   - Failed board: target word text visible below the tile grid
 */
import { describe, it, expect, beforeEach } from "vitest";
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

function getBoard(index: number): HTMLElement {
  return document.querySelector(`[data-board-index="${index}"]`) as HTMLElement;
}

function getBoards(): NodeListOf<Element> {
  return document.querySelectorAll("[data-board-index]");
}

function getRows(boardIndex: number): NodeListOf<Element> {
  return document.querySelectorAll(`[data-board-index="${boardIndex}"] [data-row-index]`);
}

function getTiles(boardIndex: number, rowIndex: number): NodeListOf<Element> {
  return document.querySelectorAll(
    `[data-board-index="${boardIndex}"] [data-row-index="${rowIndex}"] [data-tile-index]`,
  );
}

function getTile(boardIndex: number, rowIndex: number, tileIndex: number): HTMLElement {
  return document.querySelector(
    `[data-board-index="${boardIndex}"] [data-row-index="${rowIndex}"] [data-tile-index="${tileIndex}"]`,
  ) as HTMLElement;
}

function pressKey(key: string) {
  fireEvent.keyDown(document.body, { key });
}

// ---------------------------------------------------------------------------
// Rendering (tests #60–66)
// ---------------------------------------------------------------------------

describe("BoardGrid — rendering", () => {
  it("60: renders 4 boards", () => {
    render(<BoardGrid />);
    expect(getBoards()).toHaveLength(4);
  });

  it("61: renders 9 rows per board", () => {
    render(<BoardGrid />);
    expect(getRows(0)).toHaveLength(9);
  });

  it("62: renders 5 tiles per row", () => {
    render(<BoardGrid />);
    expect(getTiles(0, 0)).toHaveLength(5);
  });

  it("63: all boards show unsolved state on init", () => {
    render(<BoardGrid />);
    for (let i = 0; i < 4; i++) {
      expect(getBoard(i)).toHaveAttribute("data-status", "unsolved");
    }
  });

  it("64: solved board has data-status='solved'", () => {
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyBoardResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    });
    render(<BoardGrid />);
    expect(getBoard(0)).toHaveAttribute("data-status", "solved");
  });

  it("65: failed board shows target word below the grid", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 0 ? { ...b, status: "failed" } : b,
        ),
      });
    });
    render(<BoardGrid />);
    // targetWord for board 0 is "apple"
    expect(getBoard(0).textContent?.toLowerCase()).toContain("apple");
  });

  it("66: all boards have data-status='locked' after lockAllBoards", () => {
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    render(<BoardGrid />);
    for (let i = 0; i < 4; i++) {
      expect(getBoard(i)).toHaveAttribute("data-status", "locked");
    }
  });
});

// ---------------------------------------------------------------------------
// Shared keyboard input — all unsolved boards (tests #67–75)
// ---------------------------------------------------------------------------

describe("BoardGrid — shared keyboard input", () => {
  it("67: typing a letter updates shared input on ALL unsolved boards", () => {
    render(<BoardGrid />);
    pressKey("c");
    for (let i = 0; i < 4; i++) {
      expect(getTile(i, 0, 0)).toHaveTextContent("C");
    }
  });

  it("68: typing 5 letters fills current row on all unsolved boards", () => {
    render(<BoardGrid />);
    for (const key of ["a", "p", "p", "l", "e"]) {
      pressKey(key);
    }
    for (let i = 0; i < 4; i++) {
      for (let t = 0; t < 5; t++) {
        expect(getTile(i, 0, t).textContent).not.toBe("");
      }
    }
  });

  it("69: typing 6th letter has no effect on any board — shared input capped at 5", () => {
    render(<BoardGrid />);
    for (const key of ["a", "p", "p", "l", "e", "x"]) {
      pressKey(key);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toHaveLength(5);
  });

  it("70: backspace removes last letter from all unsolved boards", () => {
    render(<BoardGrid />);
    for (const key of ["a", "p", "p"]) pressKey(key);
    pressKey("Backspace");
    for (let i = 0; i < 4; i++) {
      expect(getTile(i, 0, 2).textContent).toBe("");
    }
  });

  it("71: backspace on empty row is a no-op on all boards", () => {
    render(<BoardGrid />);
    pressKey("Backspace");
    for (let i = 0; i < 4; i++) {
      expect(getTile(i, 0, 0).textContent).toBe("");
    }
  });

  it("72: typing does not appear on solved board", () => {
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyBoardResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    });
    render(<BoardGrid />);
    pressKey("c");
    // Board 0 is solved with 1 submitted guess; row 1 (next potential row) stays empty
    expect(getTile(0, 1, 0).textContent).toBe("");
    // Unsolved boards show the typed letter in their current row
    expect(getTile(1, 0, 0)).toHaveTextContent("C");
  });

  it("73: typing does not appear on failed board", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 0 ? { ...b, status: "failed" } : b,
        ),
      });
    });
    render(<BoardGrid />);
    pressKey("c");
    expect(getTile(0, 0, 0).textContent).toBe("");
    expect(getTile(1, 0, 0)).toHaveTextContent("C");
  });

  it("74: typing blocked when all boards terminal", () => {
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    render(<BoardGrid />);
    pressKey("c");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("");
  });

  it("75: enter with fewer than 5 letters is ignored on all boards", () => {
    render(<BoardGrid />);
    for (const key of ["a", "p", "p"]) pressKey(key);
    pressKey("Enter");
    boardStore.getState().boards.forEach((b) => {
      expect(b.guesses).toHaveLength(0);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("APP");
  });
});

// ---------------------------------------------------------------------------
// No click-to-focus (test #76)
// ---------------------------------------------------------------------------

describe("BoardGrid — no focus model", () => {
  it("76: clicking a board does not change any board status — no focus model", () => {
    render(<BoardGrid />);
    const before = boardStore.getState().boards.map((b) => b.status);
    fireEvent.click(getBoard(2));
    const after = boardStore.getState().boards.map((b) => b.status);
    expect(after).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// Visual states and independent result colours (tests #77–79)
// ---------------------------------------------------------------------------

describe("BoardGrid — visual states and result colours", () => {
  it("77: solved board shows completion highlight via data-status='solved'", () => {
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyBoardResult(1, "grape", ["green", "green", "green", "green", "green"], "solved");
    });
    render(<BoardGrid />);
    expect(getBoard(1)).toHaveAttribute("data-status", "solved");
  });

  it("78: submitted guess row shows independent result colours per board", () => {
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyAllResults([
        { boardIndex: 0, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 1, word: "crane", result: ["green", "green", "green", "green", "green"], boardStatus: "solved" },
      ]);
    });
    render(<BoardGrid />);
    expect(getTile(0, 0, 0)).toHaveAttribute("data-state", "grey");
    expect(getTile(1, 0, 0)).toHaveAttribute("data-state", "green");
  });

  it("79: different results on different boards from same guess", () => {
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyAllResults([
        { boardIndex: 0, word: "crane", result: ["grey", "green", "grey", "grey", "green"], boardStatus: "unsolved" },
        { boardIndex: 1, word: "crane", result: ["green", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    render(<BoardGrid />);
    expect(getTile(0, 0, 0)).toHaveAttribute("data-state", "grey");
    expect(getTile(1, 0, 0)).toHaveAttribute("data-state", "green");
  });
});

// ---------------------------------------------------------------------------
// Responsive layout (tests #80–81)
// ---------------------------------------------------------------------------

describe("BoardGrid — responsive layout", () => {
  it("80: layout renders at mobile width (375px)", () => {
    Object.defineProperty(window, "innerWidth", { value: 375, configurable: true });
    const { container } = render(<BoardGrid />);
    expect(container.querySelector('[data-board-index="0"]')).toBeInTheDocument();
    expect(container.querySelector('[data-board-index="3"]')).toBeInTheDocument();
  });

  it("81: layout renders at desktop width (1280px)", () => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    const { container } = render(<BoardGrid />);
    expect(container.querySelector('[data-board-index="0"]')).toBeInTheDocument();
    expect(container.querySelector('[data-board-index="3"]')).toBeInTheDocument();
  });
});
