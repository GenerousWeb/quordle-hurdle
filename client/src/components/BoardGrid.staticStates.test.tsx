/**
 * @vitest-environment happy-dom
 *
 * F2 Step 1 — BoardGrid static visual states (tests f2#13–f2#31).
 *
 * DOM conventions for F2:
 *   Tile:        data-tile-index  data-state="empty|typing|green|yellow|grey"
 *   Board:       data-board-index data-status="unsolved|solved|failed|locked"
 *   Reveal row:  data-reveal-row="true"  (child of failed board container)
 *
 * These tests fail until the F2 BoardGrid + Tile implementation is in place.
 */
import { describe, it, expect, beforeEach } from "vitest";
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
});

function getBoard(index: number): HTMLElement {
  return document.querySelector(`[data-board-index="${index}"]`) as HTMLElement;
}

function getBoards(): NodeListOf<Element> {
  return document.querySelectorAll("[data-board-index]");
}

function getRows(boardIndex: number): NodeListOf<Element> {
  return document.querySelectorAll(
    `[data-board-index="${boardIndex}"] [data-row-index]`,
  );
}

function getTiles(boardIndex: number, rowIndex: number): NodeListOf<Element> {
  return document.querySelectorAll(
    `[data-board-index="${boardIndex}"] [data-row-index="${rowIndex}"] [data-tile-index]`,
  );
}

function getTile(
  boardIndex: number,
  rowIndex: number,
  tileIndex: number,
): HTMLElement {
  return document.querySelector(
    `[data-board-index="${boardIndex}"] [data-row-index="${rowIndex}"] [data-tile-index="${tileIndex}"]`,
  ) as HTMLElement;
}

// ---------------------------------------------------------------------------
// Grid structure (f2#13–f2#16)
// ---------------------------------------------------------------------------

describe("BoardGrid — grid structure (F2)", () => {
  it("f2#13: renders 4 board containers", () => {
    render(<BoardGrid />);
    expect(getBoards()).toHaveLength(4);
  });

  it("f2#14: renders 9 rows per board", () => {
    render(<BoardGrid />);
    expect(getRows(0)).toHaveLength(9);
    expect(getRows(3)).toHaveLength(9);
  });

  it("f2#15: renders 5 tiles per row", () => {
    render(<BoardGrid />);
    expect(getTiles(0, 0)).toHaveLength(5);
    expect(getTiles(3, 8)).toHaveLength(5);
  });

  it("f2#16: all 180 tiles have empty state on init", () => {
    render(<BoardGrid />);
    const allTiles = document.querySelectorAll("[data-tile-index]");
    expect(allTiles).toHaveLength(180);
    allTiles.forEach((tile) => {
      expect(tile).toHaveAttribute("data-state", "empty");
      expect(tile).toHaveTextContent("");
    });
  });
});

// ---------------------------------------------------------------------------
// Shared currentInput rendering (f2#17–f2#20)
// ---------------------------------------------------------------------------

