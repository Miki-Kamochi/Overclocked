import { useState } from "react";
import { DECKS, type Deck } from "../data/decks";
import { battleEnabled } from "../lib/supabase";
import DashboardSheet from "./DashboardSheet";

type Props = {
  onPick: (deck: Deck) => void;
  onBattle: () => void;
};

const BOOK_HEIGHTS = ["h-36", "h-44", "h-40"];
const BOOK_WIDTHS  = ["w-14", "w-12", "w-16"];

export default function TopicSelect({ onPick, onBattle }: Props) {
  const [showDash, setShowDash] = useState(false);

  const best: Record<string, number> = JSON.parse(
    localStorage.getItem("kata.best") ?? "{}"
  );

  const totalCleared = Object.entries(best).reduce((sum, [id, score]) => {
    const deck = DECKS.find((d) => d.id === id);
    return sum + Math.min(score, deck?.cards.length ?? score);
  }, 0);

  const anyPlayed = Object.keys(best).length > 0;

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col px-6">
      <header className="pt-10 pb-8">
        <div className="flex items-start justify-between">
          <h1 className="text-6xl font-semibold tracking-tight">KATA</h1>
          <div className="mt-2 flex gap-2">
            {battleEnabled && (
              <button
                onClick={onBattle}
                className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700"
              >
                Battle
              </button>
            )}
            <button
              onClick={() => setShowDash(true)}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
            >
              Stats
            </button>
          </div>
        </div>
        <p className="mt-3 text-neutral-500">
          Your body is the controller. Act out the word to flip the card.
        </p>
      </header>

      {anyPlayed && (
        <p className="mb-8 text-sm text-neutral-400">
          <span className="font-semibold text-neutral-900">{totalCleared}</span> cards cleared
        </p>
      )}

      {/* Books */}
      <div className="flex items-end gap-1.5">
        {DECKS.map((deck, i) => (
          <button
            key={deck.id}
            onClick={() => onPick(deck)}
            className={`${BOOK_HEIGHTS[i % BOOK_HEIGHTS.length]} ${BOOK_WIDTHS[i % BOOK_WIDTHS.length]} flex shrink-0 items-center justify-center rounded-t border-2 border-neutral-900 bg-white transition-transform duration-150 hover:-translate-y-2 active:scale-95`}
          >
            <span
              className="text-xs font-medium text-neutral-900"
              style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
            >
              {deck.title}
            </span>
          </button>
        ))}
      </div>

      {/* Shelf */}
      <div className="h-1 rounded-full bg-neutral-900" />

      {/* Per-deck best scores */}
      <div className="mt-2 flex gap-1.5">
        {DECKS.map((deck, i) => {
          const b = best[deck.id];
          return (
            <div
              key={deck.id}
              className={`${BOOK_WIDTHS[i % BOOK_WIDTHS.length]} shrink-0 text-center text-xs tabular-nums ${
                b !== undefined ? "text-neutral-900" : "text-neutral-300"
              }`}
            >
              {b !== undefined ? `${b} / ${deck.cards.length}` : "—"}
            </div>
          );
        })}
      </div>

      {showDash && <DashboardSheet onClose={() => setShowDash(false)} />}
    </div>
  );
}
