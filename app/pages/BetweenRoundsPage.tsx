import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { useStore } from "zustand/react";
import { io, type Socket } from "socket.io-client";
import AppShell from "../components/layout/AppShell";
import { BetweenRounds } from "client/pages/BetweenRounds";
import { gameStore } from "client/store/gameStore";
import type { GameConfig, LeaderboardEntry, Player, PodiumEntry } from "shared/types/game";

const SERVER_URL = "http://localhost:3001";

export default function BetweenRoundsPage() {
  const { gameId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const playerId = (location.state as { playerId?: string } | null)?.playerId ?? "";
  const [isAdmin, setIsAdmin] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const roundSummary = useStore(gameStore, (s) => s.roundSummary);
  const settings = useStore(gameStore, (s) => s.settings);

  useEffect(() => {
    const socket = io(SERVER_URL, { auth: { playerId } });
    socketRef.current = socket;
    socket.emit("join_game", { gameId });

    socket.on(
      "game_state_update",
      (data: { players: Player[]; status: string; settings: GameConfig }) => {
        gameStore.getState().handleGameStateUpdate(data);
        const adminPlayer = data.players.find((p) => p.role === "admin");
        setIsAdmin(adminPlayer?.playerId === playerId);
      },
    );

    socket.on("round_started", ({ deadline, roundNumber }: { deadline: number; roundNumber: number }) => {
      void navigate(`/play/${gameId}`, { state: { playerId, deadline, roundNumber } });
    });

    socket.on("game_ended", (data: { podium: PodiumEntry[]; finalLeaderboard: LeaderboardEntry[] }) => {
      gameStore.getState().handleGameEnded(data);
      void navigate(`/end/${gameId}`, { state: { playerId } });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [gameId, playerId, navigate]);

  const handleStartNextRound = () => {
    socketRef.current?.emit("start_next_round", { gameId });
  };

  const handleEndGame = () => {
    socketRef.current?.emit("end_game", { gameId });
  };

  const isLastRound =
    roundSummary !== null &&
    settings !== null &&
    roundSummary.roundNumber >= settings.rounds;

  if (!roundSummary) {
    return (
      <AppShell>
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
          <p className="text-gray-400">Loading results…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-56px)] px-4 py-8">
        <BetweenRounds
          roundSummary={roundSummary}
          myPlayerId={playerId}
          isAdmin={isAdmin}
          isLastRound={isLastRound}
          onStartNextRound={handleStartNextRound}
          onEndGame={handleEndGame}
        />
      </div>
    </AppShell>
  );
}
