import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useStore } from "zustand/react";
import { io, type Socket } from "socket.io-client";
import AppShell from "../components/layout/AppShell";
import { WaitingRoom } from "client/components/WaitingRoom";
import { AdminControls } from "client/components/AdminControls";
import { gameStore } from "client/store/gameStore";
import type { GameConfig, Player } from "shared/types/game";

const SERVER_URL = "http://localhost:3001";

// Placeholder until session/auth is wired up
const PLACEHOLDER_PLAYER_ID = "player-local";

export default function WaitingRoomPage() {
  const { gameId = "" } = useParams();
  const { players, settings } = useStore(gameStore);
  const [isAdmin, setIsAdmin] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const inviteLink = `https://game.app/play/${gameId}`;

  useEffect(() => {
    const socket = io(SERVER_URL, {
      auth: { playerId: PLACEHOLDER_PLAYER_ID },
    });
    socketRef.current = socket;

    socket.emit("join_game", { gameId });

    socket.on(
      "game_state_update",
      (data: { players: Player[]; status: string; settings: GameConfig }) => {
        gameStore.getState().handleGameStateUpdate(data);
        const adminPlayer = data.players.find((p) => p.role === "admin");
        setIsAdmin(adminPlayer?.playerId === PLACEHOLDER_PLAYER_ID);
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [gameId]);

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
