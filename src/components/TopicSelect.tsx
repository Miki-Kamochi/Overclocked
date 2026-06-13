import { DECKS, type Deck } from "../data/decks";

type Props = {
  onPick: (deck: Deck) => void;
};

export default function TopicSelect({ onPick }: Props) {
  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-6 p-6">
      <header className="pt-8 text-center">
        <h1 className="text-5xl font-black tracking-tight text-white">KATA</h1>
        <p className="mt-2 text-slate-400">
          Your body is the controller. Act out the word to flip the card.
        </p>
      </header>

      <h2 className="text-sm uppercase tracking-widest text-slate-500">
        Pick a topic
      </h2>

      <div className="grid gap-4">
        {DECKS.map((deck) => (
          <button
            key={deck.id}
            onClick={() => onPick(deck)}
            className="flex items-center gap-4 rounded-2xl bg-white/5 p-5 text-left transition hover:bg-white/10"
          >
            <span className="text-4xl">{deck.emoji}</span>
            <span>
              <span className="block text-xl font-bold text-white">
                {deck.title}
              </span>
              <span className="block text-sm text-slate-400">
                {deck.description}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {deck.cards.length} words
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
