import { useState } from "react";
import type { Deck, Lang } from "./data/decks";
import TopicSelect from "./components/TopicSelect";
import GameScreen from "./components/GameScreen";
import ResultScreen from "./components/ResultScreen";
import BattleScreen from "./components/BattleScreen";

type Screen =
  | { name: "select" }
  | { name: "game"; deck: Deck; lang: Lang }
  | { name: "result"; deck: Deck; lang: Lang; score: number; elapsed: number; photo?: string }
  | { name: "battle"; deckId: string };

const BEST_KEY     = "kata.best";
const STATS_KEY    = "kata.stats";
const ACTIVITY_KEY = "kata.activity";

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

function writeSession(score: number, elapsed: number) {
  try {
    const stats = JSON.parse(
      localStorage.getItem(STATS_KEY) ?? '{"totalGames":0,"totalCards":0,"totalTime":0}'
    );
    stats.totalGames += 1;
    stats.totalCards += score;
    stats.totalTime  += elapsed;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));

    const today = new Date().toISOString().slice(0, 10);
    const activity = JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? "{}");
    activity[today] = (activity[today] ?? 0) + score;
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
  } catch {
    // ignore storage failures
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "select" });

  return (
    <div className="min-h-full bg-white text-neutral-900">
      {screen.name === "select" && (
        <TopicSelect
          onPick={(deck, lang) => setScreen({ name: "game", deck, lang })}
          onBattle={(deck) => setScreen({ name: "battle", deckId: deck.id })}
        />
      )}

      {screen.name === "battle" && (
        <BattleScreen onHome={() => setScreen({ name: "select" })} initialDeckId={screen.deckId} />
      )}

      {screen.name === "game" && (
        <GameScreen
          // remount when replaying the same deck so internal state resets
          key={screen.deck.id}
          deck={screen.deck}
          lang={screen.lang}
          onFinish={(score, elapsed, photo) => {
            writeBest(screen.deck.id, score);
            writeSession(score, elapsed);
            setScreen({ name: "result", deck: screen.deck, lang: screen.lang, score, elapsed, photo });
          }}
          onQuit={() => setScreen({ name: "select" })}
        />
      )}

      {screen.name === "result" && (
        <ResultScreen
          deck={screen.deck}
          score={screen.score}
          elapsed={screen.elapsed}
          best={readBest(screen.deck.id)}
          photo={screen.photo}
          onReplay={() => setScreen({ name: "game", deck: screen.deck, lang: screen.lang })}
          onHome={() => setScreen({ name: "select" })}
        />
      )}
    </div>
  );
}
