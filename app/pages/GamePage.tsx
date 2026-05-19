import { useParams } from "react-router";
import AppShell from "../components/layout/AppShell";
import { BoardGrid } from "client/components/BoardGrid";
import { boardStore } from "client/store/boardStore";
import { useGameSocket } from "client/socket/useGameSocket";
import { useEffect } from "react";

const SERVER_URL = "http://localhost:3001";

// Placeholder until session/auth is wired up
const PLACEHOLDER_PLAYER_ID = "player-local";
const PLACEHOLDER_ROUND = 1;
const PLACEHOLDER_WORDS = ["apple", "grape", "stone", "light"];

export default function GamePage() {
  const { gameId = "local" } = useParams();

  // Seed boards locally until round_started event arrives from server
  useEffect(() => {
    boardStore.getState().initBoards(PLACEHOLDER_WORDS);
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
        <BoardGrid onEnter={handleEnter} />
      </div>
    </AppShell>
  );
}
