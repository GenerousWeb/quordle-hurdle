import { useState } from "react";
import type { GameConfig } from "shared/types/game";

type SubmitData = { adminName: string } & GameConfig;

type Props = {
  onSubmit: (data: SubmitData) => Promise<void>;
};

export function CreateGameForm({ onSubmit }: Props) {
  const [adminName, setAdminName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [rounds, setRounds] = useState(3);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(120);
  const [nameError, setNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) {
      setNameError("Please enter your name");
      return;
    }
    setNameError(null);
    setServerError(null);
    setSubmitting(true);
    try {
      await onSubmit({ adminName: adminName.trim(), maxPlayers, rounds, timeLimitSeconds });
    } catch {
      setServerError("Failed to create game. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form data-testid="create-game-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="adminName">Your name</label>
        <input
          id="adminName"
          data-testid="name-input"
          type="text"
          value={adminName}
          maxLength={20}
          onChange={(e) => {
            setAdminName(e.target.value);
            setNameError(null);
          }}
        />
        {nameError && <p data-testid="name-error">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="maxPlayers">
          Max players{" "}
          <span data-testid="max-players-readout">{maxPlayers}</span>
        </label>
        <input
          id="maxPlayers"
          data-testid="max-players-slider"
          type="range"
          min={2}
          max={20}
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
        />
      </div>

      <div>
        <label htmlFor="rounds">
          Number of rounds{" "}
          <span data-testid="rounds-readout">{rounds}</span>
        </label>
        <input
          id="rounds"
          data-testid="rounds-slider"
          type="range"
          min={1}
          max={5}
          value={rounds}
          onChange={(e) => setRounds(parseInt(e.target.value))}
        />
      </div>

      <div>
        <label htmlFor="timeLimitSeconds">Time per round</label>
        <select
          id="timeLimitSeconds"
          data-testid="time-select"
          value={timeLimitSeconds}
          onChange={(e) => setTimeLimitSeconds(parseInt(e.target.value))}
        >
          <option value={60}>60s</option>
          <option value={90}>90s</option>
          <option value={120}>120s</option>
          <option value={180}>180s</option>
        </select>
      </div>

      <div data-testid="fixed-settings">
        <span>4 boards</span>
        <span>5-letter words</span>
        <span>9 attempts per board</span>
      </div>

      {serverError && <p data-testid="server-error">{serverError}</p>}

      <button data-testid="submit-button" type="submit" disabled={submitting}>
        Create game →
      </button>
    </form>
  );
}
