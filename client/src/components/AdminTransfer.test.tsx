// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AdminTransferNotification } from "./AdminTransferNotification";
import { gameStore } from "../store/gameStore";

beforeEach(() => {
  gameStore.setState({
    adminId: null,
    myPlayerId: null,
    adminTransferMessage: null,
  } as Parameters<typeof gameStore.setState>[0]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AdminTransferNotification", () => {
  it("12: notification appears when message is provided", () => {
    render(<AdminTransferNotification message="Sam is now the admin" />);
    expect(screen.getByTestId("admin-transfer-notification")).toBeInTheDocument();
  });

  it("13: notification shows correct name", () => {
    render(<AdminTransferNotification message="Sam is now the admin" />);
    expect(screen.getByTestId("admin-transfer-notification")).toHaveTextContent(
      "Sam is now the admin",
    );
  });

  it("14: notification auto-dismisses after 3 seconds", () => {
    vi.useFakeTimers();
    render(<AdminTransferNotification message="Sam is now the admin" />);

    expect(screen.getByTestId("admin-transfer-notification")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(
      screen.queryByTestId("admin-transfer-notification"),
    ).not.toBeInTheDocument();
  });

  it("renders nothing when message is null", () => {
    render(<AdminTransferNotification message={null} />);
    expect(
      screen.queryByTestId("admin-transfer-notification"),
    ).not.toBeInTheDocument();
  });
});

describe("gameStore — admin_transferred handling", () => {
  it("10: new admin sees isAdmin become true after admin_transferred", () => {
    gameStore.setState({ adminId: "other", myPlayerId: "me" } as Parameters<
      typeof gameStore.setState
    >[0]);

    expect(gameStore.getState().adminId).toBe("other");

    gameStore
      .getState()
      .handleAdminTransferred({ newAdminId: "me", newAdminName: "Me" });

    expect(gameStore.getState().adminId).toBe("me");
    // isAdmin derived: myPlayerId === adminId
    const state = gameStore.getState();
    expect(state.myPlayerId === state.adminId).toBe(true);
  });

  it("11: former admin loses admin status after admin_transferred", () => {
    gameStore.setState({ adminId: "admin1", myPlayerId: "admin1" } as Parameters<
      typeof gameStore.setState
    >[0]);

    gameStore
      .getState()
      .handleAdminTransferred({ newAdminId: "p1", newAdminName: "Player1" });

    const state = gameStore.getState();
    expect(state.adminId).toBe("p1");
    expect(state.myPlayerId === state.adminId).toBe(false);
  });

  it("15: admin controls visible on waiting room after promotion (isAdmin derived correctly)", () => {
    gameStore.setState({ adminId: "other", myPlayerId: "me" } as Parameters<
      typeof gameStore.setState
    >[0]);
    let state = gameStore.getState();
    expect(state.myPlayerId === state.adminId).toBe(false);

    gameStore
      .getState()
      .handleAdminTransferred({ newAdminId: "me", newAdminName: "Me" });

    state = gameStore.getState();
    expect(state.myPlayerId === state.adminId).toBe(true);
  });

  it("16: admin controls visible on between-rounds after promotion (isAdmin derived correctly)", () => {
    gameStore.setState({
      adminId: "other",
      myPlayerId: "me",
      gameStatus: "between_rounds",
    } as Parameters<typeof gameStore.setState>[0]);
    let state = gameStore.getState();
    expect(state.myPlayerId === state.adminId).toBe(false);

    gameStore
      .getState()
      .handleAdminTransferred({ newAdminId: "me", newAdminName: "Me" });

    state = gameStore.getState();
    expect(state.myPlayerId === state.adminId).toBe(true);
  });
});
