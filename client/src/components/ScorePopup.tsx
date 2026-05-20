import { useEffect, useState } from "react";

type Props = {
  totalScoreDelta: number;
};

export function ScorePopup({ totalScoreDelta }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      data-testid="score-popup"
      className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-2xl font-bold text-green-400 pointer-events-none select-none"
    >
      +{totalScoreDelta}
    </div>
  );
}
