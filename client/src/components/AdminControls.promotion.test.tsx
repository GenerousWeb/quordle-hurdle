// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminControls } from "./AdminControls";
import { gameStore } from "../store/gameStore";

describe("AdminControls — promotion scenarios", () => {
  it("10: new admin sees Start Game button after promotion in waiting status", () => {
    // Before promotion: not admin
    render(
      <AdminControls
        isAdmin={false}
        status="waiting"
        players={[{ name: "Alex" }]}
        onStartGame={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("admin-start-game")).not.toBeInTheDocument();
  });

  it("10b: new admin sees Start Game button when isAdmin becomes true", () => {
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

  it("11: former admin loses admin buttons when isAdmin becomes false", () => {
    render(
      <AdminControls
        isAdmin={false}
        status="waiting"
        players={[{ name: "Alex" }]}
        onStartGame={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("admin-start-game")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-waiting-message")).toBeInTheDocument();
  });

  it("15: after promotion, Start Game button visible for new admin on waiting screen", () => {
    // Simulate store state: I am the new admin
    gameStore.setState({ adminId: "me", myPlayerId: "me" } as Parameters<
      typeof gameStore.setState
    >[0]);
    const state = gameStore.getState();
    const isAdmin = state.myPlayerId === state.adminId;

    render(
      <AdminControls
        isAdmin={isAdmin}
        status="waiting"
        players={[{ name: "Alex" }]}
        onStartGame={vi.fn()}
      />,
    );
    expect(screen.getByTestId("admin-start-game")).toBeInTheDocument();
  });

  it("16: after promotion, Start Next Round visible for new admin on between-rounds screen", () => {
    gameStore.setState({ adminId: "me", myPlayerId: "me" } as Parameters<
      typeof gameStore.setState
    >[0]);
    const state = gameStore.getState();
    const isAdmin = state.myPlayerId === state.adminId;

    render(
      <AdminControls
        isAdmin={isAdmin}
        status="between_rounds"
        players={[]}
        onStartNextRound={vi.fn()}
        onEndGame={vi.fn()}
      />,
    );
    expect(screen.getByTestId("admin-start-next-round")).toBeInTheDocument();
  });
});
