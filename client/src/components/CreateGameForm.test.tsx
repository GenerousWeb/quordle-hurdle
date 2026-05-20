// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateGameForm } from "./CreateGameForm";

const noop = () => Promise.resolve();

describe("CreateGameForm — form UI", () => {
  it("1: empty name shows error on submit attempt", async () => {
    render(<CreateGameForm onSubmit={noop} />);
    await userEvent.click(screen.getByTestId("submit-button"));
    expect(screen.getByTestId("name-error")).toBeInTheDocument();
  });

  it("2: whitespace-only name shows error on submit", async () => {
    render(<CreateGameForm onSubmit={noop} />);
    await userEvent.type(screen.getByTestId("name-input"), "   ");
    await userEvent.click(screen.getByTestId("submit-button"));
    expect(screen.getByTestId("name-error")).toBeInTheDocument();
  });

  it("3: typing a valid name after error clears the error", async () => {
    render(<CreateGameForm onSubmit={noop} />);
    await userEvent.click(screen.getByTestId("submit-button"));
    expect(screen.getByTestId("name-error")).toBeInTheDocument();
    await userEvent.type(screen.getByTestId("name-input"), "Alice");
    expect(screen.queryByTestId("name-error")).not.toBeInTheDocument();
  });

  it("4: name input is capped at 20 characters", () => {
    render(<CreateGameForm onSubmit={noop} />);
    const input = screen.getByTestId("name-input");
    expect(input).toHaveAttribute("maxLength", "20");
  });

  it("5: maxPlayers slider default value is 10", () => {
    render(<CreateGameForm onSubmit={noop} />);
    const slider = screen.getByTestId("max-players-slider");
    expect(slider).toHaveValue("10");
  });

  it("6: maxPlayers readout updates when slider changes", () => {
    render(<CreateGameForm onSubmit={noop} />);
    const slider = screen.getByTestId("max-players-slider");
    fireEvent.change(slider, { target: { value: "15" } });
    expect(screen.getByTestId("max-players-readout")).toHaveTextContent("15");
  });

  it("7: rounds slider has min=1 and max=5", () => {
    render(<CreateGameForm onSubmit={noop} />);
    const slider = screen.getByTestId("rounds-slider");
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "5");
  });

  it("8: fixed settings (boards, word length, attempts) are not interactive inputs", () => {
    render(<CreateGameForm onSubmit={noop} />);
    const fixed = screen.getByTestId("fixed-settings");
    expect(fixed.querySelectorAll("input, select, textarea")).toHaveLength(0);
  });

  it("9: submit button is enabled when a valid name is entered", async () => {
    render(<CreateGameForm onSubmit={noop} />);
    await userEvent.type(screen.getByTestId("name-input"), "Alice");
    expect(screen.getByTestId("submit-button")).not.toBeDisabled();
  });

  it("10: submit button is disabled while submission is in-flight", async () => {
    let resolveSubmit!: () => void;
    const pendingSubmit = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    const onSubmit = vi.fn(() => pendingSubmit);

    render(<CreateGameForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByTestId("name-input"), "Alice");
    await userEvent.click(screen.getByTestId("submit-button"));

    expect(screen.getByTestId("submit-button")).toBeDisabled();
    resolveSubmit();
    await waitFor(() => expect(screen.getByTestId("submit-button")).not.toBeDisabled());
  });

  it("17: server error during submission shows inline error message", async () => {
    const onSubmit = vi.fn(() => Promise.reject(new Error("Network error")));
    render(<CreateGameForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByTestId("name-input"), "Alice");
    await userEvent.click(screen.getByTestId("submit-button"));
    await waitFor(() => expect(screen.getByTestId("server-error")).toBeInTheDocument());
  });
});
