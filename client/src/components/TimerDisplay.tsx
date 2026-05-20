import { useEffect, useRef, useState } from "react";
import { boardStore } from "../store/boardStore";

interface TimerDisplayProps {
  deadline: number;
  syncedDeadline?: number;
  stopped?: boolean;
}

function formatMMSS(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TimerDisplay({ deadline, syncedDeadline, stopped }: TimerDisplayProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(remaining);
  const stoppedRef = useRef(stopped ?? false);

  // Keep stoppedRef in sync so the interval callback sees the latest value
  stoppedRef.current = stopped ?? false;

  // Apply drift correction when syncedDeadline changes
  useEffect(() => {
    if (syncedDeadline === undefined) return;
    const newRemaining = Math.max(0, syncedDeadline - Date.now());
    const drift = Math.abs(remainingRef.current - newRemaining);
    if (drift > 2000) {
      remainingRef.current = newRemaining;
      setRemaining(newRemaining);
    }
  }, [syncedDeadline]);

  // Stop the timer when stopped becomes true
  useEffect(() => {
    if (!stopped) return;
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    boardStore.getState().lockAllBoards();
  }, [stopped]);

  // Start the countdown interval on mount
  useEffect(() => {
    const initialRemaining = Math.max(0, deadline - Date.now());
    remainingRef.current = initialRemaining;
    setRemaining(initialRemaining);

    if (stoppedRef.current) return;

    intervalRef.current = setInterval(() => {
      if (stoppedRef.current) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      const next = Math.max(0, remainingRef.current - 1000);
      remainingRef.current = next;
      setRemaining(next);
      if (next <= 0) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        boardStore.getState().lockAllBoards();
      }
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [deadline]);

  const isUrgent = remaining < 20000 && remaining > 0;

  return (
    <span
      data-testid="timer-display"
      data-urgent={isUrgent ? "true" : "false"}
      className={isUrgent ? "text-red-500 animate-pulse font-mono" : "font-mono"}
    >
      {formatMMSS(remaining)}
    </span>
  );
}
