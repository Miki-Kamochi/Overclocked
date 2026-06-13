import { useState } from "react";
import type { Deck } from "./data/decks";
import TopicSelect from "./components/TopicSelect";
import GameScreen from "./components/GameScreen";
import ResultScreen from "./components/ResultScreen";

type Screen =
  | { name: "select" }
  | { name: "game"; deck: Deck }
  | { name: "result"; deck: Deck; score: number };

const BEST_KEY = "kata.best";

function readBest(deckId: string): number {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}");
    return typeof all[deckId] === "number" ? all[deckId] : 0;
  } catch {
    return 0;
  }
}

function writeBest(deckId: string, score: number) {
  try {
    const all = JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}");
    all[deckId] = Math.max(score, all[deckId] ?? 0);
    localStorage.setItem(BEST_KEY, JSON.stringify(all));
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "select" });

  return (
    <div className="min-h-full bg-slate-950 text-white">
      {screen.name === "select" && (
        <TopicSelect onPick={(deck) => setScreen({ name: "game", deck })} />
      )}

      {screen.name === "game" && (
        <GameScreen
          // remount when replaying the same deck so internal state resets
          key={screen.deck.id}
          deck={screen.deck}
          onFinish={(score) => {
            writeBest(screen.deck.id, score);
            setScreen({ name: "result", deck: screen.deck, score });
          }}
          onQuit={() => setScreen({ name: "select" })}
        />
      )}

      {screen.name === "result" && (
        <ResultScreen
          deck={screen.deck}
          score={screen.score}
          best={readBest(screen.deck.id)}
          onReplay={() => setScreen({ name: "game", deck: screen.deck })}
          onHome={() => setScreen({ name: "select" })}
        />
      )}
    </div>
  );
}
