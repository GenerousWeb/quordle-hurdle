import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { boardStore } from "../store/boardStore";
import type { BoardResultEntry } from "../store/boardStore";

const SHAKE_DURATION_MS = 600;

type GuessResultSuccess = {
  guess: string;
  totalScoreDelta: number;
  attemptNumber: number;
  boards: Array<{
    boardIndex: number;
    result: string[];
    scoreDelta: number;
    boardStatus: "unsolved" | "solved" | "failed";
  }>;
};

type GuessResultError = {
  guess: string;
  error: string;
};

type UseGameSocketOptions = {
  gameId: string;
  roundNumber: number;
  playerId: string;
  serverUrl: string;
};

export function useGameSocket({ gameId, roundNumber, playerId, serverUrl }: UseGameSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(serverUrl, {
      auth: { playerId },
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.emit("join_game", { gameId });

    socket.on("round_started", ({ words }: { words: string[] }) => {
      boardStore.getState().initBoards(words);
    });

    socket.on("guess_result", (data: GuessResultSuccess | GuessResultError) => {
      if ("error" in data) {
        handleError(data as GuessResultError);
        return;
      }
      handleSuccess(data as GuessResultSuccess);
    });

    socket.on("round_ended", () => {
      boardStore.getState().lockAllBoards();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [gameId, roundNumber, playerId, serverUrl]);

  function handleSuccess(data: GuessResultSuccess) {
    const entries: BoardResultEntry[] = data.boards.map((b) => ({
      boardIndex: b.boardIndex,
      word: data.guess,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: b.result as any,
      boardStatus: b.boardStatus,
    }));
    boardStore.getState().applyAllResults(entries);
  }

  function handleError(data: GuessResultError) {
    switch (data.error) {
      case "not_a_word":
        boardStore.getState().setSubmitting(false);
        boardStore.getState().setShaking(true);
        setTimeout(() => boardStore.getState().setShaking(false), SHAKE_DURATION_MS);
        break;
      case "round_expired":
        boardStore.getState().lockAllBoards();
        break;
      case "stale_round":
        // Full state refresh would be triggered here; for now just unblock input
        boardStore.getState().setSubmitting(false);
        break;
      case "all_boards_terminal":
        boardStore.getState().setSubmitting(false);
        break;
      default:
        boardStore.getState().setSubmitting(false);
    }
  }

  function handleEnter(guess: string) {
    if (!socketRef.current?.connected) return;
    boardStore.getState().setSubmitting(true);
    socketRef.current.emit("submit_guess", { gameId, roundNumber, guess });
  }

  return { handleEnter };
}
