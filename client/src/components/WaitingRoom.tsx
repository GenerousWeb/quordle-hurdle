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

const AVATAR_COLORS = [
  "bg-indigo-400",
  "bg-green-400",
  "bg-yellow-400",
  "bg-pink-400",
  "bg-blue-400",
  "bg-purple-400",
  "bg-orange-400",
  "bg-teal-400",
];

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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFallback(true);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Waiting for players</h1>
      <p className="text-gray-400 text-sm mb-6">Share the link — no account needed to join.</p>

      {/* Invite link */}
      <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 mb-6">
        <span className="text-indigo-400 text-sm truncate">{inviteLink}</span>
        <button
          data-testid="copy-link-button"
          onClick={handleCopy}
          className="ml-4 text-gray-400 hover:text-gray-100 text-sm font-medium transition-colors shrink-0"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        {copyFallback && <input type="text" defaultValue={inviteLink} readOnly className="sr-only" />}
      </div>

      <div data-testid="qr-code-area" aria-label="QR code" className="hidden" />

      {/* Config summary */}
      <div data-testid="config-summary" className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg py-4 text-center">
          <div className="text-3xl font-bold text-white">{rounds}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Rounds</div>
          <span className="sr-only">{rounds} rounds</span>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg py-4 text-center">
          <div className="text-3xl font-bold text-white">{formatTime(timeLimitSeconds)}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Per round</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg py-4 text-center">
          <div className="text-3xl font-bold text-white">{maxPlayers}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Max players</div>
          <span className="sr-only">{maxPlayers} players</span>
        </div>
      </div>

      {/* Player list */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Players ({players.length} / {maxPlayers})
        </h2>
        <ul data-testid="player-list" className="space-y-2">
          {players.map((player, i) => (
            <li
              key={player.playerId}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-gray-900 font-bold text-sm ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                >
                  {player.name[0].toUpperCase()}
                </div>
                <span className="text-gray-100">{player.name}</span>
              </div>
              <div>
                {player.role === "admin" && (
                  <span
                    data-testid="admin-badge"
                    className="px-2 py-1 text-xs font-medium bg-indigo-900 text-indigo-300 rounded-md"
                  >
                    admin
                  </span>
                )}
                {player.role === "player" && player.isConnected && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-900/50 text-green-400 rounded-md">
                    ready
                  </span>
                )}
                {player.role === "player" && !player.isConnected && (
                  <span className="text-xs text-gray-500">joining…</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isAdmin ? (
        <button
          data-testid="start-game-button"
          onClick={onStart}
          disabled={players.length === 0}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-lg"
        >
          Start game →
        </button>
      ) : (
        <p data-testid="waiting-message" className="text-center text-gray-400">
          Waiting for the admin to start the game…
        </p>
      )}
    </div>
  );
}
