/**
 * @vitest-environment happy-dom
 *
 * F2 Step 1 — Tile static visual states (tests f2#1–f2#12)
 *
 * Tile API (F2):  letter: string | null,  state: TileState
 * DOM convention: data-state="empty|typing|green|yellow|grey"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { Tile } from "./Tile";
import { BoardGrid } from "./BoardGrid";
import { boardStore } from "../store/boardStore";

// Cast to accept the F2 prop surface during tests; type-checked by tsc separately.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const F2Tile = Tile as any;

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

// ---------------------------------------------------------------------------
// F2 Step 1 — static visual states (f2#1–f2#12)
// ---------------------------------------------------------------------------

describe("Tile — static visual states (F2)", () => {
  it("f2#1: empty tile renders no letter", () => {
    const { container } = render(<F2Tile letter={null} state="empty" />);
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toHaveTextContent("");
    expect(container.firstChild).toHaveAttribute("data-state", "empty");
  });

  it("f2#2: typing tile shows letter, no colour state", () => {
    const { container } = render(<F2Tile letter="C" state="typing" />);
    expect(container.firstChild).toHaveTextContent("C");
    expect(container.firstChild).toHaveAttribute("data-state", "typing");
    expect(container.firstChild).not.toHaveAttribute("data-state", "green");
    expect(container.firstChild).not.toHaveAttribute("data-state", "yellow");
    expect(container.firstChild).not.toHaveAttribute("data-state", "grey");
  });

  it("f2#3: typing tile has highlighted border state — data-state='typing'", () => {
    const { container } = render(<F2Tile letter="A" state="typing" />);
    expect(container.firstChild).toHaveAttribute("data-state", "typing");
  });

  it("f2#4: green tile shows letter and green state", () => {
    const { container } = render(<F2Tile letter="R" state="green" />);
    expect(container.firstChild).toHaveTextContent("R");
    expect(container.firstChild).toHaveAttribute("data-state", "green");
  });

  it("f2#5: yellow tile shows letter and yellow state", () => {
    const { container } = render(<F2Tile letter="E" state="yellow" />);
    expect(container.firstChild).toHaveTextContent("E");
    expect(container.firstChild).toHaveAttribute("data-state", "yellow");
  });

  it("f2#6: grey tile shows letter and grey state", () => {
    const { container } = render(<F2Tile letter="X" state="grey" />);
    expect(container.firstChild).toHaveTextContent("X");
    expect(container.firstChild).toHaveAttribute("data-state", "grey");
  });

  it("f2#7: green tile has no yellow or grey state", () => {
    const { container } = render(<F2Tile letter="R" state="green" />);
    expect(container.firstChild).toHaveAttribute("data-state", "green");
    expect(container.firstChild).not.toHaveAttribute("data-state", "yellow");
    expect(container.firstChild).not.toHaveAttribute("data-state", "grey");
  });

  it("f2#8: yellow tile has no green or grey state", () => {
    const { container } = render(<F2Tile letter="E" state="yellow" />);
    expect(container.firstChild).not.toHaveAttribute("data-state", "green");
    expect(container.firstChild).toHaveAttribute("data-state", "yellow");
    expect(container.firstChild).not.toHaveAttribute("data-state", "grey");
  });

  it("f2#9: grey tile has no green or yellow state", () => {
    const { container } = render(<F2Tile letter="X" state="grey" />);
    expect(container.firstChild).not.toHaveAttribute("data-state", "green");
    expect(container.firstChild).not.toHaveAttribute("data-state", "yellow");
    expect(container.firstChild).toHaveAttribute("data-state", "grey");
  });

  it("f2#10: all tile states render without throwing", () => {
    const states = ["empty", "typing", "green", "yellow", "grey"];
    for (const state of states) {
      expect(() => render(<F2Tile letter="A" state={state} />)).not.toThrow();
    }
  });

  it("f2#11: tile renders letter in uppercase", () => {
    const { container } = render(<F2Tile letter="c" state="typing" />);
    expect(container.firstChild).toHaveTextContent("C");
    expect(container.firstChild).not.toHaveTextContent("c");
  });

  it("f2#12: TileState type — all five valid values produce the expected data-state attribute", () => {
    // Compile-time rejection of invalid values (e.g. 'blue') is enforced by
    // `npm run typecheck:all`.  This runtime test confirms the five valid values
    // each produce the correct data-state attribute.
    const validStates = ["empty", "typing", "green", "yellow", "grey"] as const;
    for (const state of validStates) {
      const { container } = render(<F2Tile letter="A" state={state} />);
      expect(container.firstChild).toHaveAttribute("data-state", state);
    }
  });
});

// ---------------------------------------------------------------------------
// Keyboard gate — submitting flag (tests #120–#121)
// Tests #114–#119 and #122–#124 tested the pre-F2 Tile API (result/isFlipping/
// isShaking props) and are superseded by f2#1–f2#12 and f2#32–f2#68.
// ---------------------------------------------------------------------------

describe("Tile — keyboard gate (via BoardGrid)", () => {
  it("120: keyboard input is blocked while the global submitting flag is true", () => {
    render(<BoardGrid />);
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).setSubmitting(true);
    });
    fireEvent.keyDown(document.body, { key: "c" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("");
  });

  it("121: keyboard input is accepted again once global submitting is cleared", () => {
    render(<BoardGrid />);
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).setSubmitting(true);
    });
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).setSubmitting(false);
    });
    fireEvent.keyDown(document.body, { key: "c" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((boardStore.getState() as any).currentInput).toBe("C");
  });
});

// ---------------------------------------------------------------------------
// Solved-board animation exclusion (test #125)
// ---------------------------------------------------------------------------

describe("Tile — solved board excluded from animation", () => {
  it("125: solved board tiles do not have data-flipping after subsequent shared guess", () => {
    render(<BoardGrid />);
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyBoardResult(0, "apple", ["green", "green", "green", "green", "green"], "solved");
    });
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).setSubmitting(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (boardStore.getState() as any).applyAllResults([
        { boardIndex: 1, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 2, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
        { boardIndex: 3, word: "crane", result: ["grey", "grey", "grey", "grey", "grey"], boardStatus: "unsolved" },
      ]);
    });
    const board0Tile = document.querySelector(
      '[data-board-index="0"] [data-row-index="0"] [data-tile-index="0"]',
    ) as HTMLElement;
    expect(board0Tile).not.toHaveAttribute("data-flipping", "true");
  });
});
