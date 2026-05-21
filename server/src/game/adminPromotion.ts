export type PlayerForPromotion = {
  playerId: string;
  name: string;
  isConnected: boolean;
  joinedAt: number;
};

type IoLike = {
  to(room: string): { emit(event: string, data?: unknown): void };
};

export function selectNextAdmin(
  players: PlayerForPromotion[],
  currentAdminId: string,
): PlayerForPromotion | null {
  const eligible = players
    .filter((p) => p.isConnected && p.playerId !== currentAdminId)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  return eligible[0] ?? null;
}

export function handleAdminDisconnect(
  io: IoLike,
  gameId: string,
  disconnectingPlayerId: string,
  currentAdminId: string | null,
  players: PlayerForPromotion[],
  updateAdminId: (newAdminId: string | null) => void,
): void {
  if (disconnectingPlayerId !== currentAdminId) return;

  const next = selectNextAdmin(players, disconnectingPlayerId);

  if (next) {
    updateAdminId(next.playerId);
    io.to(gameId).emit("admin_transferred", {
      newAdminId: next.playerId,
      newAdminName: next.name,
    });
  } else {
    updateAdminId(null);
  }
}
