import { useEffect, useRef, useState } from "react";
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
  const [guessError, setGuessError] = useState<string | null>(null);

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

  function showError(msg: string) {
    setGuessError(msg);
    setTimeout(() => setGuessError(null), 2000);
  }

  function handleError(data: GuessResultError) {
    switch (data.error) {
      case "not_a_word":
        boardStore.getState().setSubmitting(false);
        boardStore.getState().setShaking(true);
        showError("Not in word list");
        setTimeout(() => boardStore.getState().setShaking(false), SHAKE_DURATION_MS);
        break;
      case "invalid_format":
        boardStore.getState().setSubmitting(false);
        showError("Word must be 5 letters");
        break;
      case "round_expired":
        boardStore.getState().lockAllBoards();
        break;
      case "stale_round":
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
    if (!socketRef.current?.connected) {
      showError("Connecting…");
      return;
    }
    boardStore.getState().setSubmitting(true);
    socketRef.current.emit("submit_guess", { gameId, roundNumber, guess });
  }

  return { handleEnter, guessError };
}
