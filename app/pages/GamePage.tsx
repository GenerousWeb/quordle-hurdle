import { useParams, useLocation } from "react-router";
import AppShell from "../components/layout/AppShell";
import { BoardGrid } from "client/components/BoardGrid";
import { TimerDisplay } from "client/components/TimerDisplay";
import { ScorePopup } from "client/components/ScorePopup";
import { boardStore } from "client/store/boardStore";
import { useGameSocket } from "client/socket/useGameSocket";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";

// Placeholder until session/auth is wired up
const PLACEHOLDER_PLAYER_ID = "player-local";
const PLACEHOLDER_ROUND = 1;
const PLACEHOLDER_WORDS = ["apple", "grape", "stone", "light"];

export default function GamePage() {
  const { gameId = "local" } = useParams();
  const location = useLocation();
  const joinDeadline = (location.state as { deadline?: number } | null)?.deadline ?? null;

  const [timerDeadline, setTimerDeadline] = useState<number | null>(joinDeadline);
  const [syncedDeadline, setSyncedDeadline] = useState<number | undefined>(undefined);
  const [timerStopped, setTimerStopped] = useState(false);
  const [scorePopup, setScorePopup] = useState<{ delta: number; key: number } | null>(null);
  const myScore = useStore(boardStore, (s) => s.myScore);

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
        setScorePopup(null);
      },
    );

    socket.on("timer_sync", ({ deadline }: { deadline: number }) => {
      setSyncedDeadline(deadline);
    });

    socket.on("round_ended", () => {
      setTimerStopped(true);
    });

    socket.on(
      "guess_result",
      (data: { totalScoreDelta?: number }) => {
        if (typeof data.totalScoreDelta === "number") {
          setScorePopup({ delta: data.totalScoreDelta, key: Date.now() });
        }
      },
    );

    socket.on(
      "leaderboard_update",
      (data: { leaderboard: Array<{ playerId: string; score: number }> }) => {
        const entry = data.leaderboard.find(
          (p) => p.playerId === PLACEHOLDER_PLAYER_ID,
        );
        if (entry) {
          boardStore.getState().setMyScore(entry.score);
        }
      },
    );

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
          <div className="mb-4 flex items-center gap-4">
            <TimerDisplay
              deadline={timerDeadline}
              syncedDeadline={syncedDeadline}
              stopped={timerStopped}
            />
            <span data-testid="nav-score" className="text-white font-semibold">
              {myScore}
            </span>
          </div>
        )}
        <BoardGrid onEnter={handleEnter} />
        {scorePopup !== null && (
          <ScorePopup key={scorePopup.key} totalScoreDelta={scorePopup.delta} />
        )}
      </div>
    </AppShell>
  );
}
