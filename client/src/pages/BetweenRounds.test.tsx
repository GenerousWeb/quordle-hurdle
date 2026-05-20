// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RoundSummary } from "shared/types/game";

import { BetweenRounds } from "./BetweenRounds";

const SAMPLE_SUMMARY: RoundSummary = {
  roundNumber: 1,
  words: ["grove", "plumb", "blaze", "crisp"],
  leaderboard: [
    { playerId: "abc", name: "Alex", roundScore: 72, totalScore: 230 },
    { playerId: "def", name: "Sam", roundScore: 64, totalScore: 188 },
    { playerId: "ghi", name: "Jo", roundScore: 50, totalScore: 150 },
  ],
};

describe("BetweenRounds — word reveal", () => {
  it("1: renders all 4 revealed words in uppercase", () => {
    render(
      <BetweenRounds
        roundSummary={SAMPLE_SUMMARY}
        myPlayerId="abc"
        isAdmin={false}
        isLastRound={false}
      />,
    );
    expect(screen.getByText("GROVE")).toBeInTheDocument();
    expect(screen.getByText("PLUMB")).toBeInTheDocument();
    expect(screen.getByText("BLAZE")).toBeInTheDocument();
    expect(screen.getByText("CRISP")).toBeInTheDocument();
  });

  it("2: words displayed in 2×2 grid with 4 word cards", () => {
    render(
      <BetweenRounds
        roundSummary={SAMPLE_SUMMARY}
        myPlayerId="abc"
        isAdmin={false}
        isLastRound={false}
      />,
    );
    const grid = screen.getByTestId("word-grid");
    const cards = grid.querySelectorAll("[data-testid='word-card']");
    expect(cards).toHaveLength(4);
  });
});

describe("BetweenRounds — leaderboard", () => {
  it("3: leaderboard ranks players by total score descending", () => {
    const summary: RoundSummary = {
      roundNumber: 1,
      words: ["grove", "plumb", "blaze", "crisp"],
      leaderboard: [
        { playerId: "p1", name: "Alice", roundScore: 50, totalScore: 100 },
        { playerId: "p2", name: "Bob", roundScore: 90, totalScore: 300 },
        { playerId: "p3", name: "Carol", roundScore: 70, totalScore: 200 },
      ],
    };
    render(
      <BetweenRounds
        roundSummary={summary}
        myPlayerId="p1"
        isAdmin={false}
        isLastRound={false}
      />,
    );
    const rows = screen.getAllByTestId("leaderboard-row");
    expect(rows[0]).toHaveAttribute("data-player-id", "p2");
    expect(rows[1]).toHaveAttribute("data-player-id", "p3");
    expect(rows[2]).toHaveAttribute("data-player-id", "p1");
  });

  it("4: current player row has highlight attribute", () => {
    render(
      <BetweenRounds
        roundSummary={SAMPLE_SUMMARY}
        myPlayerId="abc"
        isAdmin={false}
        isLastRound={false}
      />,
    );
    const rows = screen.getAllByTestId("leaderboard-row");
    const myRow = rows.find((r) => r.getAttribute("data-player-id") === "abc");
    expect(myRow).toHaveAttribute("data-highlighted", "true");
  });

  it("5: round score is displayed with + prefix", () => {
    render(
      <BetweenRounds
        roundSummary={SAMPLE_SUMMARY}
        myPlayerId="abc"
        isAdmin={false}
        isLastRound={false}
      />,
    );
    expect(screen.getByText("+72")).toBeInTheDocument();
    expect(screen.getByText("+64")).toBeInTheDocument();
  });
});

describe("BetweenRounds — admin controls", () => {
  it("6: admin sees Start Next Round button when not last round", () => {
    render(
      <BetweenRounds
        roundSummary={SAMPLE_SUMMARY}
        myPlayerId="abc"
        isAdmin={true}
        isLastRound={false}
        onStartNextRound={vi.fn()}
      />,
    );
    expect(screen.getByTestId("start-next-round-button")).toBeInTheDocument();
    expect(screen.queryByTestId("end-game-button")).not.toBeInTheDocument();
  });

  it("7: admin sees End Game button on final round", () => {
    render(
      <BetweenRounds
        roundSummary={SAMPLE_SUMMARY}
        myPlayerId="abc"
        isAdmin={true}
        isLastRound={true}
        onEndGame={vi.fn()}
      />,
    );
    expect(screen.getByTestId("end-game-button")).toBeInTheDocument();
    expect(screen.queryByTestId("start-next-round-button")).not.toBeInTheDocument();
  });

  it("8: non-admin sees waiting message and no action button", () => {
    render(
      <BetweenRounds
        roundSummary={SAMPLE_SUMMARY}
        myPlayerId="def"
        isAdmin={false}
        isLastRound={false}
      />,
    );
    expect(screen.getByTestId("waiting-message")).toBeInTheDocument();
    expect(screen.queryByTestId("start-next-round-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("end-game-button")).not.toBeInTheDocument();
  });

  it("start-next-round button calls onStartNextRound when clicked", async () => {
    const onStartNextRound = vi.fn();
    render(
      <BetweenRounds
        roundSummary={SAMPLE_SUMMARY}
        myPlayerId="abc"
        isAdmin={true}
        isLastRound={false}
        onStartNextRound={onStartNextRound}
      />,
    );
    await userEvent.click(screen.getByTestId("start-next-round-button"));
    expect(onStartNextRound).toHaveBeenCalledOnce();
  });
});
