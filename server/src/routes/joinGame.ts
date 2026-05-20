import { randomUUID } from "crypto";
import { gameSessions } from "./createGame";

type PlayerRecord = { name: string; isConnected: boolean };

// Players who have joined via POST /game/join, keyed by gameId → playerId → record
export const gamePlayers = new Map<string, Map<string, PlayerRecord>>();

// Active round deadlines, keyed by gameId (set when a round starts)
export const gameDeadlines = new Map<string, number>();

type IoLike = {
  to(room: string): { emit(event: string, data?: unknown): void };
};

type JoinBody = {
  gameId?: string;
  playerName?: string;
};

type JoinResult =
  | { status: 200; body: { playerId: string; gameStatus: string; deadline?: number }; cookie: string }
  | { status: 403; body: { error: "game_full" } }
  | { status: 404; body: { error: "game_not_found" } }
  | { status: 409; body: { error: "game_finished" } };

function buildGameStateUpdate(gameId: string) {
  const players = gamePlayers.get(gameId) ?? new Map<string, PlayerRecord>();
  return {
    players: Array.from(players.entries()).map(([pid, p]) => ({
      playerId: pid,
      name: p.name,
      isConnected: p.isConnected,
    })),
  };
}

export function handlePlayerDisconnect(io: IoLike, gameId: string, playerId: string): void {
  const players = gamePlayers.get(gameId);
  if (players) {
    const player = players.get(playerId);
    if (player) player.isConnected = false;
  }
  io.to(gameId).emit("game_state_update", buildGameStateUpdate(gameId));
}

export function handlePlayerJoinSocket(io: IoLike, gameId: string, playerId: string): void {
  const players = gamePlayers.get(gameId);
  if (players) {
    const player = players.get(playerId);
    if (player) player.isConnected = true;
  }
  io.to(gameId).emit("game_state_update", buildGameStateUpdate(gameId));
}

export function handleJoinGame(body: JoinBody, existingPlayerId?: string): JoinResult {
  const { gameId, playerName } = body;

  // Reconnect path: match returning player by session cookie identity
  if (existingPlayerId && gameId) {
    const session = gameSessions.get(gameId);
    if (!session) {
      return { status: 404, body: { error: "game_not_found" } };
    }

    const players = gamePlayers.get(gameId);
    if (players && players.has(existingPlayerId)) {
      const player = players.get(existingPlayerId)!;
      const isFinished = session.status === "ended";
      if (!isFinished) {
        player.isConnected = true;
      }
      const gameStatus = isFinished ? "finished" : session.status;
      const sessionPayload = JSON.stringify({ playerId: existingPlayerId, gameId });
      const cookie = `session=${encodeURIComponent(sessionPayload)}; HttpOnly; Path=/; SameSite=Lax`;
      const responseBody: { playerId: string; gameStatus: string; deadline?: number } = {
        playerId: existingPlayerId,
        gameStatus,
      };
      if (session.status === "active") {
        const deadline = gameDeadlines.get(gameId);
        if (deadline !== undefined) responseBody.deadline = deadline;
      }
      return { status: 200, body: responseBody, cookie };
    }
    // Player not found in this game — fall through to new player logic
  }

  if (!gameId || !playerName?.trim()) {
    return { status: 404, body: { error: "game_not_found" } };
  }

  const session = gameSessions.get(gameId);
  if (!session) {
    return { status: 404, body: { error: "game_not_found" } };
  }

  if (session.status === "ended") {
    return { status: 409, body: { error: "game_finished" } };
  }

  if (!gamePlayers.has(gameId)) {
    gamePlayers.set(gameId, new Map());
  }
  const players = gamePlayers.get(gameId)!;

  // Admin occupies one slot; game is full when admin + joiners >= maxPlayers
  if (players.size + 1 >= session.config.maxPlayers) {
    return { status: 403, body: { error: "game_full" } };
  }

  const playerId = randomUUID();
  players.set(playerId, { name: playerName.trim(), isConnected: true });

  const sessionPayload = JSON.stringify({ playerId, gameId });
  const cookie = `session=${encodeURIComponent(sessionPayload)}; HttpOnly; Path=/; SameSite=Lax`;

  const responseBody: { playerId: string; gameStatus: string; deadline?: number } = {
    playerId,
    gameStatus: session.status,
  };

  if (session.status === "active") {
    const deadline = gameDeadlines.get(gameId);
    if (deadline !== undefined) {
      responseBody.deadline = deadline;
    }
  }

  return { status: 200, body: responseBody, cookie };
}
