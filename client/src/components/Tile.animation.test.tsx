/**
 * @vitest-environment happy-dom
 *
 * F2 Step 2 — Tile flip animation (tests f2#32–f2#38).
 *
 * DOM conventions:
 *   data-flipping="true"   — tile is mid-flip animation
 *   data-flip-mid="true"   — tile has reached the midpoint (colour applied, letter hidden)
 *   data-state             — reflects the colour state AFTER the flip completes
 *   style.animationDelay   — stagger offset (ms) for left-to-right reveal
 *
 * The flip is triggered when the tile's state prop transitions from "typing"
 * to a colour value ("green" | "yellow" | "grey"). The component manages the
 * animation internally via useEffect + setTimeout.
 *
 * These tests fail until the F2 Tile animation is implemented.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { Tile } from "./Tile";
import { BoardGrid } from "./BoardGrid";
import { boardStore } from "../store/boardStore";

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
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tile flip animation (f2#32–f2#38)
// ---------------------------------------------------------------------------

describe("Tile — flip animation (F2)", () => {
  it("f2#32: flip class applied to tile immediately when state transitions to a colour", () => {
    const { container, rerender } = render(
      <F2Tile letter="C" state="typing" tileIndex={0} />,
    );
    // Trigger flip by changing state to a colour result
    act(() => {
      rerender(<F2Tile letter="C" state="green" tileIndex={0} />);
    });
    expect(container.firstChild).toHaveAttribute("data-flipping", "true");
  });

  it("f2#33: tile shows mid-flip state at 50% of flip duration — letter hidden before colour", () => {
    const { container, rerender } = render(
      <F2Tile letter="C" state="typing" tileIndex={0} />,
    );
    act(() => {
      rerender(<F2Tile letter="C" state="green" tileIndex={0} />);
    });
    // Advance to midpoint (~60ms of 120ms total flip duration)
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(container.firstChild).toHaveAttribute("data-flip-mid", "true");
  });

  it("f2#34: colour state is applied at the animation midpoint — not before", () => {
    const { container, rerender } = render(
      <F2Tile letter="C" state="typing" tileIndex={0} />,
    );
    // Before the flip starts the tile is typing, not green
    expect(container.firstChild).toHaveAttribute("data-state", "typing");
    act(() => {
      rerender(<F2Tile letter="C" state="green" tileIndex={0} />);
    });
    // At midpoint, green class is applied (letter hidden behind the rotation)
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(container.firstChild).toHaveAttribute("data-state", "green");
  });

  it("f2#35: tile returns to face-up after full flip — flipping removed, colour state present", () => {
    const { container, rerender } = render(
      <F2Tile letter="C" state="typing" tileIndex={0} />,
    );
    act(() => {
      rerender(<F2Tile letter="C" state="green" tileIndex={0} />);
    });
    // Advance past the full flip duration (120ms per tile)
    act(() => {
      vi.advanceTimersByTime(130);
    });
    expect(container.firstChild).not.toHaveAttribute("data-flipping", "true");
    expect(container.firstChild).toHaveAttribute("data-state", "green");
    expect(container.firstChild).toHaveTextContent("C");
  });

  it("f2#36: tile 0 has a lower animation-delay than tile 1 — left-to-right stagger", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
    });
    act(() => {
      // Direct setState to simulate f2: results land without clearing submitting
      const boards = boardStore.getState().boards;
      boardStore.setState({
        boards: boards.map((b, i) =>
          i === 0
            ? {
                ...b,
                guesses: [
                  ...b.guesses,
                  { word: "crane", result: ["green", "grey", "yellow", "grey", "green"] as const },
                ],
              }
            : b,
        ),
      });
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const tile0 = document.querySelector(
      '[data-board-index="0"] [data-row-index="0"] [data-tile-index="0"]',
    ) as HTMLElement;
    const tile1 = document.querySelector(
      '[data-board-index="0"] [data-row-index="0"] [data-tile-index="1"]',
    ) as HTMLElement;
    const delay0 = parseFloat(tile0?.style.animationDelay ?? "0");
    const delay1 = parseFloat(tile1?.style.animationDelay ?? "0");
    expect(delay0).toBeLessThan(delay1);
  });

  it("f2#37: tile 4 has the largest animation-delay — last to animate", () => {
    render(<BoardGrid />);
    act(() => {
      boardStore.getState().setSubmitting(true);
    });
    act(() => {
      const boards = boardStore.getState().boards;
      boardStore.setState({
        boards: boards.map((b, i) =>
          i === 0
            ? {
                ...b,
                guesses: [
                  ...b.guesses,
                  { word: "crane", result: ["green", "grey", "yellow", "grey", "green"] as const },
                ],
              }
            : b,
        ),
      });
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const tile0 = document.querySelector(
      '[data-board-index="0"] [data-row-index="0"] [data-tile-index="0"]',
    ) as HTMLElement;
    const tile4 = document.querySelector(
      '[data-board-index="0"] [data-row-index="0"] [data-tile-index="4"]',
    ) as HTMLElement;
    const delay0 = parseFloat(tile0?.style.animationDelay ?? "0");
    const delay4 = parseFloat(tile4?.style.animationDelay ?? "0");
    // Tile 4 starts 480ms after tile 0 (4 × 120ms stagger)
    expect(delay4 - delay0).toBeGreaterThanOrEqual(480);
  });

  it("f2#38: all 5 tiles complete animation independently — all face-up with colour after last tile finishes", () => {
    const { container, rerender } = render(
      <div>
        {[0, 1, 2, 3, 4].map((i) => (
          <F2Tile key={i} letter="C" state="typing" tileIndex={i} />
        ))}
      </div>,
    );
    act(() => {
      rerender(
        <div>
          {[0, 1, 2, 3, 4].map((i) => (
            <F2Tile key={i} letter="C" state="green" tileIndex={i} />
          ))}
        </div>,
      );
    });
    // Advance past the last tile's flip: 480ms stagger + 130ms flip = 610ms
    act(() => {
      vi.advanceTimersByTime(650);
    });
    const tiles = container.querySelectorAll("[data-tile-index]");
    tiles.forEach((tile) => {
      expect(tile).not.toHaveAttribute("data-flipping", "true");
      expect(tile).toHaveAttribute("data-state", "green");
    });
  });
});
