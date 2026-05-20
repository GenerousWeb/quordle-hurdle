import { randomUUID } from "crypto";
import { gameSessions } from "./createGame";

type PlayerRecord = { name: string };

// Players who have joined via POST /game/join, keyed by gameId → playerId → record
export const gamePlayers = new Map<string, Map<string, PlayerRecord>>();

// Active round deadlines, keyed by gameId (set when a round starts)
export const gameDeadlines = new Map<string, number>();

type JoinBody = {
  gameId?: string;
  playerName?: string;
};

type JoinResult =
  | { status: 200; body: { playerId: string; gameStatus: string; deadline?: number }; cookie: string }
  | { status: 403; body: { error: "game_full" } }
  | { status: 404; body: { error: "game_not_found" } }
  | { status: 409; body: { error: "game_finished" } };

export function handleJoinGame(body: JoinBody): JoinResult {
  const { gameId, playerName } = body;

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
  players.set(playerId, { name: playerName.trim() });

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
