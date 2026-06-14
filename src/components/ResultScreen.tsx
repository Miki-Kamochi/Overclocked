import { useEffect } from "react";
import type { Deck } from "../data/decks";
import { playSound } from "../lib/sounds";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type Props = {
  deck: Deck;
  score: number;
  elapsed: number;
  best: number;
  photo?: string;
  onReplay: () => void;
  onHome: () => void;
};

export default function ResultScreen({
  deck,
  score,
  elapsed,
  best,
  photo,
  onReplay,
  onHome,
}: Props) {
  const total = deck.cards.length;
  const isBest = score >= best;

  useEffect(() => {
    // nothing yet — placeholder for a future celebratory effect
  }, []);

  return (
    <div className="mx-auto flex max-w-xl flex-col px-6 py-12">
      <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
        {deck.title}
      </div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">
        Deck complete
      </h1>

      {photo && (
        <div className="mt-6 inline-block rotate-2 rounded-sm bg-white p-3 shadow-lg">
          <img src={photo} alt="finish" className="h-44 w-44 rounded-sm object-cover" />
          <p className="mt-2 text-center text-[10px] text-neutral-400">your winning pose</p>
        </div>
      )}

      <div className="mt-8 flex items-end gap-12">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            Score
          </div>
          <div className="mt-1 text-6xl font-semibold tabular-nums tracking-tight">
            {score}
            <span className="text-2xl text-neutral-400">/{total}</span>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
            Time
          </div>
          <div className="mt-1 text-6xl font-semibold tabular-nums tracking-tight">
            {formatTime(elapsed)}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-neutral-500">
        {isBest ? "New best" : `Best ${best}/${total}`}
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={() => { playSound("uiClick"); onReplay(); }}
          className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Play again
        </button>
        <button
          onClick={() => { playSound("uiClick"); onHome(); }}
          className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-900 hover:border-neutral-900"
        >
          Home
        </button>
      </div>
    </div>
  );
}
