// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminControls } from "./AdminControls";

describe("AdminControls", () => {
  it("1: admin sees Start Game button in waiting room", () => {
    render(
      <AdminControls
        isAdmin={true}
        status="waiting"
        players={[{ name: "Alex" }]}
        onStartGame={vi.fn()}
      />,
    );
    expect(screen.getByTestId("admin-start-game")).toBeInTheDocument();
  });

  it("2: non-admin does not see Start Game; waiting message visible", () => {
    render(
      <AdminControls
        isAdmin={false}
        status="waiting"
        players={[]}
        onStartGame={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("admin-start-game")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-waiting-message")).toBeInTheDocument();
  });

  it("3: admin sees Start Next Round in between_rounds", () => {
    render(
      <AdminControls
        isAdmin={true}
        status="between_rounds"
        players={[]}
        onStartNextRound={vi.fn()}
        onEndGame={vi.fn()}
      />,
    );
    expect(screen.getByTestId("admin-start-next-round")).toBeInTheDocument();
  });

  it("4: admin sees End Game in between_rounds", () => {
    render(
      <AdminControls
        isAdmin={true}
        status="between_rounds"
        players={[]}
        onStartNextRound={vi.fn()}
        onEndGame={vi.fn()}
      />,
    );
    expect(screen.getByTestId("admin-end-game")).toBeInTheDocument();
  });

  it("5: admin sees Play Again on end screen", () => {
    render(
      <AdminControls
        isAdmin={true}
        status="finished"
        players={[]}
        onRestartGame={vi.fn()}
      />,
    );
    expect(screen.getByTestId("admin-play-again")).toBeInTheDocument();
  });

  it("6: Start Game disabled with 0 players", () => {
    render(
      <AdminControls
        isAdmin={true}
        status="waiting"
        players={[]}
        onStartGame={vi.fn()}
      />,
    );
    expect(screen.getByTestId("admin-start-game")).toBeDisabled();
  });

  it("7: Start Game enabled with 1 player", () => {
    render(
      <AdminControls
        isAdmin={true}
        status="waiting"
        players={[{ name: "Alex" }]}
        onStartGame={vi.fn()}
      />,
    );
    expect(screen.getByTestId("admin-start-game")).not.toBeDisabled();
  });
});
