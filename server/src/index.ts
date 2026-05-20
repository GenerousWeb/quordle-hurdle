import { createServer } from "http";
import { Server } from "socket.io";
import { games, handleSubmitGuess } from "./game/submitGuess";
import type { GuessResultError, GuessResultSuccess } from "./game/submitGuess";
import { registerAdminHandlers } from "./socket/handlers/adminHandlers";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  const playerId = socket.handshake.auth.playerId as string | undefined;

  registerAdminHandlers(io, socket);

  socket.on("join_game", ({ gameId }: { gameId: string }) => {
    void socket.join(gameId);
  });

  socket.on(
    "submit_guess",
    (payload: { gameId: string; roundNumber: number; guess: string }) => {
      if (!playerId) return;

      const result = handleSubmitGuess(payload, playerId);
      if (result === null) return;

      if ("error" in result) {
        socket.emit("guess_result", result as GuessResultError);
        return;
      }

      socket.emit("guess_result", result as GuessResultSuccess);

      // Build leaderboard from in-memory state and broadcast to game room
      const game = games.get(payload.gameId);
      if (game) {
        const leaderboard = Array.from(game.players.entries())
          .map(([pid, p]) => ({
            playerId: pid,
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
