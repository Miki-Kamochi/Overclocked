import { useEffect, useMemo, useRef, useState } from "react";
import type { Deck } from "../data/decks";
import { usePoseClassifier } from "../hooks/usePoseClassifier";
import { MotionMatcher } from "../game/matcher";
import WebcamView from "./WebcamView";

type Props = {
  deck: Deck;
  onFinish: (score: number) => void;
  onQuit: () => void;
};

export default function GameScreen({ deck, onFinish, onQuit }: Props) {
  const [cardIndex, setCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);
  const [justCleared, setJustCleared] = useState(false);

  const { videoRef, canvasRef, ready, isMock, prediction, error, simulate } =
    usePoseClassifier(deck.modelPath);

  const card = deck.cards[cardIndex];
  const matcher = useMemo(() => new MotionMatcher(card.motion), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Point the matcher at each new card.
  useEffect(() => {
    matcher.setTarget(card.motion);
    setProgress(0);
  }, [card.motion, matcher]);

  // Guard so the brief "cleared" animation can't double-advance.
  const advancingRef = useRef(false);

  // Feed every prediction frame into the matcher.
  useEffect(() => {
    if (!ready || advancingRef.current) return;

    const matched = matcher.push(prediction.topClass, prediction.probability);
    setProgress(matcher.progress);

    if (matched) {
      advancingRef.current = true;
      setJustCleared(true);
      setScore((s) => s + 1);

      window.setTimeout(() => {
        setJustCleared(false);
        advancingRef.current = false;
        if (cardIndex + 1 >= deck.cards.length) {
          onFinish(score + 1);
        } else {
          setCardIndex((i) => i + 1);
        }
      }, 700);
    }
  }, [prediction, ready, matcher, cardIndex, deck.cards.length, onFinish, score]);

  const matchesTarget = prediction.topClass === card.motion;

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-4 p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between text-slate-300">
        <button
          onClick={onQuit}
          className="rounded-lg px-3 py-1 text-sm hover:bg-white/10"
        >
          ← Quit
        </button>
        <div className="text-sm">
          {cardIndex + 1} / {deck.cards.length}
        </div>
        <div className="text-sm font-semibold text-emerald-400">
          Score {score}
        </div>
      </div>

      {/* Word card */}
      <div
        className={`rounded-2xl p-6 text-center transition-all duration-300 ${
          justCleared
            ? "scale-105 bg-emerald-500 text-white"
            : "bg-white/5 text-white"
        }`}
      >
        <div className="text-sm uppercase tracking-widest text-slate-400">
          Act it out
        </div>
        <div className="mt-1 text-5xl font-bold">{card.word}</div>
        <div className="mt-2 text-slate-300">{card.hint}</div>
      </div>

      <WebcamView videoRef={videoRef} canvasRef={canvasRef} />

      {/* Confidence / progress bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>
            Detecting:{" "}
            <span className={matchesTarget ? "text-emerald-400" : ""}>
              {prediction.topClass}
            </span>{" "}
            ({Math.round(prediction.probability * 100)}%)
          </span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400 transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Status / mock controls */}
      {!ready && !error && (
        <p className="text-center text-sm text-slate-400">Starting camera…</p>
      )}
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      {ready && isMock && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center">
          <p className="text-xs text-amber-300">
            No trained model found — running in mock mode.
          </p>
          <button
            onClick={() => simulate(card.motion)}
            className="mt-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400"
          >
            Simulate “{card.word}” motion
          </button>
        </div>
      )}
    </div>
  );
}
