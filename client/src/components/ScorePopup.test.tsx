// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ScorePopup } from "./ScorePopup";
import { boardStore } from "../store/boardStore";

describe("ScorePopup — score display and nav update", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    boardStore.setState({ myScore: 0 } as Parameters<typeof boardStore.setState>[0]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("11: popup shows +14 when totalScoreDelta is 14", () => {
    render(<ScorePopup totalScoreDelta={14} />);
    expect(screen.getByTestId("score-popup")).toHaveTextContent("+14");
  });

  it("12: popup shows +0 for zero delta", () => {
    render(<ScorePopup totalScoreDelta={0} />);
    expect(screen.getByTestId("score-popup")).toHaveTextContent("+0");
  });

  it("13: popup disappears after 1.5 seconds", () => {
    render(<ScorePopup totalScoreDelta={14} />);
    expect(screen.getByTestId("score-popup")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.queryByTestId("score-popup")).not.toBeInTheDocument();
  });

  it("14: myScore in store updates when setMyScore is called (simulates leaderboard_update)", () => {
    boardStore.getState().setMyScore(42);
    expect(boardStore.getState().myScore).toBe(42);
  });

  it("15: score persists and reflects latest value across consecutive updates", () => {
    boardStore.getState().setMyScore(10);
    boardStore.getState().setMyScore(18);
    expect(boardStore.getState().myScore).toBe(18);
  });
});
