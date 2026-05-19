import { useState, useEffect, useRef } from "react";
import type { TileState } from "shared/types/game";
import { boardStore } from "../store/boardStore";

type TileProps = {
  letter: string | null;
  state: TileState;
  tileIndex?: number; // sets data-tile-index; drives animation stagger in Step 2+
  isShaking?: boolean; // drives data-shaking for Step 3 shake animation
};

const FLIP_HALF_MS = 60;
const FLIP_STAGGER_MS = 120;

function isColour(s: TileState): boolean {
  return s === "green" || s === "yellow" || s === "grey";
}

export function Tile({ letter, state, tileIndex, isShaking }: TileProps) {
  const [flipping, setFlipping] = useState(false);
  const [flipMid, setFlipMid] = useState(false);
  const [displayState, setDisplayState] = useState<TileState>(state);
  const prevStateRef = useRef<TileState>(state);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    if (!isColour(prev) && isColour(state)) {
      // "typing" → colour always animates (the active input row resolving).
      // "empty" → colour only animates when the submission gate is open — this
      // avoids spurious flips when store state is seeded directly (e.g. via
      // applyBoardResult) without going through the normal submit flow.
      const shouldAnimate = prev === "typing" || boardStore.getState().submitting;
      if (!shouldAnimate) {
        setDisplayState(state);
        return;
      }
      const stagger = (tileIndex ?? 0) * FLIP_STAGGER_MS;
      setFlipping(true);
      setFlipMid(false);

      const midTimer = setTimeout(() => {
        setFlipMid(true);
        setDisplayState(state);
      }, stagger + FLIP_HALF_MS);

      const endTimer = setTimeout(() => {
        setFlipping(false);
        setFlipMid(false);
      }, stagger + FLIP_HALF_MS * 2);

      return () => {
        clearTimeout(midTimer);
        clearTimeout(endTimer);
      };
    } else {
      setDisplayState(state);
    }
  }, [state, tileIndex]);

  const stagger = (tileIndex ?? 0) * FLIP_STAGGER_MS;

  return (
    <div
      data-tile-index={tileIndex}
      data-state={displayState}
      data-flipping={flipping ? "true" : undefined}
      data-flip-mid={flipMid ? "true" : undefined}
      data-shaking={isShaking ? "true" : undefined}
      style={flipping ? { animationDelay: `${stagger}ms` } : undefined}
    >
      {letter != null ? letter.toUpperCase() : ""}
    </div>
  );
}
