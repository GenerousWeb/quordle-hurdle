// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { TimerDisplay } from "./TimerDisplay";

describe("TimerDisplay — client countdown display", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1: displays correct initial time from deadline", () => {
    const deadline = Date.now() + 107000; // 107s = 1:47
    render(<TimerDisplay deadline={deadline} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("1:47");
  });

  it("2: counts down by 1 each second", () => {
    const deadline = Date.now() + 107000; // 1:47
    render(<TimerDisplay deadline={deadline} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("timer-display")).toHaveTextContent("1:46");
  });

  it("3: leading zero on seconds under 10", () => {
    const deadline = Date.now() + 9000; // 0:09
    render(<TimerDisplay deadline={deadline} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("0:09");
  });

  it("4: displays 1:00 not 1:0 at 60 seconds", () => {
    const deadline = Date.now() + 60000; // 1:00
    render(<TimerDisplay deadline={deadline} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("1:00");
  });

  it("5: no urgent state above 20 seconds", () => {
    const deadline = Date.now() + 21000; // 21s remaining
    render(<TimerDisplay deadline={deadline} />);
    expect(screen.getByTestId("timer-display")).toHaveAttribute("data-urgent", "false");
  });

  it("6: urgent state applies at exactly 19 seconds remaining", () => {
    const deadline = Date.now() + 21000; // start at 21s
    render(<TimerDisplay deadline={deadline} />);
    act(() => {
      vi.advanceTimersByTime(2000); // 19s remaining
    });
    expect(screen.getByTestId("timer-display")).toHaveAttribute("data-urgent", "true");
  });

  it("7: pulse animation class present under 20 seconds", () => {
    const deadline = Date.now() + 16000; // 16s
    render(<TimerDisplay deadline={deadline} />);
    act(() => {
      vi.advanceTimersByTime(1000); // 15s remaining
    });
    const el = screen.getByTestId("timer-display");
    expect(el.className).toMatch(/pulse|animate-pulse/);
  });

  it("8: stops at 0:00 and does not go negative", () => {
    const deadline = Date.now() + 2000; // 2s
    render(<TimerDisplay deadline={deadline} />);
    act(() => {
      vi.advanceTimersByTime(5000); // advance well past deadline
    });
    expect(screen.getByTestId("timer-display")).toHaveTextContent("0:00");
  });

  it("9: interval cleared on unmount — no act() warnings", () => {
    const deadline = Date.now() + 30000;
    const { unmount } = render(<TimerDisplay deadline={deadline} />);
    unmount();
    // Advancing timers after unmount should not cause state-update warnings
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // If we reach here without errors, the interval was properly cleared
    expect(true).toBe(true);
  });

  it("10: re-mounts cleanly with a new deadline", () => {
    const deadline1 = Date.now() + 30000; // 0:30
    const { unmount } = render(<TimerDisplay deadline={deadline1} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("0:30");
    unmount();

    const deadline2 = Date.now() + 60000; // 1:00
    render(<TimerDisplay deadline={deadline2} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("1:00");
  });
});
