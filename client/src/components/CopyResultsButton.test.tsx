// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { LeaderboardEntry, PodiumEntry } from "shared/types/game";
import { CopyResultsButton } from "./CopyResultsButton";
import { EndGame } from "../pages/EndGame";

const LEADERBOARD: LeaderboardEntry[] = [
  { playerId: "a", name: "Alex", score: 317, boardsSolved: 4 },
  { playerId: "b", name: "Sam", score: 252, boardsSolved: 3 },
];

const PODIUM: PodiumEntry[] = [
  { rank: 1, name: "Alex", score: 317 },
  { rank: 2, name: "Sam", score: 252 },
];

afterEach(() => {
  vi.useRealTimers();
});

describe("CopyResultsButton", () => {
  it("8: button is present on end game screen", () => {
    render(
      <EndGame
        podium={PODIUM}
        finalLeaderboard={LEADERBOARD}
        myPlayerId="a"
        isAdmin={false}
        gameId="game1"
        rounds={2}
      />,
    );
    expect(screen.getByTestId("copy-results-button")).toBeInTheDocument();
  });

  it("9: click calls clipboard.writeText with correct text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <CopyResultsButton
        leaderboard={LEADERBOARD}
        gameId="game42"
        rounds={3}
      />,
    );
    await userEvent.click(screen.getByTestId("copy-results-button"));
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain("play.app/game42");
  });

  it("10: 'Copied!' feedback shown after successful click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <CopyResultsButton
        leaderboard={LEADERBOARD}
        gameId="gid"
        rounds={2}
      />,
    );
    await userEvent.click(screen.getByTestId("copy-results-button"));
    expect(screen.getByTestId("copy-results-button")).toHaveTextContent("Copied!");
  });

  it("11: button reverts to 'Copy results' after 1500ms", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <CopyResultsButton
        leaderboard={LEADERBOARD}
        gameId="gid"
        rounds={2}
      />,
    );
    // fireEvent is synchronous; flush microtasks separately so the clipboard Promise resolves
    fireEvent.click(screen.getByTestId("copy-results-button"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("copy-results-button")).toHaveTextContent("Copied!");
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByTestId("copy-results-button")).toHaveTextContent("Copy results");
  });

  it("12: fallback textarea appears when clipboard.writeText throws", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });

    render(
      <CopyResultsButton
        leaderboard={LEADERBOARD}
        gameId="gid"
        rounds={2}
      />,
    );
    await userEvent.click(screen.getByTestId("copy-results-button"));
    expect(screen.getByTestId("copy-results-fallback")).toBeInTheDocument();
  });

  it("13: button is visible to non-admin player", () => {
    render(
      <EndGame
        podium={PODIUM}
        finalLeaderboard={LEADERBOARD}
        myPlayerId="b"
        isAdmin={false}
        gameId="g1"
        rounds={1}
      />,
    );
    expect(screen.getByTestId("copy-results-button")).toBeInTheDocument();
  });
});
