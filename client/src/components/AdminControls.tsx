type AdminControlsProps = {
  isAdmin: boolean;
  status: string;
  players: { name: string }[];
  onStartGame?: () => void;
  onStartNextRound?: () => void;
  onEndGame?: () => void;
  onRestartGame?: () => void;
  onShuffleWords?: () => void;
};

export function AdminControls({
  isAdmin,
  status,
  players,
  onStartGame,
  onStartNextRound,
  onEndGame,
  onRestartGame,
}: AdminControlsProps) {
  if (status === "waiting") {
    if (!isAdmin) {
      return <p data-testid="admin-waiting-message">Waiting for the admin to start the game…</p>;
    }
    return (
      <button
        data-testid="admin-start-game"
        onClick={onStartGame}
        disabled={players.length === 0}
      >
        Start Game
      </button>
    );
  }

  if (status === "between_rounds" && isAdmin) {
    return (
      <div>
        <button data-testid="admin-start-next-round" onClick={onStartNextRound}>
          Start Next Round
        </button>
        <button data-testid="admin-end-game" onClick={onEndGame}>
          End Game
        </button>
      </div>
    );
  }

  if (status === "finished" && isAdmin) {
    return (
      <button data-testid="admin-play-again" onClick={onRestartGame}>
        Play Again
      </button>
    );
  }

  return null;
}
