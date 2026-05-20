import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { io, type Socket } from "socket.io-client";
import AppShell from "../components/layout/AppShell";
import { AdminControls } from "client/components/AdminControls";

const SERVER_URL = "http://localhost:3001";
const PLACEHOLDER_PLAYER_ID = "player-local";

export default function EndGamePage() {
  const { gameId = "" } = useParams();
  const [isAdmin] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      auth: { playerId: PLACEHOLDER_PLAYER_ID, role: "player" },
    });
    socketRef.current = socket;
    socket.emit("join_game", { gameId });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [gameId]);

  const handleRestartGame = () => {
    socketRef.current?.emit("restart_game", { gameId });
  };

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-100">Game Over</h1>
          <AdminControls
            isAdmin={isAdmin}
            status="finished"
            players={[]}
            onRestartGame={handleRestartGame}
          />
        </div>
      </div>
    </AppShell>
  );
}
