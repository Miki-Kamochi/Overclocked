import { useState } from "react";
import type { Deck } from "./data/decks";
import TopicSelect from "./components/TopicSelect";
import GameScreen from "./components/GameScreen";
import ResultScreen from "./components/ResultScreen";
import BattleScreen from "./components/BattleScreen";

type Screen =
  | { name: "select" }
  | { name: "game"; deck: Deck }
  | { name: "result"; deck: Deck; score: number; elapsed: number }
  | { name: "battle" };

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
          onPick={(deck) => setScreen({ name: "game", deck })}
          onBattle={() => setScreen({ name: "battle" })}
        />
      )}

      {screen.name === "battle" && (
        <BattleScreen onHome={() => setScreen({ name: "select" })} />
      )}

      {screen.name === "game" && (
        <GameScreen
          // remount when replaying the same deck so internal state resets
          key={screen.deck.id}
          deck={screen.deck}
          onFinish={(score, elapsed) => {
            writeBest(screen.deck.id, score);
            writeSession(score, elapsed);
            setScreen({ name: "result", deck: screen.deck, score, elapsed });
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
          onReplay={() => setScreen({ name: "game", deck: screen.deck })}
          onHome={() => setScreen({ name: "select" })}
        />
      )}
    </div>
  );
}
