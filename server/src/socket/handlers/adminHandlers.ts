import { games } from "../../game/submitGuess";
import { VALID_WORDS } from "../../game/wordList";

export type AdminGameState = {
  status: "waiting" | "active" | "between_rounds" | "finished";
  totalRounds: number;
  roundNumber: number;
  timeLimitSeconds: number;
  currentWords: string[];
  usedWords: Set<string>;
  adminPlayerId: string;
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

function selectRandomWords(count: number, exclude: Set<string>): string[] {
  const pool = Array.from(VALID_WORDS).filter((w) => !exclude.has(w));
  const result: string[] = [];
  const used = new Set<string>();
  while (result.length < count && pool.length > used.size) {
    const idx = Math.floor(Math.random() * pool.length);
    const word = pool[idx];
    if (word && !used.has(word)) {
      result.push(word);
      used.add(word);
    }
  }
  return result;
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

    const words = selectRandomWords(4, adminGame.usedWords);
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

    io.to(gameId).emit("round_started", {
      words,
      roundNumber: 1,
      startTime: Date.now(),
      deadline,
      timeLimitSeconds: adminGame.timeLimitSeconds,
    });
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

    const words = selectRandomWords(4, adminGame.usedWords);
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

    io.to(gameId).emit("round_started", {
      words,
      roundNumber: adminGame.roundNumber,
      startTime: Date.now(),
      deadline,
      timeLimitSeconds: adminGame.timeLimitSeconds,
    });
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

    adminGame.currentWords = selectRandomWords(4, adminGame.usedWords);
  });
}
