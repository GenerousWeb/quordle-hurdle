// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { TimerDisplay } from "../components/TimerDisplay";
import { boardStore } from "../store/boardStore";

// Import JoinPage so this file fails (red phase) until JoinPage is implemented.
// Tests 12-14 verify the correct downstream behavior after a mid-round join.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JoinPage } from "./JoinPage";

describe("GamePage — mid-round join", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    boardStore.getState().initBoards(["apple", "grape", "stone", "light"]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("12: timer starts from remaining time on mid-round join", () => {
    const deadline = Date.now() + 45000; // 45s remaining
    render(<TimerDisplay deadline={deadline} />);
    expect(screen.getByTestId("timer-display")).toHaveTextContent("0:45");
  });

  it("13: boards are blank on join — no prior guesses, all unsolved", () => {
    boardStore.getState().initBoards(["apple", "grape", "stone", "light"]);
    const boards = boardStore.getState().boards;
    expect(boards.every((b) => b.guesses.length === 0)).toBe(true);
    expect(boards.every((b) => b.status === "unsolved")).toBe(true);
  });

  it("14: input is available immediately — boards not locked", () => {
    boardStore.getState().initBoards(["apple", "grape", "stone", "light"]);
    act(() => {
      boardStore.getState().appendLetter("a");
    });
    expect(boardStore.getState().currentInput).toBe("a");
    expect(boardStore.getState().boards.every((b) => b.status !== "locked")).toBe(true);
  });
});
