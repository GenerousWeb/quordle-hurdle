import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { useStore } from "zustand/react";
import { io, type Socket } from "socket.io-client";
import AppShell from "../components/layout/AppShell";
import { WaitingRoom } from "client/components/WaitingRoom";
import { AdminControls } from "client/components/AdminControls";
import { gameStore } from "client/store/gameStore";
import type { GameConfig, Player } from "shared/types/game";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export default function WaitingRoomPage() {
  const { gameId = "" } = useParams();
  const location = useLocation();
  const playerId = (location.state as { playerId?: string } | null)?.playerId ?? "";
  const navigate = useNavigate();
  const { players, settings } = useStore(gameStore);
  const [isAdmin, setIsAdmin] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${gameId}`;

  useEffect(() => {
    const socket = io(SERVER_URL, {
      auth: { playerId },
    });
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [gameId, playerId, navigate]);

  const handleStart = () => {
    socketRef.current?.emit("start_game", { gameId });
  };

  const handleEndGame = () => {
    socketRef.current?.emit("end_game", { gameId });
  };

  return (
    <AppShell>
      <WaitingRoom
        inviteLink={inviteLink}
        players={players}
        isAdmin={isAdmin}
        rounds={settings?.rounds ?? 3}
        timeLimitSeconds={settings?.timeLimitSeconds ?? 120}
        maxPlayers={settings?.maxPlayers ?? 8}
        onStart={handleStart}
      />
      <AdminControls
        isAdmin={isAdmin}
        status="waiting"
        players={players}
        onStartGame={handleStart}
        onEndGame={handleEndGame}
      />
    </AppShell>
  );
}
