import { useParams, useLocation, useNavigate } from "react-router";
import AppShell from "../components/layout/AppShell";
import { BoardGrid } from "client/components/BoardGrid";
import { TimerDisplay } from "client/components/TimerDisplay";
import { ScorePopup } from "client/components/ScorePopup";
import { PlayerDot } from "client/components/PlayerDot";
import { OpponentStrip } from "client/components/OpponentStrip";
import { AdminTransferNotification } from "client/components/AdminTransferNotification";
import { boardStore } from "client/store/boardStore";
import { gameStore } from "client/store/gameStore";
import { useGameSocket } from "client/socket/useGameSocket";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { io } from "socket.io-client";
import type { GameConfig, LeaderboardEntry, Player, PodiumEntry, RoundSummary, TileResult } from "shared/types/game";

const SERVER_URL = "http://localhost:3001";

const LOCAL_PLAYER_ID = "player-local";
const PLACEHOLDER_WORDS = ["apple", "grape", "stone", "light"];

function matchGuessLocal(guess: string, target: string): TileResult[] {
  const g = guess.toUpperCase();
  const t = target.toUpperCase();
  const result: TileResult[] = ["grey", "grey", "grey", "grey", "grey"];
  const used = [false, false, false, false, false];
  for (let i = 0; i < 5; i++) {
    if (g[i] === t[i]) { result[i] = "green"; used[i] = true; }
  }
  for (let i = 0; i < 5; i++) {
    if (result[i] === "green") continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && g[i] === t[j]) { result[i] = "yellow"; used[j] = true; break; }
    }
  }
  return result;
}

function handleLocalEnter(guess: string) {
  if (guess.length !== 5) return;
  const state = boardStore.getState();
  const entries = state.boards
    .map((board, boardIndex) => {
      if (board.status !== "unsolved") return null;
      const result = matchGuessLocal(guess, board.targetWord ?? "");
      const solved = result.every((r) => r === "green");
      const attemptCount = board.guesses.length + 1;
      const boardStatus = solved ? "solved" : attemptCount >= 9 ? "failed" : "unsolved";
      return { boardIndex, word: guess, result, boardStatus } as const;
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
  state.setSubmitting(true);
  state.applyAllResults(entries);
}

export default function GamePage() {
  const { gameId = "local" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { playerId?: string; deadline?: number } | null;
  const playerId = state?.playerId ?? LOCAL_PLAYER_ID;
  const joinDeadline = state?.deadline ?? null;
  const roundNumber = 1;

  const [timerDeadline, setTimerDeadline] = useState<number | null>(joinDeadline);
  const [syncedDeadline, setSyncedDeadline] = useState<number | undefined>(undefined);
  const [timerStopped, setTimerStopped] = useState(false);
  const [scorePopup, setScorePopup] = useState<{ delta: number; key: number } | null>(null);
  const myScore = useStore(boardStore, (s) => s.myScore);
  const leaderboard = useStore(gameStore, (s) => s.leaderboard);
  const players = useStore(gameStore, (s) => s.players);
  const adminTransferMessage = useStore(gameStore, (s) => s.adminTransferMessage);

  const opponents = (() => {
    const leaderboardMap = new Map<string, LeaderboardEntry>(leaderboard.map((e) => [e.playerId, e]));
    return players
      .filter((p: Player) => p.playerId !== playerId)
      .map((p: Player) => {
        const lb = leaderboardMap.get(p.playerId);
        return {
          playerId: p.playerId,
          name: p.name,
          score: lb?.score ?? 0,
          boardsSolved: lb?.boardsSolved ?? 0,
          isConnected: p.isConnected,
        };
      });
  })();

  // Seed boards locally until round_started event arrives from server
  useEffect(() => {
    boardStore.getState().initBoards(PLACEHOLDER_WORDS);
  }, [gameId]);

  // Listen for timer-related socket events
  useEffect(() => {
    const socket = io(SERVER_URL, { auth: { playerId } });
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

    socket.on("round_ended", (data: RoundSummary) => {
      setTimerStopped(true);
      gameStore.getState().handleRoundEnded(data);
      void navigate(`/between/${gameId}`, { state: { playerId } });
    });

    socket.on("game_ended", (data: { podium: PodiumEntry[]; finalLeaderboard: LeaderboardEntry[] }) => {
      gameStore.getState().handleGameEnded(data);
      void navigate(`/end/${gameId}`, { state: { playerId } });
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
      (data: { leaderboard: Array<{ playerId: string; name: string; score: number; boardsSolved: number }> }) => {
        gameStore.getState().handleLeaderboardUpdate(data);
        const entry = data.leaderboard.find((p) => p.playerId === playerId);
        if (entry) {
          boardStore.getState().setMyScore(entry.score);
        }
      },
    );

    socket.on(
      "game_state_update",
      (data: { players: Player[]; status: string; settings: GameConfig }) => {
        gameStore.getState().handleGameStateUpdate(data);
      },
    );

    socket.on(
      "admin_transferred",
      (data: { newAdminId: string; newAdminName: string }) => {
        gameStore.getState().handleAdminTransferred(data);
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [gameId, playerId]);

  const { handleEnter, guessError } = useGameSocket({
    gameId,
    roundNumber,
    playerId,
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
        {leaderboard.length > 0 && (
          <div className="mb-4 flex items-center gap-3" data-testid="nav-player-dots">
            {leaderboard.map((entry) => (
              <PlayerDot
                key={entry.playerId}
                name={entry.name}
                score={entry.score}
                isMe={entry.playerId === playerId}
              />
            ))}
          </div>
        )}
        {opponents.length > 0 && (
          <div className="mb-4 w-full">
            <OpponentStrip opponents={opponents} myPlayerId={playerId} />
          </div>
        )}
        {guessError !== null && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-lg z-50">
            {guessError}
          </div>
        )}
        <BoardGrid onEnter={gameId === "local" ? handleLocalEnter : handleEnter} />
        {scorePopup !== null && (
          <ScorePopup key={scorePopup.key} totalScoreDelta={scorePopup.delta} />
        )}
        <AdminTransferNotification message={adminTransferMessage} />
      </div>
    </AppShell>
  );
}
