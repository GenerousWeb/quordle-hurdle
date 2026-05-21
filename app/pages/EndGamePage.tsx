import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { useStore } from "zustand/react";
import { io, type Socket } from "socket.io-client";
import AppShell from "../components/layout/AppShell";
import { EndGame } from "client/pages/EndGame";
import { gameStore } from "client/store/gameStore";
import type { GameConfig, LeaderboardEntry, Player, PodiumEntry } from "shared/types/game";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export default function EndGamePage() {
  const { gameId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const playerId = (location.state as { playerId?: string } | null)?.playerId ?? "";
  const [isAdmin, setIsAdmin] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const endGameData = useStore(gameStore, (s) => s.endGameData);
  const settings = useStore(gameStore, (s) => s.settings);

  useEffect(() => {
    const socket = io(SERVER_URL, { auth: { playerId } });
    socketRef.current = socket;
    socket.emit("join_game", { gameId });

    socket.on("game_state_update", (data: { players: Player[]; status: string; settings: GameConfig }) => {
      gameStore.getState().handleGameStateUpdate(data);
      const adminPlayer = data.players.find((p) => p.role === "admin");
      setIsAdmin(adminPlayer?.playerId === playerId);
    });

    socket.on("game_ended", (data: { podium: PodiumEntry[]; finalLeaderboard: LeaderboardEntry[] }) => {
      gameStore.getState().handleGameEnded(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [gameId, playerId]);

  const handleRestartGame = () => {
    navigate("/");
  };

  if (!endGameData) {
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
        <EndGame
          podium={endGameData.podium}
          finalLeaderboard={endGameData.finalLeaderboard}
          myPlayerId={playerId}
          isAdmin={isAdmin}
          rounds={settings?.rounds}
          onRestartGame={handleRestartGame}
        />
      </div>
    </AppShell>
  );
}
