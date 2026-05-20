// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Podium } from "./Podium";
import type { PodiumEntry } from "shared/types/game";

describe("Podium", () => {
  it("9: shows exactly 3 slots for 4-player game (top 3 only)", () => {
    const entries: PodiumEntry[] = [
      { rank: 1, name: "Alex", score: 317 },
      { rank: 2, name: "Sam", score: 252 },
      { rank: 3, name: "Jordan", score: 185 },
    ];
    render(<Podium entries={entries} />);
    expect(screen.getAllByTestId("podium-slot")).toHaveLength(3);
  });

  it("10: shows only 2 slots for 2-player game", () => {
    const entries: PodiumEntry[] = [
      { rank: 1, name: "Alex", score: 317 },
      { rank: 2, name: "Sam", score: 252 },
    ];
    render(<Podium entries={entries} />);
    expect(screen.getAllByTestId("podium-slot")).toHaveLength(2);
  });

  it("11: 1st place slot has distinct styling from 2nd and 3rd", () => {
    const entries: PodiumEntry[] = [
      { rank: 1, name: "Alex", score: 317 },
      { rank: 2, name: "Sam", score: 252 },
      { rank: 3, name: "Jordan", score: 185 },
    ];
    render(<Podium entries={entries} />);
    const slots = screen.getAllByTestId("podium-slot");
    const first = slots.find((s) => s.getAttribute("data-rank") === "1")!;
    const second = slots.find((s) => s.getAttribute("data-rank") === "2")!;
    expect(first).toHaveAttribute("data-rank", "1");
    expect(first.className).not.toBe(second.className);
  });

  it("12: podium displays correct name and score for 1st place", () => {
    const entries: PodiumEntry[] = [{ rank: 1, name: "Alex", score: 317 }];
    render(<Podium entries={entries} />);
    const slot = screen.getByTestId("podium-slot");
    expect(slot).toHaveTextContent("Alex");
    expect(slot).toHaveTextContent("317");
  });
});
