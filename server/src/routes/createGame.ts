import { randomUUID } from "crypto";
import type { GameConfig } from "shared/types/game";

type CreateGameBody = {
  adminName?: string;
  maxPlayers?: number;
  rounds?: number;
  timeLimitSeconds?: number;
};

type GameSession = {
  gameId: string;
  adminPlayerId: string;
  config: GameConfig;
  status: "waiting" | "active" | "ended";
};

export const gameSessions = new Map<string, GameSession>();

type SuccessBody = { gameId: string; inviteLink: string };
type ErrorBody = { error: string };

type CreateGameResult =
  | { status: 201; body: SuccessBody; cookie: string }
  | { status: 400; body: ErrorBody; cookie?: never };

export function handleCreateGame(body: CreateGameBody): CreateGameResult {
  const { adminName, maxPlayers = 10, rounds = 3, timeLimitSeconds = 120 } = body;

  if (!adminName?.trim()) {
    return { status: 400, body: { error: "invalid_config" } };
  }
  if (maxPlayers < 2 || maxPlayers > 20) {
    return { status: 400, body: { error: "invalid_config" } };
  }
  if (rounds < 1 || rounds > 5) {
    return { status: 400, body: { error: "invalid_config" } };
  }
  if (![60, 90, 120, 180].includes(timeLimitSeconds)) {
    return { status: 400, body: { error: "invalid_config" } };
  }

  const gameId = randomUUID();
  const adminPlayerId = randomUUID();
  const inviteLink = `https://game.app/play/${gameId}`;

  gameSessions.set(gameId, {
    gameId,
    adminPlayerId,
    config: { maxPlayers, rounds, timeLimitSeconds },
    status: "waiting",
  });

  const sessionPayload = JSON.stringify({ playerId: adminPlayerId, gameId, role: "admin" });
  const cookie = `session=${encodeURIComponent(sessionPayload)}; HttpOnly; Path=/; SameSite=Lax`;

  return { status: 201, body: { gameId, inviteLink }, cookie };
}
