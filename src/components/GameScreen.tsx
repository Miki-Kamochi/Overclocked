import { useEffect, useMemo, useRef, useState } from "react";
import type { Deck } from "../data/decks";
import { usePoseClassifier } from "../hooks/usePoseClassifier";
import { MotionMatcher } from "../game/matcher";
import { seededShuffle } from "../game/shuffle";
import WebcamView from "./WebcamView";

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const preferred = [
    "Microsoft Aria Online (Natural) - English (United States)",
    "Microsoft Jenny Online (Natural) - English (United States)",
    "Microsoft Guy Online (Natural) - English (United States)",
    "Google US English",
    "Samantha",
  ];
  for (const name of preferred) {
    const v = voices.find((v) => v.name === name);
    if (v) return v;
  }
  return voices.find((v) => v.lang === "en-US") ?? null;
}

/** Live opponent state shown during a battle. */
export type OpponentInfo = {
  name: string;
  cardIndex: number;
  score: number;
  total: number;
};

type Props = {
  deck: Deck;
  onFinish: (score: number, elapsed: number) => void;
  onQuit: () => void;
  /** When set, cards are shuffled deterministically so both battlers match. */
  seed?: number;
  /** Called on every card clear (battle mode broadcasts progress). */
  onProgress?: (cardIndex: number, score: number) => void;
  /** Opponent's live progress; absent in solo mode (renders nothing extra). */
  opponent?: OpponentInfo | null;
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function GameScreen({
  deck,
  onFinish,
  onQuit,
  seed,
  onProgress,
  opponent,
}: Props) {
  const cards = useMemo(() => {
    // In battle mode a shared seed guarantees both players see the same order;
    // solo play stays random.
    if (seed !== undefined) return seededShuffle(deck.cards, seed);
    const arr = [...deck.cards];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [cardIndex, setCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [justCleared, setJustCleared] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const gameOverRef = useRef(false);

  const { videoRef, canvasRef, ready, isMock, prediction, allPredictions, error, simulate } =
    usePoseClassifier(deck.modelPath, showSkeleton);

  const card = cards[cardIndex];
  const matcher = useMemo(() => new MotionMatcher(card.motion), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Point the matcher at each new card.
  useEffect(() => {
    matcher.setTarget(card.motion);
    setProgress(0);
  }, [card.motion, matcher]);

  // Read the word then the hint aloud; cancel both if the card changes.
  useEffect(() => {
    if (!ready) return;
    const word = new SpeechSynthesisUtterance(card.word);
    word.lang = "en-US";
    word.rate = 0.9;
    const hint = new SpeechSynthesisUtterance(card.hint);
    hint.lang = "en-US";
    hint.rate = 0.9;
    const voice = pickVoice();
    if (voice) { word.voice = voice; hint.voice = voice; }
    word.onend = () => window.speechSynthesis.speak(hint);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(word);
    return () => window.speechSynthesis.cancel();
  }, [card.word, card.hint, ready]);

  // Stopwatch — starts when camera is ready, stops when deck is complete.
  useEffect(() => {
    if (!ready || gameOverRef.current) return;
    const id = window.setTimeout(() => setElapsed((t) => t + 1), 1000);
    return () => window.clearTimeout(id);
  }, [ready, elapsed]);

  // Guard so the brief "cleared" animation can't double-advance.
  const advancingRef = useRef(false);

  // Feed every prediction frame into the matcher.
  useEffect(() => {
    if (!ready || advancingRef.current) return;

    const matched = matcher.push(allPredictions);
    setProgress(matcher.progress);

    if (matched) {
      advancingRef.current = true;
      setJustCleared(true);
      setScore((s) => s + 1);
      // Broadcast progress immediately so the opponent's bar tracks each clear.
      onProgress?.(cardIndex + 1, score + 1);

      window.setTimeout(() => {
        setJustCleared(false);
        advancingRef.current = false;
        if (cardIndex + 1 >= cards.length) {
          gameOverRef.current = true;
          onFinish(score + 1, elapsed);
        } else {
          setCardIndex((i) => i + 1);
        }
      }, 700);
    }
  }, [allPredictions, ready, matcher, cardIndex, cards.length, onFinish, score, onProgress]);

  const matchesTarget = prediction.topClass === card.motion;

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col gap-3 px-6 py-4">
      {/* Top bar */}
      <div className="flex items-center justify-between text-sm text-neutral-400">
        <button
          onClick={onQuit}
          className="-ml-1 px-1 hover:text-neutral-900"
        >
          Quit
        </button>
        <div className="text-2xl font-medium tabular-nums tracking-tight text-neutral-900">
          {formatTime(elapsed)}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSkeleton((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              showSkeleton
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${showSkeleton ? "bg-sky-400" : "bg-neutral-300"}`} />
            Bones
          </button>
          <span className="tabular-nums">
            {cardIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Opponent race bar (battle mode only) */}
      {opponent && (
        <div className="flex items-center gap-3 text-xs">
          <span className="w-24 shrink-0 truncate font-medium text-neutral-500">
            {opponent.name}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-rose-400 transition-[width] duration-300"
              style={{
                width: `${opponent.total > 0 ? (opponent.score / opponent.total) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="shrink-0 tabular-nums text-neutral-500">
            {opponent.score} / {opponent.total}
          </span>
        </div>
      )}

      {/* Word card */}
      <div
        className={`rounded-lg py-4 text-center transition-all duration-300 ${
          justCleared
            ? "scale-[1.02] bg-neutral-900 text-white"
            : "text-neutral-900"
        }`}
      >
        <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">
          Act it out
        </div>
        <div className="mt-2 text-5xl font-semibold tracking-tight">
          {card.word}
        </div>
        <div
          className={`mt-3 text-sm ${
            justCleared ? "text-neutral-300" : "text-neutral-500"
          }`}
        >
          {card.hint}
        </div>
      </div>

      {/* Camera + live predictions side by side */}
      <div className="flex w-full gap-4">
        <div className="min-w-0 flex-1">
          <WebcamView videoRef={videoRef} canvasRef={canvasRef} />
        </div>

        {ready && !isMock && allPredictions.length > 0 && (
          <div className="flex w-80 shrink-0 flex-col justify-center gap-4">
            {[...allPredictions]
              .sort((a, b) => b.probability - a.probability)
              .map((p) => (
                <div key={p.className} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-base">
                    <span
                      className={`font-mono ${
                        p.className === card.motion
                          ? "font-semibold text-neutral-900"
                          : "text-neutral-400"
                      }`}
                    >
                      {p.className}
                    </span>
                    <span className="tabular-nums text-neutral-500">
                      {Math.round(p.probability * 100)}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className={`h-full rounded-full transition-[width] duration-100 ${
                        p.className === card.motion ? "bg-neutral-900" : "bg-neutral-300"
                      }`}
                      style={{ width: `${p.probability * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Confidence / progress bar */}
      <div>
        <div className="mb-2 flex justify-between text-xs text-neutral-400">
          <span>
            Detecting{" "}
            <span className={matchesTarget ? "font-medium text-neutral-900" : ""}>
              {prediction.topClass}
            </span>{" "}
            ({Math.round(prediction.probability * 100)}%)
          </span>
          <span className="tabular-nums">{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-neutral-900 transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Status / mock controls */}
      {!ready && !error && (
        <p className="text-center text-sm text-neutral-400">Starting camera…</p>
      )}
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      {ready && isMock && (
        <div className="border-t border-neutral-200 pt-4 text-center">
          <p className="text-xs text-neutral-500">
            No trained model found — running in mock mode.
          </p>
          <button
            onClick={() => simulate(card.motion)}
            className="mt-3 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Simulate “{card.word}”
          </button>
        </div>
      )}
    </div>
  );
}
