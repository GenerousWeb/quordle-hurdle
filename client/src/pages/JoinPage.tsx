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

      if (status === "waiting") {
        navigate(`/wait/${gameId}`);
      } else if (status === "active") {
        navigate(`/play/${gameId}`, { state: { deadline: data.deadline } });
      } else if (status === "between_rounds") {
        navigate(`/between/${gameId}`);
      } else {
        navigate(`/end/${gameId}`);
      }
    } catch {
      setServerError("Failed to join game. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Join Game</h1>
      <form onSubmit={handleSubmit}>
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
          />
          {nameError && <p data-testid="name-error">{nameError}</p>}
        </div>
        {serverError && <p data-testid="server-error">{serverError}</p>}
        <button data-testid="join-button" type="submit" disabled={submitting}>
          Join
        </button>
      </form>
    </div>
  );
}
