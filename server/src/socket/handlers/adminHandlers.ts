import { games } from "../../game/submitGuess";
import { VALID_WORDS } from "../../game/wordList";
import { startRoundTimer } from "../../game/timer";
import { buildRoundEndedPayload } from "../../game/roundEnd";
import { buildGameEndedPayload } from "../../game/endGame";
import { gamePlayers } from "../../routes/joinGame";
import { gameSessions } from "../../routes/createGame";
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
  handshake: { auth: { playerId?: string } };
  emit(event: string, data?: unknown): void;
  on(event: string, handler: (payload: Record<string, string>) => void): void;
};

function buildEndGamePayloadFromState(gameId: string) {
  const game = games.get(gameId);
  const playerNames = gamePlayers.get(gameId) ?? new Map<string, { name: string }>();
  const playerData = Array.from(game?.players.entries() ?? []).map(([pid, p]) => ({
    playerId: pid,
    name: playerNames.get(pid)?.name ?? "Unknown",
    totalScore: p.score,
    boardsSolved: p.boards.filter((b) => b.status === "solved").length,
  }));
  return buildGameEndedPayload(playerData);
}

function fireRoundEnded(io: IoLike, gameId: string): void {
  const adminGame = adminGames.get(gameId);
  if (!adminGame) return;

  const isFinalRound = adminGame.roundNumber >= adminGame.totalRounds;

  if (isFinalRound) {
    adminGame.status = "finished";
    io.to(gameId).emit("game_ended", buildEndGamePayloadFromState(gameId));
    games.delete(gameId);
    return;
  }

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
  const playerId = socket.handshake.auth.playerId as string | undefined;
  const isAdmin = (gameId: string) => adminGames.get(gameId)?.adminPlayerId === playerId;

  socket.on("start_game", ({ gameId }) => {
    if (!isAdmin(gameId)) {
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
    console.log(`[game:${gameId}] round 1 words:`, words);

    const deadline = Date.now() + adminGame.timeLimitSeconds * 1000;

    // Initialize game state with all current players, preserving any existing scores
    const gamePlayersMap = gamePlayers.get(gameId) ?? new Map<string, { name: string }>();
    const existingGame = games.get(gameId);
    const playerEntries = Array.from(gamePlayersMap.keys()).map((pid) => [
      pid,
      {
        score: existingGame?.players.get(pid)?.score ?? 0,
        boards: words.map((word) => ({
          targetWord: word,
          attemptCount: 0,
          status: "unsolved" as const,
          guessedWords: new Set<string>(),
        })),
      },
    ] as const);
    games.set(gameId, {
      status: "active",
      roundNumber: 1,
      deadline,
      players: new Map(playerEntries),
    });

    // Snapshot per-player scores at round start for round-score delta calculation
    const roundStartScores = new Map<string, number>();
    adminGame.roundStartScores = roundStartScores;

    io.to(gameId).emit("round_started", {
      boardCount: words.length,
      roundNumber: 1,
      startTime: Date.now(),
      deadline,
      timeLimitSeconds: adminGame.timeLimitSeconds,
    });

    startRoundTimer(io, gameId, deadline, () => fireRoundEnded(io, gameId));
  });

  socket.on("start_next_round", ({ gameId }) => {
    if (!isAdmin(gameId)) {
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
    console.log(`[game:${gameId}] round ${adminGame.roundNumber} words:`, words);

    const deadline = Date.now() + adminGame.timeLimitSeconds * 1000;
    const game = games.get(gameId);
    if (game) {
      game.status = "active";
      game.roundNumber = adminGame.roundNumber;
      game.deadline = deadline;
      // Reset boards for new round, preserve cumulative scores
      for (const [, player] of game.players) {
        player.boards = words.map((word) => ({
          targetWord: word,
          attemptCount: 0,
          status: "unsolved" as const,
          guessedWords: new Set<string>(),
        }));
      }
    }

    // Snapshot per-player scores at round start for round-score delta calculation
    const roundStartScores = new Map<string, number>();
    for (const [pid, p] of (game?.players ?? new Map())) {
      roundStartScores.set(pid, p.score);
    }
    adminGame.roundStartScores = roundStartScores;

    io.to(gameId).emit("round_started", {
      boardCount: words.length,
      roundNumber: adminGame.roundNumber,
      startTime: Date.now(),
      deadline,
      timeLimitSeconds: adminGame.timeLimitSeconds,
    });

    startRoundTimer(io, gameId, deadline, () => fireRoundEnded(io, gameId));
  });

  socket.on("end_game", ({ gameId }) => {
    if (!isAdmin(gameId)) {
      socket.emit("not_authorized", { error: "not_authorized" });
      return;
    }
    const adminGame = adminGames.get(gameId);
    if (!adminGame || adminGame.status === "finished") {
      socket.emit("invalid_state", { error: "invalid_state" });
      return;
    }

    adminGame.status = "finished";
    io.to(gameId).emit("game_ended", buildEndGamePayloadFromState(gameId));
    games.delete(gameId);
  });

  socket.on("restart_game", ({ gameId }) => {
    if (!isAdmin(gameId)) {
      socket.emit("not_authorized", { error: "not_authorized" });
      return;
    }
    const adminGame = adminGames.get(gameId);
    if (!adminGame) return;

    adminGame.status = "waiting";
    adminGame.roundNumber = 0;
    adminGame.currentWords = [];
    adminGame.usedWords = new Set();

    // Delete game data so next start_game initialises all scores at 0
    games.delete(gameId);

    const session = gameSessions.get(gameId);
    const players = gamePlayers.get(gameId) ?? new Map();
    io.to(gameId).emit("game_state_update", {
      players: Array.from(players.entries()).map(([pid, p]) => ({
        playerId: pid,
        name: p.name,
        isConnected: p.isConnected,
        role: p.role,
      })),
      status: "waiting",
      settings: session?.config ?? { maxPlayers: 10, rounds: 3, timeLimitSeconds: 120 },
    });
  });

  socket.on("shuffle_words", ({ gameId }) => {
    if (!isAdmin(gameId)) {
      socket.emit("not_authorized", { error: "not_authorized" });
      return;
    }
    const adminGame = adminGames.get(gameId);
    if (!adminGame) return;

    adminGame.currentWords = selectWords(VALID_WORDS, adminGame.usedWords, 4);
  });
}
