import { useState } from "react";
import { useNavigate, useParams } from "react-router";

const API_BASE = "http://localhost:3001";

type JoinResponse = {
  playerId?: string;
  gameStatus?: string;
  deadline?: number;
  error?: string;
};

export function JoinPage() {
  const { gameId = "" } = useParams();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setNameError("Please enter your name");
      return;
    }
    setNameError(null);
    setServerError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/game/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, playerName: playerName.trim() }),
        credentials: "include",
      });

      if (response.status === 403) {
        setServerError("This game is full.");
        setSubmitting(false);
        return;
      }
      if (response.status === 404) {
        setServerError("Game not found.");
        setSubmitting(false);
        return;
      }
      if (response.status === 409) {
        setServerError("This game is already finished.");
        setSubmitting(false);
        return;
      }

      const data = (await response.json()) as JoinResponse;
      const status = data.gameStatus ?? "";
      const playerId = data.playerId;

      if (status === "waiting") {
        void navigate(`/wait/${gameId}`, { state: { playerId } });
      } else if (status === "active") {
        void navigate(`/play/${gameId}`, { state: { deadline: data.deadline, playerId } });
      } else if (status === "between_rounds") {
        void navigate(`/between/${gameId}`, { state: { playerId } });
      } else {
        void navigate(`/end/${gameId}`, { state: { playerId } });
      }
    } catch {
      setServerError("Failed to join game. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Join game</h1>
        <p className="text-gray-400 text-sm mb-8">Enter your name to join the game.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              data-testid="name-input"
              type="text"
              value={playerName}
              maxLength={20}
              onChange={(e) => {
                setPlayerName(e.target.value);
                setNameError(null);
              }}
              placeholder="Your name"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition-colors"
            />
            {nameError && (
              <p data-testid="name-error" className="text-red-400 text-sm mt-1">
                {nameError}
              </p>
            )}
          </div>

          {serverError && (
            <p data-testid="server-error" className="text-red-400 text-sm">
              {serverError}
            </p>
          )}

          <button
            data-testid="join-button"
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all"
          >
            {submitting ? "Joining…" : "Join game →"}
          </button>
        </form>
      </div>
    </div>
  );
}