describe("BoardGrid — shared currentInput rendering (F2)", () => {
  it("f2#17: shared currentInput 'CRANE' renders on all 4 unsolved boards with typing state", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.setState({ currentInput: "CRANE" });
    });
    const letters = ["C", "R", "A", "N", "E"];
    for (let b = 0; b < 4; b++) {
      for (let t = 0; t < 5; t++) {
        const tile = getTile(b, 0, t);
        expect(tile).toHaveAttribute("data-state", "typing");
        expect(tile).toHaveTextContent(letters[t]);
      }
    }
  });

  it("f2#18: shared input does not render on solved board — typing state only on unsolved boards", () => {
    act(() => {
      boardStore.getState().applyBoardResult(
        0,
        "apple",
        ["green", "green", "green", "green", "green"],
        "solved",
      );
      boardStore.setState({ currentInput: "CRANE" });
    });
    render(<BoardGrid />);
    // Board 0 is solved — its row 1 tiles should be empty, not typing
    for (let t = 0; t < 5; t++) {
      expect(getTile(0, 1, t)).toHaveAttribute("data-state", "empty");
    }
    // Boards 1–3 should show CRANE in typing state
    for (let b = 1; b < 4; b++) {
      expect(getTile(b, 0, 0)).toHaveAttribute("data-state", "typing");
    }
  });

  it("f2#19: shared input does not render on failed board", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 0 ? { ...b, status: "failed" as const } : b,
        ),
        currentInput: "CRANE",
      });
    });
    render(<BoardGrid />);
    // Board 0 failed — its current row tiles are empty
    for (let t = 0; t < 5; t++) {
      expect(getTile(0, 0, t)).toHaveAttribute("data-state", "empty");
    }
    // Boards 1–3 show CRANE
    for (let b = 1; b < 4; b++) {
      expect(getTile(b, 0, 0)).toHaveAttribute("data-state", "typing");
    }
  });

  it("f2#20: shared input does not render on locked board", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 0 ? { ...b, status: "locked" as const } : b,
        ),
        currentInput: "CRANE",
      });
    });
    render(<BoardGrid />);
    for (let t = 0; t < 5; t++) {
      expect(getTile(0, 0, t)).toHaveAttribute("data-state", "empty");
    }
    for (let b = 1; b < 4; b++) {
      expect(getTile(b, 0, 0)).toHaveAttribute("data-state", "typing");
    }
  });
});

// ---------------------------------------------------------------------------
// Solved board visual state (f2#21–f2#22)
// ---------------------------------------------------------------------------

describe("BoardGrid — solved board visual state (F2)", () => {
  it("f2#21: solved board has data-status='solved' on its container", () => {
    act(() => {
      boardStore.getState().applyBoardResult(
        1,
        "grape",
        ["green", "green", "green", "green", "green"],
        "solved",
      );
    });
    render(<BoardGrid />);
    expect(getBoard(1)).toHaveAttribute("data-status", "solved");
  });

  it("f2#22: unsolved boards have no solved status on init", () => {
    render(<BoardGrid />);
    for (let i = 0; i < 4; i++) {
      expect(getBoard(i)).not.toHaveAttribute("data-status", "solved");
    }
  });
});

// ---------------------------------------------------------------------------
// Failed board visual state (f2#23–f2#26)
// ---------------------------------------------------------------------------

describe("BoardGrid — failed board visual state (F2)", () => {
  it("f2#23: failed board has data-status='failed' on its container", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 2 ? { ...b, status: "failed" as const } : b,
        ),
      });
    });
    render(<BoardGrid />);
    expect(getBoard(2)).toHaveAttribute("data-status", "failed");
  });

  it("f2#24: failed board shows target word in reveal row", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 2 ? { ...b, status: "failed" as const } : b,
        ),
      });
    });
    render(<BoardGrid />);
    const revealRow = getBoard(2).querySelector("[data-reveal-row='true']");
    expect(revealRow).toBeInTheDocument();
    expect(revealRow?.textContent?.toUpperCase()).toContain("STONE");
  });

  it("f2#25: failed board reveal row is the 10th child of the board tile grid", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 2 ? { ...b, status: "failed" as const } : b,
        ),
      });
    });
    render(<BoardGrid />);
    const board = getBoard(2);
    const revealRow = board.querySelector("[data-reveal-row='true']");
    expect(revealRow).toBeInTheDocument();
    // The reveal row must come after all 9 guess rows
    const rows = board.querySelectorAll("[data-row-index]");
    expect(rows).toHaveLength(9);
    const lastRow = rows[8];
    // Reveal row is the next sibling after the last guess row, or a direct child after it
    const revealRowEl = revealRow as HTMLElement;
    const lastRowEl = lastRow as HTMLElement;
    expect(
      lastRowEl.compareDocumentPosition(revealRowEl) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("f2#26: unsolved board has no reveal row", () => {
    render(<BoardGrid />);
    for (let i = 0; i < 4; i++) {
      expect(
        getBoard(i).querySelector("[data-reveal-row='true']"),
      ).not.toBeInTheDocument();
    }
  });
});

