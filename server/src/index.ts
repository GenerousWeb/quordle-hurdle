import { createServer } from "http";
import { Server } from "socket.io";
import { games, handleSubmitGuess } from "./game/submitGuess";
import type { GuessResultError, GuessResultSuccess } from "./game/submitGuess";
import { registerAdminHandlers, adminGames } from "./socket/handlers/adminHandlers";
import { handlePlayerDisconnect, handlePlayerJoinSocket, gamePlayers, gameDeadlines } from "./routes/joinGame";
import { handleAdminDisconnect } from "./game/adminPromotion";
import type { PlayerForPromotion } from "./game/adminPromotion";
import { handleRequest } from "./routes/index";
import { gameSessions } from "./routes/createGame";

const httpServer = createServer((req, res) => {
  handleRequest(req, res).catch(() => {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "internal_server_error" }));
  });
});

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Tracks socket.id → { gameId, playerId } for disconnect handling
const socketContext = new Map<string, { gameId: string; playerId: string }>();

// Tracks join timestamps per game per player (recorded on join_game event)
const playerJoinTimes = new Map<string, Map<string, number>>();

// Grace-period timers for admin promotion — keyed by "gameId:playerId".
// When an admin socket disconnects (e.g. during page navigation), we wait
// briefly before promoting a new admin, in case they reconnect immediately.
const adminPromotionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const ADMIN_PROMOTION_DELAY_MS = 3000;

io.on("connection", (socket) => {
  const playerId = socket.handshake.auth.playerId as string | undefined;

  registerAdminHandlers(io, socket);

  socket.on("join_game", ({ gameId }: { gameId: string }) => {
    void socket.join(gameId);

    if (playerId) {
      // Cancel any pending admin-promotion timer for this player
      const promotionKey = `${gameId}:${playerId}`;
      const pendingTimer = adminPromotionTimers.get(promotionKey);
      if (pendingTimer !== undefined) {
        clearTimeout(pendingTimer);
        adminPromotionTimers.delete(promotionKey);
      }

      socketContext.set(socket.id, { gameId, playerId });

      if (!playerJoinTimes.has(gameId)) {
        playerJoinTimes.set(gameId, new Map());
      }
      const gameTimes = playerJoinTimes.get(gameId)!;
      if (!gameTimes.has(playerId)) {
        gameTimes.set(playerId, Date.now());
      }

      // Ensure the admin is registered in gamePlayers and adminGames on first socket join
      const session = gameSessions.get(gameId);
      if (session && session.adminPlayerId === playerId) {
        if (!gamePlayers.has(gameId)) gamePlayers.set(gameId, new Map());
        const players = gamePlayers.get(gameId)!;
        if (!players.has(playerId)) {
          players.set(playerId, { name: session.adminName, isConnected: true, role: "admin" });
        } else {
          players.get(playerId)!.isConnected = true;
        }

        if (!adminGames.has(gameId)) {
          adminGames.set(gameId, {
            status: "waiting",
            totalRounds: session.config.rounds,
            roundNumber: 0,
            timeLimitSeconds: session.config.timeLimitSeconds,
            currentWords: [],
            usedWords: new Set(),
            adminPlayerId: session.adminPlayerId,
          });
        }
      }

      handlePlayerJoinSocket(io, gameId, playerId);

      // If the game is already active, send the current round state to this socket
      const adminGame = adminGames.get(gameId);
      if (adminGame?.status === "active" && adminGame.currentWords.length > 0) {
        const deadline = gameDeadlines.get(gameId) ?? Date.now() + adminGame.timeLimitSeconds * 1000;
        socket.emit("round_started", {
          boardCount: adminGame.currentWords.length,
          roundNumber: adminGame.roundNumber,
          startTime: Date.now(),
          deadline,
          timeLimitSeconds: adminGame.timeLimitSeconds,
        });
      }
    }
  });

  socket.on("disconnect", () => {
    const ctx = socketContext.get(socket.id);
    if (ctx) {
      socketContext.delete(socket.id);
      handlePlayerDisconnect(io, ctx.gameId, ctx.playerId);

      const adminGame = adminGames.get(ctx.gameId);
      if (adminGame && adminGame.adminPlayerId === ctx.playerId) {
        // Only start one timer per game+player — multiple sockets for the same
        // player (e.g. GamePage creates two) can all disconnect at once.
        const promotionKey = `${ctx.gameId}:${ctx.playerId}`;
        if (!adminPromotionTimers.has(promotionKey)) {
          const timer = setTimeout(() => {
            adminPromotionTimers.delete(promotionKey);

            // Re-read current state: skip promotion if the admin reconnected.
            const currentPlayers = gamePlayers.get(ctx.gameId) ?? new Map<string, { name: string; isConnected: boolean }>();
            if (currentPlayers.get(ctx.playerId)?.isConnected) return;

            const joinTimes = playerJoinTimes.get(ctx.gameId) ?? new Map<string, number>();
            const players: PlayerForPromotion[] = Array.from(currentPlayers.entries()).map(
              ([pid, p]) => ({
                playerId: pid,
                name: p.name,
                isConnected: p.isConnected,
                joinedAt: joinTimes.get(pid) ?? 0,
              }),
            );

            handleAdminDisconnect(
              io,
              ctx.gameId,
              ctx.playerId,
              adminGame.adminPlayerId || null,
              players,
              (newAdminId) => {
                adminGame.adminPlayerId = newAdminId ?? "";
              },
            );
          }, ADMIN_PROMOTION_DELAY_MS);

          adminPromotionTimers.set(promotionKey, timer);
        }
      }
    }
  });

  socket.on(
    "submit_guess",
    (payload: { gameId: string; roundNumber: number; guess: string }) => {
      if (!playerId) return;

      const result = handleSubmitGuess(payload, playerId);
      if (result === null) {
        socket.emit("guess_result", { guess: payload.guess, error: "game_not_active" });
        return;
      }

      if ("error" in result) {
        socket.emit("guess_result", result as GuessResultError);
        return;
      }

      socket.emit("guess_result", result as GuessResultSuccess);

      // Build leaderboard from in-memory state and broadcast to game room
      const game = games.get(payload.gameId);
      if (game) {
        const playerNamesMap = gamePlayers.get(payload.gameId) ?? new Map<string, { name: string }>();
        const leaderboard = Array.from(game.players.entries())
          .map(([pid, p]) => ({
            playerId: pid,
            name: playerNamesMap.get(pid)?.name ?? "Unknown",
            score: p.score,
            boardsSolved: p.boards.filter((b) => b.status === "solved").length,
          }))
          .sort((a, b) => b.score - a.score);
        io.to(payload.gameId).emit("leaderboard_update", { leaderboard });
      }
    },
  );
});

const PORT = process.env["PORT"] ? parseInt(process.env["PORT"]) : 3001;

httpServer.listen(PORT, () => {
  console.log(`Game server listening on port ${PORT}`);
});

export { io, games };
