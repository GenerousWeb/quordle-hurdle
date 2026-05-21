import { useNavigate } from "react-router";
import AppShell from "../components/layout/AppShell";
import { CreateGameForm } from "client/components/CreateGameForm";
import type { GameConfig } from "shared/types/game";

const API_BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export default function CreatePage() {
  const navigate = useNavigate();

  const handleSubmit = async (data: { adminName: string } & GameConfig) => {
    const response = await fetch(`${API_BASE}/game/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to create game");
    }

    const { gameId } = (await response.json()) as { gameId: string; inviteLink: string };
    void navigate(`/wait/${gameId}`);
  };

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-100 mb-8 text-center">Create a game</h1>
          <CreateGameForm onSubmit={handleSubmit} />
        </div>
      </div>
    </AppShell>
  );
}
