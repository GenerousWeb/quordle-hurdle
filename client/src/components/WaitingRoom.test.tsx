// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WaitingRoom } from "./WaitingRoom";
import type { Player } from "shared/types/game";

const adminPlayer: Player = { playerId: "p1", name: "Alex", role: "admin", isConnected: true };
const regularPlayer: Player = { playerId: "p2", name: "Sam", role: "player", isConnected: true };

const defaultProps = {
  inviteLink: "https://game.app/play/abc",
  players: [adminPlayer],
  isAdmin: true,
  rounds: 3,
  timeLimitSeconds: 120,
  maxPlayers: 8,
  onStart: vi.fn(),
};

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
});

describe("WaitingRoom — static UI", () => {
  it("1: invite link displayed", () => {
    render(<WaitingRoom {...defaultProps} />);
    expect(screen.getByText("https://game.app/play/abc")).toBeInTheDocument();
  });

  it("2: copy button copies to clipboard", async () => {
    render(<WaitingRoom {...defaultProps} />);
    await userEvent.click(screen.getByTestId("copy-link-button"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://game.app/play/abc");
  });

  it("3: QR code area rendered", () => {
    render(<WaitingRoom {...defaultProps} />);
    expect(screen.getByTestId("qr-code-area")).toBeInTheDocument();
  });

  it("4: config summary shows correct values", () => {
    render(<WaitingRoom {...defaultProps} rounds={3} timeLimitSeconds={120} maxPlayers={8} />);
    expect(screen.getByText(/3 rounds/i)).toBeInTheDocument();
    expect(screen.getByText(/2:00/)).toBeInTheDocument();
    expect(screen.getByText(/8 players/i)).toBeInTheDocument();
  });

  it("5: player list shows all players", () => {
    render(<WaitingRoom {...defaultProps} players={[adminPlayer, regularPlayer]} />);
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
  });

  it("6: admin badge shown on admin player", () => {
    render(<WaitingRoom {...defaultProps} players={[adminPlayer, regularPlayer]} />);
    expect(screen.getByTestId("admin-badge")).toBeInTheDocument();
  });

  it("7: admin sees Start Game button", () => {
    render(<WaitingRoom {...defaultProps} isAdmin={true} />);
    expect(screen.getByTestId("start-game-button")).toBeInTheDocument();
  });

  it("8: non-admin sees holding message, no start button", () => {
    render(<WaitingRoom {...defaultProps} isAdmin={false} />);
    expect(screen.queryByTestId("start-game-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("waiting-message")).toBeInTheDocument();
  });

  it("9: start button disabled with 0 players", () => {
    render(<WaitingRoom {...defaultProps} players={[]} isAdmin={true} />);
    expect(screen.getByTestId("start-game-button")).toBeDisabled();
  });

  it("10: start button enabled with 1+ players", () => {
    render(<WaitingRoom {...defaultProps} players={[adminPlayer]} isAdmin={true} />);
    expect(screen.getByTestId("start-game-button")).not.toBeDisabled();
  });
});
