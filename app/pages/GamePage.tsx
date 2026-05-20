import { useParams } from "react-router";
import AppShell from "../components/layout/AppShell";
import { BoardGrid } from "client/components/BoardGrid";
import { TimerDisplay } from "client/components/TimerDisplay";
import { boardStore } from "client/store/boardStore";
import { useGameSocket } from "client/socket/useGameSocket";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";

// Placeholder until session/auth is wired up
const PLACEHOLDER_PLAYER_ID = "player-local";
const PLACEHOLDER_ROUND = 1;
const PLACEHOLDER_WORDS = ["apple", "grape", "stone", "light"];

export default function GamePage() {
  const { gameId = "local" } = useParams();

  const [timerDeadline, setTimerDeadline] = useState<number | null>(null);
  const [syncedDeadline, setSyncedDeadline] = useState<number | undefined>(undefined);
  const [timerStopped, setTimerStopped] = useState(false);

  // Seed boards locally until round_started event arrives from server
  useEffect(() => {
    boardStore.getState().initBoards(PLACEHOLDER_WORDS);
  }, [gameId]);

  // Listen for timer-related socket events
  useEffect(() => {
    const socket = io(SERVER_URL, { auth: { playerId: PLACEHOLDER_PLAYER_ID } });
    socket.emit("join_game", { gameId });

    socket.on(
      "round_started",
      ({ deadline }: { deadline: number }) => {
        setTimerDeadline(deadline);
        setTimerStopped(false);
        setSyncedDeadline(undefined);
      },
    );

    socket.on("timer_sync", ({ deadline }: { deadline: number }) => {
      setSyncedDeadline(deadline);
    });

    socket.on("round_ended", () => {
      setTimerStopped(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [gameId]);

  const { handleEnter } = useGameSocket({
    gameId,
    roundNumber: PLACEHOLDER_ROUND,
    playerId: PLACEHOLDER_PLAYER_ID,
    serverUrl: SERVER_URL,
  });

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4">
        {timerDeadline !== null && (
          <div className="mb-4">
            <TimerDisplay
              deadline={timerDeadline}
              syncedDeadline={syncedDeadline}
              stopped={timerStopped}
            />
          </div>
        )}
        <BoardGrid onEnter={handleEnter} />
      </div>
    </AppShell>
  );
}
