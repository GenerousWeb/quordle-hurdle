// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JoinPage } from "./JoinPage";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ gameId: "test-game-id" }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

describe("JoinPage — join flow", () => {
  it("6: empty name shows inline error without submitting", async () => {
    render(<JoinPage />);
    await userEvent.click(screen.getByTestId("join-button"));
    expect(screen.getByTestId("name-error")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("7: whitespace-only name shows inline error", async () => {
    render(<JoinPage />);
    await userEvent.type(screen.getByTestId("name-input"), "   ");
    await userEvent.click(screen.getByTestId("join-button"));
    expect(screen.getByTestId("name-error")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("8: waiting game routes to /wait/{gameId}", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      json: async () => ({ playerId: "p1", gameStatus: "waiting" }),
    } as Response);

    render(<JoinPage />);
    await userEvent.type(screen.getByTestId("name-input"), "Alice");
    await userEvent.click(screen.getByTestId("join-button"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/wait/test-game-id");
    });
  });

  it("9: active game routes to /play/{gameId}", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      json: async () => ({
        playerId: "p1",
        gameStatus: "active",
        deadline: Date.now() + 30000,
      }),
    } as Response);

    render(<JoinPage />);
    await userEvent.type(screen.getByTestId("name-input"), "Alice");
    await userEvent.click(screen.getByTestId("join-button"));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/play/test-game-id",
        expect.objectContaining({ state: expect.objectContaining({ deadline: expect.any(Number) }) }),
      );
    });
  });

  it("10: finished game routes to /end/{gameId}", async () => {
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

  it("11: full game message shown on 403 response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 403,
      json: async () => ({ error: "game_full" }),
    } as Response);

    render(<JoinPage />);
    await userEvent.type(screen.getByTestId("name-input"), "Alice");
    await userEvent.click(screen.getByTestId("join-button"));

    await waitFor(() => {
      expect(screen.getByTestId("server-error")).toHaveTextContent(/game is full/i);
    });
  });
});
