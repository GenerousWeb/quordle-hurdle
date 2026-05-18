/**
 * @vitest-environment happy-dom
 *
 * Step 4A — Tile animations (tests #127–137).
 *
 * Tests #127–131 and #135–137 render <Tile /> in isolation.
 * Tests #132–134 render <BoardGrid /> to verify animation-gating behaviour at
 * the board level, since that is where stagger timing and the submitting flag live.
 *
 * Expected <Tile /> prop surface:
 *   letter:     string          — character to display (empty string for blank tiles)
 *   result?:    TileResult      — absent on unsubmitted tiles
 *   tileIndex:  number          — 0–4; used to compute the left-to-right animation-delay
 *   isFlipping?: boolean        — true while the flip reveal is playing
 *   isShaking?:  boolean        — true while the invalid-word shake is playing
 *
 * Expected DOM conventions (matching BoardGrid.test.tsx):
 *   data-result="{green|yellow|grey}"  — present only after submission
 *   data-flipping="true"               — present only while flipping
 *   data-shaking="true"                — present only while shaking
 *   style.animationDelay               — inline ms delay for the left-to-right stagger
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { Tile } from "./Tile";
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

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Colour display (tests #127–130)
// ---------------------------------------------------------------------------

describe("Tile — colour display", () => {
  it("127: unsubmitted tile has no data-result attribute", () => {
    const { container } = render(
      <Tile letter="" result={undefined} tileIndex={0} />,
    );
    expect(container.firstChild).not.toHaveAttribute("data-result");
  });

  it("128: tile with result='green' has data-result='green'", () => {
    const { container } = render(
      <Tile letter="C" result="green" tileIndex={0} />,
    );
    expect(container.firstChild).toHaveAttribute("data-result", "green");
  });

  it("129: tile with result='yellow' has data-result='yellow'", () => {
    const { container } = render(
      <Tile letter="R" result="yellow" tileIndex={0} />,
    );
    expect(container.firstChild).toHaveAttribute("data-result", "yellow");
  });

  it("130: tile with result='grey' has data-result='grey'", () => {
    const { container } = render(
      <Tile letter="A" result="grey" tileIndex={0} />,
    );
    expect(container.firstChild).toHaveAttribute("data-result", "grey");
  });
});

// ---------------------------------------------------------------------------
// Flip animation (tests #131–134)
// ---------------------------------------------------------------------------

describe("Tile — flip animation", () => {
  it("131: data-flipping='true' is present when isFlipping is true", () => {
    const { container } = render(
      <Tile letter="C" result="green" tileIndex={0} isFlipping />,
    );
    expect(container.firstChild).toHaveAttribute("data-flipping", "true");
  });

  it("132: tile 0 has a lower animation-delay than tile 4 — left-to-right stagger", () => {
    const { container: c0 } = render(
      <Tile letter="C" result="green" tileIndex={0} isFlipping />,
    );
    const { container: c4 } = render(
      <Tile letter="E" result="green" tileIndex={4} isFlipping />,
    );
    const tile0 = c0.firstChild as HTMLElement;
    const tile4 = c4.firstChild as HTMLElement;
    const delay0 = parseFloat(tile0.style.animationDelay ?? "0");
    const delay4 = parseFloat(tile4.style.animationDelay ?? "0");
    expect(delay0).toBeLessThan(delay4);
  });

  it("133: keyboard input is blocked while the active board has submitting=true", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(0, true);
    });
    fireEvent.keyDown(document.body, { key: "c" });
    expect(boardStore.getState().boards[0].currentInput).toBe("");
  });

  it("134: keyboard input is accepted again once submitting is cleared", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(0, true);
    });
    // Simulate the animation completion callback clearing the flag
    act(() => {
      boardStore.getState().setSubmitting(0, false);
    });
    fireEvent.keyDown(document.body, { key: "c" });
    expect(boardStore.getState().boards[0].currentInput).toBe("C");
  });

  it("137: tile does not have data-flipping when only isShaking is true", () => {
    const { container } = render(
      <Tile letter="C" result={undefined} tileIndex={0} isShaking />,
    );
    expect(container.firstChild).not.toHaveAttribute("data-flipping", "true");
  });
});

// ---------------------------------------------------------------------------
// Shake animation (tests #135–136)
// ---------------------------------------------------------------------------

describe("Tile — shake animation", () => {
  it("135: data-shaking='true' is present when isShaking is true", () => {
    const { container } = render(
      <Tile letter="C" result={undefined} tileIndex={0} isShaking />,
    );
    expect(container.firstChild).toHaveAttribute("data-shaking", "true");
  });

  it("136: data-shaking is absent once isShaking is set back to false", () => {
    const { container, rerender } = render(
      <Tile letter="C" result={undefined} tileIndex={0} isShaking />,
    );
    expect(container.firstChild).toHaveAttribute("data-shaking", "true");
    rerender(<Tile letter="C" result={undefined} tileIndex={0} isShaking={false} />);
    expect(container.firstChild).not.toHaveAttribute("data-shaking", "true");
  });
});
