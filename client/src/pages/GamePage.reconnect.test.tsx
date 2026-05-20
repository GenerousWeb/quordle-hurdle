// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimerDisplay } from "../components/TimerDisplay";
import { OpponentCard } from "../components/OpponentCard";
import { JoinPage } from "./JoinPage";
import { boardStore } from "../store/boardStore";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ gameId: "test-game-id" }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

describe("GamePage — reconnect: client-side behaviour", () => {
  describe("Step 2 — blank boards and timer on reconnect", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("9: boards blank on reconnect to active round — no prior guesses, all unsolved", () => {
      boardStore.getState().initBoards(["apple", "grape", "stone", "light"]);
      const boards = boardStore.getState().boards;
      expect(boards.every((b) => b.guesses.length === 0)).toBe(true);
      expect(boards.every((b) => b.status === "unsolved")).toBe(true);
    });

    it("10: timer starts from remaining time on reconnect", () => {
      const deadline = Date.now() + 45000;
      render(<TimerDisplay deadline={deadline} />);
      expect(screen.getByTestId("timer-display")).toHaveTextContent("0:45");
    });

    it("11: reconnect to between_rounds routes correctly", async () => {
      vi.useRealTimers();
      vi.mocked(fetch).mockResolvedValue({
        status: 200,
        json: async () => ({ playerId: "p1", gameStatus: "between_rounds" }),
      } as Response);

      render(<JoinPage />);
      await userEvent.type(screen.getByTestId("name-input"), "Alice");
      await userEvent.click(screen.getByTestId("join-button"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/between/test-game-id");
      });
    });

    it("12: reconnect to finished routes correctly", async () => {
      vi.useRealTimers();
      vi.mocked(fetch).mockResolvedValue({
        status: 200,
        json: async () => ({ playerId: "p1", gameStatus: "finished" }),
      } as Response);

      render(<JoinPage />);
      await userEvent.type(screen.getByTestId("name-input"), "Alice");
      await userEvent.click(screen.getByTestId("join-button"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/end/test-game-id");
      });
    });
  });

  describe("Step 2 — opponent strip updates on connection changes", () => {
    it("13: opponent card goes muted when player disconnects (isConnected=false)", () => {
      const { container } = render(
        <OpponentCard name="Bob" score={100} boardsSolved={2} isConnected={false} />,
      );
      const card = container.querySelector("[data-connected]");
      expect(card).toHaveAttribute("data-connected", "false");
      expect(card?.className).toContain("opacity-50");
    });

    it("14: opponent card returns to normal when player reconnects (isConnected=true)", () => {
      const { container } = render(
        <OpponentCard name="Bob" score={100} boardsSolved={2} isConnected={true} />,
      );
      const card = container.querySelector("[data-connected]");
      expect(card).toHaveAttribute("data-connected", "true");
      expect(card?.className).not.toContain("opacity-50");
    });
  });
});