// ---------------------------------------------------------------------------
// Result colour rendering (f2#27–f2#28)
// ---------------------------------------------------------------------------

describe("BoardGrid — result colour rendering (F2)", () => {
  it("f2#27: submitted guess row shows correct tile states — green/yellow/grey", () => {
    act(() => {
      boardStore.getState().applyAllResults([
        {
          boardIndex: 0,
          word: "crane",
          result: ["green", "grey", "yellow", "grey", "green"],
          boardStatus: "unsolved",
        },
      ]);
    });
    render(<BoardGrid />);
    expect(getTile(0, 0, 0)).toHaveAttribute("data-state", "green");
    expect(getTile(0, 0, 1)).toHaveAttribute("data-state", "grey");
    expect(getTile(0, 0, 2)).toHaveAttribute("data-state", "yellow");
    expect(getTile(0, 0, 3)).toHaveAttribute("data-state", "grey");
    expect(getTile(0, 0, 4)).toHaveAttribute("data-state", "green");
  });

  it("f2#28: two boards show different tile states for the same guess", () => {
    act(() => {
      boardStore.getState().applyAllResults([
        {
          boardIndex: 0,
          word: "crane",
          result: ["grey", "grey", "grey", "grey", "grey"],
          boardStatus: "unsolved",
        },
        {
          boardIndex: 1,
          word: "crane",
          result: ["green", "green", "green", "green", "green"],
          boardStatus: "solved",
        },
      ]);
    });
    render(<BoardGrid />);
    expect(getTile(0, 0, 0)).toHaveAttribute("data-state", "grey");
    expect(getTile(1, 0, 0)).toHaveAttribute("data-state", "green");
  });
});

// ---------------------------------------------------------------------------
// Responsive layout (f2#29–f2#30)
// ---------------------------------------------------------------------------

describe("BoardGrid — responsive layout (F2)", () => {
  it("f2#29: renders all 4 boards at 375px viewport without error", () => {
    Object.defineProperty(window, "innerWidth", { value: 375, configurable: true });
    const { container } = render(<BoardGrid />);
    expect(container.querySelector('[data-board-index="0"]')).toBeInTheDocument();
    expect(container.querySelector('[data-board-index="3"]')).toBeInTheDocument();
  });

  it("f2#30: renders all 4 boards at 1280px viewport without error", () => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    const { container } = render(<BoardGrid />);
    expect(container.querySelector('[data-board-index="0"]')).toBeInTheDocument();
    expect(container.querySelector('[data-board-index="3"]')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Mixed board states (f2#31)
// ---------------------------------------------------------------------------

describe("BoardGrid — mixed board states (F2)", () => {
  it("f2#31: mix of all four board states renders without error and with correct statuses", () => {
    act(() => {
      // Board 0: solved
      boardStore.getState().applyBoardResult(
        0,
        "apple",
        ["green", "green", "green", "green", "green"],
        "solved",
      );
      // Board 1: failed
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 1 ? { ...b, status: "failed" as const } : b,
        ),
      });
      // Board 2: locked
      boardStore.setState({
        boards: boardStore.getState().boards.map((b, i) =>
          i === 2 ? { ...b, status: "locked" as const } : b,
        ),
      });
      // Board 3: unsolved (default)
    });
    expect(() => render(<BoardGrid />)).not.toThrow();
    expect(getBoard(0)).toHaveAttribute("data-status", "solved");
    expect(getBoard(1)).toHaveAttribute("data-status", "failed");
    expect(getBoard(2)).toHaveAttribute("data-status", "locked");
    expect(getBoard(3)).toHaveAttribute("data-status", "unsolved");
  });
});
