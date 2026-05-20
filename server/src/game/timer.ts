type TimerIO = {
  to(room: string): { emit(event: string, data?: unknown): void };
};

type ActiveTimer = {
  deadlineTimeout: ReturnType<typeof setTimeout>;
  syncInterval: ReturnType<typeof setInterval>;
};

const activeTimers = new Map<string, ActiveTimer>();

export function startRoundTimer(io: TimerIO, gameId: string, deadline: number): void {
  stopRoundTimer(gameId);

  const now = Date.now();
  const delay = Math.max(0, deadline - now);

  const syncInterval = setInterval(() => {
    io.to(gameId).emit("timer_sync", { deadline });
  }, 60_000);

  const deadlineTimeout = setTimeout(() => {
    clearInterval(syncInterval);
    activeTimers.delete(gameId);
    io.to(gameId).emit("round_ended");
  }, delay);

  activeTimers.set(gameId, { deadlineTimeout, syncInterval });
}

export function stopRoundTimer(gameId: string): void {
  const timer = activeTimers.get(gameId);
  if (!timer) return;
  clearTimeout(timer.deadlineTimeout);
  clearInterval(timer.syncInterval);
  activeTimers.delete(gameId);
}
