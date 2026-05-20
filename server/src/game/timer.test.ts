import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startRoundTimer, stopRoundTimer } from "./timer";

type EmittedEvent = { room: string; event: string; data: unknown };

function createMockIo() {
  const emitted: EmittedEvent[] = [];
  const io = {
    to: (room: string) => ({
      emit: (event: string, data?: unknown) => {
        emitted.push({ room, event, data });
      },
    }),
  };
  return { io, emitted };
}

describe("server round timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    stopRoundTimer("test-game");
  });

  it("11: fires round_ended to the game room at deadline", () => {
    const { io, emitted } = createMockIo();
    const deadline = Date.now() + 2000;
    startRoundTimer(io, "test-game", deadline);

    vi.advanceTimersByTime(2000);

    const roundEndedEvents = emitted.filter((e) => e.event === "round_ended");
    expect(roundEndedEvents).toHaveLength(1);
    expect(roundEndedEvents[0].room).toBe("test-game");
  });

  it("12: timer_sync is emitted every 60 seconds during active round", () => {
    const { io, emitted } = createMockIo();
    const deadline = Date.now() + 200000; // 200s deadline
    startRoundTimer(io, "test-game", deadline);

    vi.advanceTimersByTime(60000);
    expect(emitted.filter((e) => e.event === "timer_sync")).toHaveLength(1);

    vi.advanceTimersByTime(60000);
    expect(emitted.filter((e) => e.event === "timer_sync")).toHaveLength(2);
  });

  it("13: timer_sync payload contains numeric deadline field", () => {
    const { io, emitted } = createMockIo();
    const deadline = Date.now() + 200000;
    startRoundTimer(io, "test-game", deadline);

    vi.advanceTimersByTime(60000);

    const syncEvent = emitted.find((e) => e.event === "timer_sync");
    expect(syncEvent).toBeDefined();
    expect(syncEvent?.data).toEqual({ deadline });
  });
});
