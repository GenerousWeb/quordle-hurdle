import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand/react";
import type { BoardStatus, TileState } from "shared/types/game";
import { boardStore, allTerminal } from "../store/boardStore";
import { Tile } from "./Tile";

type BoardGridProps = {
  onEnter?: (guess: string) => void;
};

// How long the full flip animation lasts: 4×120ms stagger + 120ms final flip + buffer
const ANIMATION_GATE_MS = 650;

export function BoardGrid({ onEnter }: BoardGridProps = {}) {
  const { boards, currentInput, submitting, shaking } = useStore(boardStore);

  // Boards whose terminal status (solved/failed) is deferred until flip animation completes.
  // Key: boardIndex, Value: the "pre-animation" status to show visually during the flip.
  const [deferredBoards, setDeferredBoards] = useState<Set<number>>(new Set());

  const prevBoardsRef = useRef(boards);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect new guesses arriving while submitting=true and manage the animation gate.
  useEffect(() => {
    if (!submitting) {
      // External clear (round_expired, or our own timer already fired).
      // Clear any pending visual deferral so real store statuses render immediately.
      setDeferredBoards((prev) => (prev.size > 0 ? new Set() : prev));
      prevBoardsRef.current = boards;
      return;
    }

    // Find boards that just received a new guess.
    const newlyAnimating: number[] = [];
    boards.forEach((board, i) => {
      const prev = prevBoardsRef.current[i];
      if (prev && board.guesses.length > prev.guesses.length) {
        newlyAnimating.push(i);
      }
    });

    prevBoardsRef.current = boards;

    if (newlyAnimating.length === 0) return;

    // Defer the visual status for boards that become solved/failed mid-animation
    // so the completion highlight only appears after the flip completes.
    const toDefer = new Set(
      newlyAnimating.filter((i) => {
        const s = boards[i]?.status;
        return s === "solved" || s === "failed";
      }),
    );
    if (toDefer.size > 0) {
      setDeferredBoards(toDefer);
    }

    // Start (or restart) the gate timer. When it fires, release the input gate
    // and clear the visual deferral.
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => {
      setDeferredBoards(new Set());
      boardStore.getState().setSubmitting(false);
      boardStore.setState({ currentInput: "" });
      animTimerRef.current = null;
    }, ANIMATION_GATE_MS);
  }, [boards, submitting]);

  // Shake lifecycle: start a ~400ms timer when shaking becomes true.
  // After it fires: clear shaking and clear submitting (not_a_word path).
  // currentInput is intentionally preserved so the player can correct and resubmit.
  // Shake is visually suppressed when submitting=true (flip takes precedence) but
  // the timer still runs so submitting is cleared after the shake duration.
  useEffect(() => {
    if (!shaking) {
      if (shakeTimerRef.current) {
        clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = null;
      }
      return;
    }
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => {
      boardStore.getState().setShaking(false);
      boardStore.getState().setSubmitting(false);
      shakeTimerRef.current = null;
    }, 400);
  }, [shaking]);

  // Cancel timers on unmount.
  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key.match(/^[a-zA-Z]$/)) {
        boardStore.getState().appendLetter(e.key.toUpperCase());
      } else if (e.key === "Backspace") {
        boardStore.getState().deleteLetter();
      } else if (e.key === "Enter") {
        const state = boardStore.getState();
        if (
          state.currentInput.length === 5 &&
          !state.submitting &&
          !allTerminal(state)
        ) {
          onEnter?.(state.currentInput);
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onEnter]);

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {boards.map((board, boardIndex) => {
        // During animation, defer solved/failed status so the highlight only
        // appears after the flip completes.
        const visualStatus: BoardStatus = deferredBoards.has(boardIndex)
          ? "unsolved"
          : board.status;

        return (
          <div
            key={boardIndex}
            data-board-index={boardIndex}
            data-status={visualStatus}
            className="flex flex-col gap-1"
          >
            {Array.from({ length: 9 }, (_, rowIndex) => {
              const submittedGuess = board.guesses[rowIndex];
              const isCurrentRow =
                rowIndex === board.guesses.length && board.status === "unsolved";

              return (
                <div key={rowIndex} data-row-index={rowIndex} className="flex gap-1">
                  {Array.from({ length: 5 }, (_, tileIndex) => {
                    let letter: string | null = null;
                    let state: TileState = "empty";

                    if (submittedGuess) {
                      letter = submittedGuess.word[tileIndex];
                      state = submittedGuess.result[tileIndex] as TileState;
                    } else if (isCurrentRow) {
                      const char = currentInput[tileIndex];
                      if (char) {
                        letter = char;
                        state = "typing";
                      }
                    }

                    const isShaking =
                      shaking &&
                      !submitting &&
                      board.status === "unsolved" &&
                      isCurrentRow;

                    return (
                      <Tile
                        key={tileIndex}
                        letter={letter}
                        state={state}
                        tileIndex={tileIndex}
                        isShaking={isShaking}
                      />
                    );
                  })}
                </div>
              );
            })}

            {board.status === "failed" && board.targetWord && (
              <div
                data-reveal-row="true"
                className="text-center text-sm text-red-400 mt-1"
              >
                {board.targetWord.toUpperCase()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
