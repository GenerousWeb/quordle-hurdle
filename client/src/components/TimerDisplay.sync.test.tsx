// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { TimerDisplay } from "./TimerDisplay";
import { boardStore } from "../store/boardStore";

describe("TimerDisplay — sync, round_ended, mid-round join", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Initialise boards so lockAllBoards has something to lock
    boardStore.getState().initBoards(["apple", "grape", "stone", "light"]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("14: drift > 2s corrected on syncedDeadline update", () => {
    // Timer starts with 90s remaining
    const deadline = Date.now() + 90000;
    const { rerender } = render(<TimerDisplay deadline={deadline} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("1:30");

    // Server sends timer_sync with deadline 5s earlier than client thinks (85s remaining)
    const syncedDeadline = Date.now() + 85000;
    rerender(<TimerDisplay deadline={deadline} syncedDeadline={syncedDeadline} />);

    // Drift is 5000ms > 2000ms threshold → display corrects
    expect(screen.getByTestId("timer-display")).toHaveTextContent("1:25");
  });

  it("15: drift < 2s ignored on syncedDeadline update", () => {
    // Timer starts with 85s remaining
    const deadline = Date.now() + 85000;
    const { rerender } = render(<TimerDisplay deadline={deadline} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("1:25");

    // Server sends timer_sync with deadline 500ms earlier (drift < 2s)
    const syncedDeadline = Date.now() + 84500;
    rerender(<TimerDisplay deadline={deadline} syncedDeadline={syncedDeadline} />);

    // Drift is 500ms < 2000ms threshold → display unchanged
    expect(screen.getByTestId("timer-display")).toHaveTextContent("1:25");
  });

  it("16: stopped prop locks boards and stops timer regardless of remaining time", () => {
    const deadline = Date.now() + 10000; // 10s remaining
    const { rerender } = render(<TimerDisplay deadline={deadline} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("0:10");

    // Simulate round_ended arriving while client timer still has time
    rerender(<TimerDisplay deadline={deadline} stopped={true} />);

    // Timer must stop — advancing should not change the display
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Boards should all be locked
    const boards = boardStore.getState().boards;
    expect(boards.every((b) => b.status === "locked")).toBe(true);
  });

  it("17: mid-round join shows remaining time from deadline", () => {
    // Player joins with 45s left in the round
    const deadline = Date.now() + 45000;
    render(<TimerDisplay deadline={deadline} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("0:45");
  });

  it("18: mid-round join with 3 seconds remaining — counts down", () => {
    const deadline = Date.now() + 3000;
    render(<TimerDisplay deadline={deadline} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("0:03");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("timer-display")).toHaveTextContent("0:02");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId("timer-display")).toHaveTextContent("0:00");
  });
});
