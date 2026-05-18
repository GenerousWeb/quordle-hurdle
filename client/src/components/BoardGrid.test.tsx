/**
 * @vitest-environment happy-dom
 *
 * Step 2 — Board grid UI, keyboard input, and focus rules (tests #70–95).
 *
 * These tests drive the implementation of <BoardGrid /> in BoardGrid.tsx.
 * Expected DOM conventions:
 *   - Each board container: data-board-index="{0–3}" data-status="{status}"
 *   - Each row inside a board: data-row-index="{0–8}"
 *   - Each tile inside a row: data-tile-index="{0–4}" data-result="{green|yellow|grey}"
 *     (data-result is absent on tiles that have not yet been submitted)
 *   - The target-word reveal row on a failed board contains the target word as text content
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { BoardGrid } from "./BoardGrid";
import { boardStore } from "../store/boardStore";
import type { TileResult } from "shared/types/game";

const WORDS = ["apple", "grape", "stone", "light"];

function resetAndInit() {
  boardStore.setState({ boards: [] });
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

function pressKey(key: string) {
  fireEvent.keyDown(document.body, { key });
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("BoardGrid — rendering", () => {
  it("70: renders exactly 4 board containers", () => {
    render(<BoardGrid />);
    expect(getBoards()).toHaveLength(4);
  });

  it("71: each board renders 9 rows", () => {
    render(<BoardGrid />);
    expect(getRows(0)).toHaveLength(9);
  });

  it("72: each row renders 5 tiles", () => {
    render(<BoardGrid />);
    expect(getTiles(0, 0)).toHaveLength(5);
  });

  it("73: board 0 starts with data-status='active'", () => {
    render(<BoardGrid />);
    expect(getBoard(0)).toHaveAttribute("data-status", "active");
  });

  it("74: boards 1–3 start with data-status='idle'", () => {
    render(<BoardGrid />);
    expect(getBoard(1)).toHaveAttribute("data-status", "idle");
    expect(getBoard(2)).toHaveAttribute("data-status", "idle");
    expect(getBoard(3)).toHaveAttribute("data-status", "idle");
  });

  it("75: board in solved state has data-status='solved'", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore
          .getState()
          .boards.map((b, i) => (i === 0 ? { ...b, status: "solved" } : b)),
      });
    });
    render(<BoardGrid />);
    expect(getBoard(0)).toHaveAttribute("data-status", "solved");
  });

  it("76: failed board shows its target word in the reveal row", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore
          .getState()
          .boards.map((b, i) => (i === 0 ? { ...b, status: "failed" } : b)),
      });
    });
    render(<BoardGrid />);
    // targetWord for board 0 is "apple"
    expect(getBoard(0).textContent?.toLowerCase()).toContain("apple");
  });

  it("77: all boards have data-status='locked' after lockAllBoards", () => {
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
// Keyboard input
// ---------------------------------------------------------------------------

describe("BoardGrid — keyboard input", () => {
  it("78: typing a letter shows it in the active board's current-row first tile", () => {
    render(<BoardGrid />);
    pressKey("c");
    expect(getTile(0, 0, 0)).toHaveTextContent("C");
  });

  it("79: typing 5 letters fills all 5 tiles of the current row", () => {
    render(<BoardGrid />);
    for (const key of ["a", "p", "p", "l", "e"]) {
      pressKey(key);
    }
    for (let i = 0; i < 5; i++) {
      expect(getTile(0, 0, i).textContent).not.toBe("");
    }
  });

  it("80: typing a 6th letter has no effect — input is capped at 5 characters", () => {
    render(<BoardGrid />);
    for (const key of ["a", "p", "p", "l", "e", "x"]) {
      pressKey(key);
    }
    expect(boardStore.getState().boards[0].currentInput).toHaveLength(5);
  });

  it("81: Backspace removes the last typed character", () => {
    render(<BoardGrid />);
    for (const key of ["a", "p", "p"]) {
      pressKey(key);
    }
    pressKey("Backspace");
    // After backspace, currentInput is "AP"; tile at index 2 should be empty
    expect(getTile(0, 0, 2).textContent).toBe("");
  });

  it("82: Backspace on an empty row is a no-op", () => {
    render(<BoardGrid />);
    pressKey("Backspace");
    expect(getTile(0, 0, 0).textContent).toBe("");
  });

  it("83: typing has no effect on idle boards — only the active board receives input", () => {
    render(<BoardGrid />);
    pressKey("c");
    // Board 1 is idle; its first tile must stay empty
    expect(getTile(1, 0, 0).textContent).toBe("");
  });

  it("84: all keyboard input is blocked when all boards are in terminal states", () => {
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    render(<BoardGrid />);
    pressKey("c");
    for (let i = 0; i < 4; i++) {
      expect(boardStore.getState().boards[i].currentInput).toBe("");
    }
  });

  it("85: Enter with fewer than 5 letters is ignored — no guess row is consumed", () => {
    render(<BoardGrid />);
    for (const key of ["a", "p", "p"]) {
      pressKey(key);
    }
    pressKey("Enter");
    expect(boardStore.getState().boards[0].guesses).toHaveLength(0);
    expect(boardStore.getState().boards[0].currentInput).toBe("APP");
  });
});

// ---------------------------------------------------------------------------
// Focus and navigation
// ---------------------------------------------------------------------------

describe("BoardGrid — focus and navigation", () => {
  it("86: clicking an idle board shifts focus to it and demotes the previously active board", () => {
    render(<BoardGrid />);
    fireEvent.click(getBoard(2));
    expect(getBoard(2)).toHaveAttribute("data-status", "active");
    expect(getBoard(0)).toHaveAttribute("data-status", "idle");
  });

  it("87: clicking the already-active board has no effect", () => {
    render(<BoardGrid />);
    fireEvent.click(getBoard(0));
    expect(getBoard(0)).toHaveAttribute("data-status", "active");
  });

  it("88: clicking a solved board has no effect — it cannot receive focus", () => {
    act(() => {
      boardStore.setState({
        boards: boardStore
          .getState()
          .boards.map((b, i) => (i === 1 ? { ...b, status: "solved" } : b)),
      });
    });
    render(<BoardGrid />);
    fireEvent.click(getBoard(1));
    expect(getBoard(1)).toHaveAttribute("data-status", "solved");
    expect(getBoard(0)).toHaveAttribute("data-status", "active");
  });

  it("89: clicking a locked board has no effect", () => {
    act(() => {
      boardStore.getState().lockAllBoards();
    });
    render(<BoardGrid />);
    fireEvent.click(getBoard(0));
    expect(getBoard(0)).toHaveAttribute("data-status", "locked");
  });

  it("90: focus auto-advances to the next idle board when the active board is solved", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore
        .getState()
        .applyResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    });
    expect(getBoard(1)).toHaveAttribute("data-status", "active");
  });

  it("91: auto-advance skips boards that are already in terminal states", () => {
    // Board 1 is pre-solved; auto-advance from board 0 should land on board 2
    act(() => {
      boardStore.setState({
        boards: boardStore
          .getState()
          .boards.map((b, i) => (i === 1 ? { ...b, status: "solved" } : b)),
      });
    });
    render(<BoardGrid />);
    act(() => {
      boardStore
        .getState()
        .applyResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    });
    expect(getBoard(2)).toHaveAttribute("data-status", "active");
  });

  it("92: no board is active once all four boards are in terminal states", () => {
    act(() => {
      WORDS.forEach((_, i) => {
        boardStore
          .getState()
          .applyResult(i, WORDS[i], ["green", "green", "green", "green", "green"], "solved");
      });
    });
    render(<BoardGrid />);
    for (let i = 0; i < 4; i++) {
      expect(getBoard(i)).not.toHaveAttribute("data-status", "active");
    }
  });
});

// ---------------------------------------------------------------------------
// Result colours
// ---------------------------------------------------------------------------

describe("BoardGrid — result colours", () => {
  it("93: submitted guess tiles carry the correct data-result value from the store", () => {
    const result: TileResult[] = ["grey", "green", "grey", "grey", "green"];
    act(() => {
      boardStore.getState().applyResult(0, "crane", result, "active");
    });
    render(<BoardGrid />);
    expect(getTile(0, 0, 0)).toHaveAttribute("data-result", "grey");
    expect(getTile(0, 0, 1)).toHaveAttribute("data-result", "green");
    expect(getTile(0, 0, 2)).toHaveAttribute("data-result", "grey");
    expect(getTile(0, 0, 3)).toHaveAttribute("data-result", "grey");
    expect(getTile(0, 0, 4)).toHaveAttribute("data-result", "green");
  });
});

// ---------------------------------------------------------------------------
// Responsive layout
// ---------------------------------------------------------------------------

describe("BoardGrid — responsive layout", () => {
  it("94: all boards are present in the DOM at mobile width (375px)", () => {
    Object.defineProperty(window, "innerWidth", { value: 375, configurable: true });
    const { container } = render(<BoardGrid />);
    expect(container.querySelector('[data-board-index="0"]')).toBeInTheDocument();
    expect(container.querySelector('[data-board-index="3"]')).toBeInTheDocument();
  });

  it("95: all boards are present in the DOM at desktop width (1280px)", () => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    const { container } = render(<BoardGrid />);
    expect(container.querySelector('[data-board-index="0"]')).toBeInTheDocument();
    expect(container.querySelector('[data-board-index="3"]')).toBeInTheDocument();
  });
});
