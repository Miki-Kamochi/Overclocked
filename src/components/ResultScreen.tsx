import { useEffect } from "react";
import type { Deck } from "../data/decks";

type Props = {
  deck: Deck;
  score: number;
  best: number;
  onReplay: () => void;
  onHome: () => void;
};

export default function ResultScreen({
  deck,
  score,
  best,
  onReplay,
  onHome,
}: Props) {
  const total = deck.cards.length;
  const isBest = score >= best;

  useEffect(() => {
    // nothing yet — placeholder for a future celebratory effect
  }, []);

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="text-6xl">🎉</div>
      <h1 className="text-3xl font-bold text-white">Deck complete!</h1>

      <div className="rounded-2xl bg-white/5 px-10 py-6">
        <div className="text-sm uppercase tracking-widest text-slate-400">
          {deck.title}
        </div>
        <div className="mt-1 text-5xl font-black text-emerald-400">
          {score}/{total}
        </div>
        <div className="mt-2 text-sm text-slate-400">
          {isBest ? "New best! 🏆" : `Best: ${best}/${total}`}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onReplay}
          className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400"
        >
          Play again
        </button>
        <button
          onClick={onHome}
          className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20"
        >
          Home
        </button>
      </div>
    </div>
  );
}
