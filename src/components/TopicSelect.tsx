import { useState } from "react";
import { DECKS, type Deck, type Lang } from "../data/decks";
import { battleEnabled } from "../lib/supabase";
import DashboardSheet from "./DashboardSheet";
import LanguageToggle from "./LanguageToggle";

type Props = {
  onPick: (deck: Deck, lang: Lang) => void;
  onBattle: () => void;
};

const DECK_COLORS: Record<string, { cover: string; spine: string }> = {
  "directions":   { cover: "bg-teal-700",   spine: "bg-teal-900"   },
  "body-parts":   { cover: "bg-orange-700", spine: "bg-orange-900" },
  "action-verbs": { cover: "bg-violet-700", spine: "bg-violet-900" },
};

const BOOK_HEIGHTS = ["h-52", "h-60", "h-56"];

export default function TopicSelect({ onPick, onBattle }: Props) {
  const [showDash, setShowDash] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [flipping, setFlipping] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  function handleBookClick(deckId: string, isSelected: boolean) {
    setSelected(isSelected ? null : deckId);
    setFlipping(deckId);
    setTimeout(() => setFlipping(null), 450);
  }

  const best: Record<string, number> = JSON.parse(
    localStorage.getItem("kata.best") ?? "{}"
  );

  // Hover previews; click locks in (and shows Start).
  const displayId = hovered ?? selected;
  const displayDeck = displayId ? (DECKS.find((d) => d.id === displayId) ?? null) : null;
  const showStart = selected !== null && (hovered === null || hovered === selected);

  return (
    <div className="h-screen overflow-hidden bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-4xl px-6">

        {/* Nav */}
        <nav className="relative flex items-start justify-between pt-10 pb-10">
          <div>
            <h1 className="font-display text-5xl font-bold tracking-tight">KATA</h1>
            <p className="mt-1 text-xs text-neutral-400">Your body is the controller</p>
          </div>
          <div className="absolute left-1/2 mt-1 -translate-x-1/2">
            <div className="flex w-72 items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <span>Search decks…</span>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {battleEnabled && (
              <button
                onClick={onBattle}
                className="rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700"
              >
                Battle
              </button>
            )}
            <button
              onClick={() => setShowDash(true)}
              className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
            >
              Stats
            </button>
          </div>
        </nav>

        {/* Bookshelf */}
        <div className="flex items-end gap-4">
          {DECKS.map((deck, i) => {
            const colors = DECK_COLORS[deck.id] ?? { cover: "bg-neutral-700", spine: "bg-neutral-900" };
            const isSelected = selected === deck.id;
            const isHovered = hovered === deck.id;
            const h = BOOK_HEIGHTS[i % BOOK_HEIGHTS.length];

            return (
              <button
                key={deck.id}
                onClick={() => handleBookClick(deck.id, isSelected)}
                onMouseEnter={() => setHovered(deck.id)}
                onMouseLeave={() => setHovered(null)}
                className={[
                  "w-28", h, "shrink-0",
                  "transition-all duration-200 active:scale-[0.97]",
                  isSelected ? "-translate-y-4" : isHovered ? "-translate-y-1" : "",
                ].join(" ")}
                style={{
                  perspective: "600px",
                  filter: isSelected
                    ? "drop-shadow(0 8px 16px rgba(0,0,0,0.35))"
                    : "drop-shadow(0 3px 6px rgba(0,0,0,0.15))",
                }}
              >
                <div
                  className={[
                    "relative w-full h-full overflow-hidden rounded-t-sm",
                    flipping === deck.id ? "animate-book-flip" : "",
                  ].join(" ")}
                >
                  {/* Spine */}
                  <div className={`absolute inset-y-0 left-0 w-4 ${colors.spine}`} />
                  {/* Cover */}
                  <div className={`absolute inset-0 left-4 ${colors.cover} flex flex-col justify-between px-3 py-4`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-tight text-white/80">
                      {deck.title}
                    </p>
                    <p className="text-[9px] font-medium text-white/40">
                      {deck.cards.length} cards
                    </p>
                  </div>
                  {/* Selected ring */}
                  {isSelected && (
                    <div className="pointer-events-none absolute inset-0 rounded-t-sm ring-[3px] ring-amber-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Shelf plank */}
        <div className="h-3 bg-neutral-800" />
        <div className="h-1 bg-neutral-700 opacity-30" />

        {/* Info panel — previews on hover, locks on click */}
        <div className="mt-8 min-h-24 pb-12">
          {displayDeck ? (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="flex gap-5 p-6">
                {/* Mini cover */}
                <div className="relative h-32 w-20 shrink-0 overflow-hidden rounded-sm">
                  <div className={`absolute inset-y-0 left-0 w-3 ${DECK_COLORS[displayDeck.id]?.spine ?? "bg-neutral-900"}`} />
                  <div className={`absolute inset-0 left-3 ${DECK_COLORS[displayDeck.id]?.cover ?? "bg-neutral-700"} flex flex-col justify-between px-2 py-3`}>
                    <p className="text-[8px] font-bold uppercase tracking-widest leading-tight text-white/80">
                      {displayDeck.title}
                    </p>
                    <p className="text-[8px] text-white/40">{displayDeck.cards.length} cards</p>
                  </div>
                </div>
                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <h2 className="text-xl font-bold tracking-tight">{displayDeck.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-500">{displayDeck.description}</p>
                  <div className="mt-3 flex divide-x divide-neutral-200">
                    <div className="pr-4">
                      <div className="text-lg font-bold tabular-nums">{displayDeck.cards.length}</div>
                      <div className="text-[10px] text-neutral-400">cards</div>
                    </div>
                    {best[displayDeck.id] !== undefined && (
                      <div className="px-4">
                        <div className="text-lg font-bold tabular-nums">
                          {Math.round((best[displayDeck.id] / displayDeck.cards.length) * 100)}%
                        </div>
                        <div className="text-[10px] text-neutral-400">best score</div>
                      </div>
                    )}
                    <div className="px-4">
                      <div className="text-lg font-bold tabular-nums">{displayDeck.popularity.toLocaleString()}</div>
                      <div className="text-[10px] text-neutral-400">plays</div>
                    </div>
                    <div className="px-4">
                      <div className={[
                        "text-lg font-bold",
                        displayDeck.difficulty === "Easy"   ? "text-emerald-600" :
                        displayDeck.difficulty === "Medium" ? "text-amber-600"   :
                                                              "text-red-600",
                      ].join(" ")}>{displayDeck.difficulty}</div>
                      <div className="text-[10px] text-neutral-400">difficulty</div>
                    </div>
                  </div>
                </div>
              </div>
              {showStart && (
                <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-6 py-4">
                  <LanguageToggle value={lang} onChange={setLang} />
                  <button
                    onClick={() => onPick(displayDeck, lang)}
                    className="shrink-0 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
                  >
                    Start →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-300">Hover a deck to preview.</p>
          )}
        </div>
      </div>

      {showDash && <DashboardSheet onClose={() => setShowDash(false)} />}
    </div>
  );
}
