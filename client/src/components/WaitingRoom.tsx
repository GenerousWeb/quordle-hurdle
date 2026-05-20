import { useState } from "react";
import type { Player } from "shared/types/game";

type WaitingRoomProps = {
  inviteLink: string;
  players: Player[];
  isAdmin: boolean;
  rounds: number;
  timeLimitSeconds: number;
  maxPlayers: number;
  onStart: () => void;
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WaitingRoom({
  inviteLink,
  players,
  isAdmin,
  rounds,
  timeLimitSeconds,
  maxPlayers,
  onStart,
}: WaitingRoomProps) {
  const [copyFallback, setCopyFallback] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch {
      setCopyFallback(true);
    }
  };

  return (
    <div>
      <h1>Waiting Room</h1>

      <div>
        <span>{inviteLink}</span>
        <button data-testid="copy-link-button" onClick={handleCopy}>
          Copy
        </button>
        {copyFallback && (
          <input type="text" defaultValue={inviteLink} readOnly />
        )}
      </div>

      {/* qrcode package not in package.json; container present for future use */}
      <div data-testid="qr-code-area" aria-label="QR code" />

      <div data-testid="config-summary">
        <span>{rounds} rounds</span>
        <span>{formatTime(timeLimitSeconds)}</span>
        <span>{maxPlayers} players</span>
      </div>

      <ul data-testid="player-list">
        {players.map((player) => (
          <li key={player.playerId}>
            <span>{player.name}</span>
            {player.role === "admin" && (
              <span data-testid="admin-badge">admin</span>
            )}
          </li>
        ))}
      </ul>

      {isAdmin ? (
        <button
          data-testid="start-game-button"
          onClick={onStart}
          disabled={players.length === 0}
        >
          Start Game
        </button>
      ) : (
        <p data-testid="waiting-message">Waiting for the admin to start the game…</p>
      )}
    </div>
  );
}
