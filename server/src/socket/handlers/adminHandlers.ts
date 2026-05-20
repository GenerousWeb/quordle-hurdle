import { games } from "../../game/submitGuess";
import { VALID_WORDS } from "../../game/wordList";
import { startRoundTimer } from "../../game/timer";
import { buildRoundEndedPayload } from "../../game/roundEnd";
import { gamePlayers } from "../../routes/joinGame";
import { selectWords } from "../../game/selectWords";

export type AdminGameState = {
  status: "waiting" | "active" | "between_rounds" | "finished";
  totalRounds: number;
  roundNumber: number;
  timeLimitSeconds: number;
  currentWords: string[];
  usedWords: Set<string>;
  adminPlayerId: string;
  roundStartScores?: Map<string, number>;
};

export const adminGames = new Map<string, AdminGameState>();

type IoLike = {
  to(room: string): { emit(event: string, data?: unknown): void };
};

type SocketLike = {
  handshake: { auth: { playerId?: string; role?: string } };
  emit(event: string, data?: unknown): void;
  on(event: string, handler: (payload: Record<string, string>) => void): void;
};

function fireRoundEnded(io: IoLike, gameId: string): void {
  const adminGame = adminGames.get(gameId);
  if (!adminGame) return;

  const game = games.get(gameId);
  const playerNames = gamePlayers.get(gameId) ?? new Map<string, { name: string }>();
  const playerData = Array.from(game?.players.entries() ?? []).map(([pid, p]) => ({
    playerId: pid,
    name: playerNames.get(pid)?.name ?? "Unknown",
    totalScore: p.score,
    roundStartScore: adminGame.roundStartScores?.get(pid) ?? 0,
  }));

  const payload = buildRoundEndedPayload(
    adminGame.roundNumber,
    adminGame.currentWords,
    playerData,
  );

  adminGame.status = "between_rounds";
  io.to(gameId).emit("round_ended", payload);
}


export function registerAdminHandlers(io: IoLike, socket: SocketLike): void {
  const { role } = socket.handshake.auth;
  const isAdmin = () => role === "admin";

  socket.on("start_game", ({ gameId }) => {
    if (!isAdmin()) {
      socket.emit("not_authorized", { error: "not_authorized" });
      return;
    }
    const adminGame = adminGames.get(gameId);
    if (!adminGame || adminGame.status !== "waiting") {
      socket.emit("invalid_state", { error: "invalid_state" });
      return;
    }

    const words = selectWords(VALID_WORDS, adminGame.usedWords, 4);
    adminGame.currentWords = words;
    words.forEach((w) => adminGame.usedWords.add(w));
    adminGame.status = "active";
    adminGame.roundNumber = 1;

    const deadline = Date.now() + adminGame.timeLimitSeconds * 1000;
    const game = games.get(gameId);
    if (game) {
      game.status = "active";
      game.roundNumber = 1;
      game.deadline = deadline;
    }

    // Snapshot per-player scores at round start for round-score delta calculation
    const roundStartScores = new Map<string, number>();
    for (const [pid, p] of (game?.players ?? new Map())) {
      roundStartScores.set(pid, p.score);
    }
    adminGame.roundStartScores = roundStartScores;

    io.to(gameId).emit("round_started", {
      words,
      roundNumber: 1,
      startTime: Date.now(),
      deadline,
      timeLimitSeconds: adminGame.timeLimitSeconds,
    });

    startRoundTimer(io, gameId, deadline, () => fireRoundEnded(io, gameId));
  });

  socket.on("start_next_round", ({ gameId }) => {
    if (!isAdmin()) {
      socket.emit("not_authorized", { error: "not_authorized" });
      return;
    }
    const adminGame = adminGames.get(gameId);
    if (!adminGame || adminGame.status !== "between_rounds") {
      socket.emit("invalid_state", { error: "invalid_state" });
      return;
    }

    const words = selectWords(VALID_WORDS, adminGame.usedWords, 4);
    adminGame.currentWords = words;
    words.forEach((w) => adminGame.usedWords.add(w));
    adminGame.status = "active";
    adminGame.roundNumber += 1;

    const deadline = Date.now() + adminGame.timeLimitSeconds * 1000;
    const game = games.get(gameId);
    if (game) {
      game.status = "active";
      game.roundNumber = adminGame.roundNumber;
      game.deadline = deadline;
    }

    // Snapshot per-player scores at round start
    const roundStartScores = new Map<string, number>();
    for (const [pid, p] of (game?.players ?? new Map())) {
      roundStartScores.set(pid, p.score);
    }
    adminGame.roundStartScores = roundStartScores;

    io.to(gameId).emit("round_started", {
      words,
      roundNumber: adminGame.roundNumber,
      startTime: Date.now(),
      deadline,
      timeLimitSeconds: adminGame.timeLimitSeconds,
    });

    startRoundTimer(io, gameId, deadline, () => fireRoundEnded(io, gameId));
  });

  socket.on("end_game", ({ gameId }) => {
    if (!isAdmin()) {
      socket.emit("not_authorized", { error: "not_authorized" });
      return;
    }
    const adminGame = adminGames.get(gameId);
    if (!adminGame || adminGame.status === "finished") {
      socket.emit("invalid_state", { error: "invalid_state" });
      return;
    }

    adminGame.status = "finished";
    const game = games.get(gameId);
    if (game) {
      game.status = "ended";
    }

    io.to(gameId).emit("game_ended", {});
  });

  socket.on("restart_game", ({ gameId }) => {
    if (!isAdmin()) {
      socket.emit("not_authorized", { error: "not_authorized" });
      return;
    }
    const adminGame = adminGames.get(gameId);
    if (!adminGame) return;

    adminGame.status = "waiting";
    adminGame.roundNumber = 0;
    adminGame.currentWords = [];
    adminGame.usedWords = new Set();

    const game = games.get(gameId);
    if (game) {
      game.status = "waiting";
      game.roundNumber = 0;
      for (const player of game.players.values()) {
        player.score = 0;
      }
    }

    io.to(gameId).emit("game_state_update", { status: "waiting" });
  });

  socket.on("shuffle_words", ({ gameId }) => {
    if (!isAdmin()) {
      socket.emit("not_authorized", { error: "not_authorized" });
      return;
    }
    const adminGame = adminGames.get(gameId);
    if (!adminGame) return;

    adminGame.currentWords = selectWords(VALID_WORDS, adminGame.usedWords, 4);
  });
}
