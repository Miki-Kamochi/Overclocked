import { useEffect, useMemo, useRef, useState } from "react";
import type { Deck, Lang } from "../data/decks";
import { cardText, IDLE_CLASS } from "../data/decks";
import { usePoseClassifier } from "../hooks/usePoseClassifier";
import { MotionMatcher } from "../game/matcher";
import { seededShuffle } from "../game/shuffle";
import WebcamView from "./WebcamView";
import { playSound } from "../lib/sounds";

// BCP-47 codes for the speech synthesizer, keyed by app language.
const SPEECH_LANG: Record<Lang, string> = {
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
};

function pickVoice(langCode: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (langCode === "en-US") {
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
  }
  // Match by language prefix (e.g. "zh", "ja"); null → browser default voice.
  const prefix = langCode.slice(0, 2);
  return voices.find((v) => v.lang.startsWith(prefix)) ?? null;
}

/** Live opponent state shown during a battle. */
export type OpponentInfo = {
  name: string;
  avatar?: string;
  cardIndex: number;
  score: number;
  total: number;
};

/** The local player's profile, shown alongside the opponent during a battle. */
export type MeInfo = {
  name?: string;
  avatar?: string | null;
};

type Props = {
  deck: Deck;
  onFinish: (score: number, elapsed: number, photo?: string) => void;
  onQuit: () => void;
  /** When set, cards are shuffled deterministically so both battlers match. */
  seed?: number;
  /** Called on every card clear (battle mode broadcasts progress). */
  onProgress?: (cardIndex: number, score: number) => void;
  /** Opponent's live progress; absent in solo mode (renders nothing extra). */
  opponent?: OpponentInfo | null;
  /** The local player's profile, shown next to the opponent in battle mode. */
  me?: MeInfo;
  /** Display + speech language for the card word and hint. Defaults to English. */
  lang?: Lang;
};

/** Round avatar with a neutral fallback when no photo was captured. */
function Avatar({ src, name }: { src?: string | null; name?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "player"}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-neutral-200"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-500">
      {name?.trim()?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

/** One racer row: avatar + name + progress bar + score. */
function RacerRow({
  name,
  avatar,
  score,
  total,
  leading,
}: {
  name: string;
  avatar?: string | null;
  score: number;
  total: number;
  leading: boolean;
}) {
  const pct = total > 0 ? (score / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <Avatar src={avatar} name={name} />
      <span className="w-20 shrink-0 truncate font-medium text-neutral-700">
        {name}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${
            leading ? "bg-emerald-500" : "bg-neutral-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 tabular-nums text-neutral-500">
        {score} / {total}
      </span>
    </div>
  );
}

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
  me,
  lang = "en",
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
  const [justCleared, setJustCleared] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const gameOverRef = useRef(false);

  // 3-2-1-Go countdown before the game starts.
  const [countdown, setCountdown] = useState<number | "go" | null>(3);
  useEffect(() => {
    if (countdown === null) return;
    // The audio file is the full "3, 2, 1, go!" clip — play it once at the start.
    if (countdown === 3) playSound("countdownTick");
    const delay = countdown === "go" ? 800 : 1000;
    const id = window.setTimeout(() => {
      if (countdown === "go") {
        setCountdown(null);
      } else {
        setCountdown((c) => (typeof c === "number" && c > 1 ? c - 1 : "go"));
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [countdown]);

  const { videoRef, canvasRef, ready, isMock, allPredictions, error, simulate } =
    usePoseClassifier(deck.modelPath, showSkeleton);

  const card = cards[cardIndex];
  const { word, hint } = cardText(card, lang);
  const matcher = useMemo(() => new MotionMatcher(card.motion), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Point the matcher at each new card.
  useEffect(() => {
    matcher.setTarget(card.motion);
  }, [card.motion, matcher]);

  // Read the word then the hint aloud; cancel both if the card or language changes.
  useEffect(() => {
    if (!ready || countdown !== null) return;
    const langCode = SPEECH_LANG[lang];
    const wordUtt = new SpeechSynthesisUtterance(word);
    wordUtt.lang = langCode;
    wordUtt.rate = 0.9;
    const hintUtt = new SpeechSynthesisUtterance(hint);
    hintUtt.lang = langCode;
    hintUtt.rate = 0.9;
    const voice = pickVoice(langCode);
    if (voice) { wordUtt.voice = voice; hintUtt.voice = voice; }
    wordUtt.onend = () => window.speechSynthesis.speak(hintUtt);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(wordUtt);
    return () => window.speechSynthesis.cancel();
  }, [word, hint, lang, ready, countdown]);

  // Stopwatch — increments every second while the loop is running.
  useEffect(() => {
    if (!ready || countdown !== null || gameOverRef.current) return;
    const id = window.setTimeout(() => setElapsed((t) => t + 1), 1000);
    return () => window.clearTimeout(id);
  }, [ready, countdown, elapsed]);

  // Guard so the brief "cleared" animation can't double-advance.
  const advancingRef = useRef(false);

  // Feed every prediction frame into the matcher.
  useEffect(() => {
    if (!ready || countdown !== null || advancingRef.current) return;

    const matched = matcher.push(allPredictions);

    if (matched) {
      advancingRef.current = true;
      setJustCleared(true);
      setScore((s) => s + 1);
      onProgress?.(cardIndex + 1, score + 1);

      const isLastCard = cardIndex + 1 >= cards.length;
      playSound(isLastCard ? "gameFinish" : "cardCorrect");

      const photo = isLastCard
        ? (canvasRef.current?.toDataURL("image/jpeg", 0.7) ?? undefined)
        : undefined;

      window.setTimeout(() => {
        setJustCleared(false);
        advancingRef.current = false;
        if (isLastCard) {
          gameOverRef.current = true;
          onFinish(score + 1, elapsed, photo);
        } else {
          setCardIndex((i) => i + 1);
        }
      }, 700);
    }
  }, [allPredictions, ready, countdown, matcher, cardIndex, cards.length, onFinish, score, onProgress]);

  // Live feedback for the flashcard: "correct" the moment a card clears, "wrong"
  // while the player is confidently holding some *other* motion (not idle).
  const top = allPredictions.length
    ? allPredictions.reduce((a, b) => (b.probability > a.probability ? b : a))
    : null;
  const isWrong =
    !justCleared &&
    !!top &&
    top.className !== IDLE_CLASS &&
    top.className !== card.motion &&
    top.probability >= 0.65;
  const state: "correct" | "wrong" | "idle" = justCleared
    ? "correct"
    : isWrong
    ? "wrong"
    : "idle";

  // Play wrong sound once each time the state enters "wrong" (not on every frame).
  const prevStateRef = useRef<typeof state>("idle");
  useEffect(() => {
    if (state === "wrong" && prevStateRef.current !== "wrong") {
      playSound("cardWrong");
    }
    prevStateRef.current = state;
  }, [state]);

  return (
    <div className="relative mx-auto flex h-screen max-w-5xl flex-col gap-3 overflow-hidden px-6 py-4">

      {/* 3-2-1-Go countdown overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-950/80">
          <span
            key={String(countdown)}
            className="animate-count-in select-none font-bold leading-none text-white"
            style={{ fontSize: "clamp(6rem, 20vw, 14rem)" }}
          >
            {countdown === "go" ? "Go!" : countdown}
          </span>
        </div>
      )}
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between text-sm text-neutral-400">
        <div>
          <p className="font-display text-lg font-bold leading-none tracking-tight">{deck.title}</p>
          <button
            onClick={() => { playSound("uiClick"); onQuit(); }}
            className="mt-0.5 text-xs text-neutral-400 hover:text-neutral-900"
          >
            ← Quit
          </button>
        </div>
        <div className="flex items-center gap-2 tabular-nums tracking-tight text-neutral-900">
          <span className="font-display text-4xl font-medium">{formatTime(elapsed)}</span>
          <span className="text-neutral-300">·</span>
          <span className="text-2xl font-medium">{cardIndex + 1} / {cards.length}</span>
        </div>
        <button
          onClick={() => { playSound("uiClick"); setShowSkeleton((v) => !v); }}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            showSkeleton
              ? "bg-neutral-900 text-white"
              : "border border-neutral-300 text-neutral-400 hover:border-neutral-400"
          }`}
        >
          <span className={`inline-block h-2 w-2 rounded-full ${showSkeleton ? "bg-sky-400" : "bg-neutral-300"}`} />
          Bones
        </button>
      </div>

      {/* Head-to-head progress (battle mode only) */}
      {opponent && (
        <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-neutral-200 p-3">
          <RacerRow
            name={me?.name ?? "You"}
            avatar={me?.avatar}
            score={score}
            total={cards.length}
            leading={score >= opponent.score}
          />
          <RacerRow
            name={opponent.name}
            avatar={opponent.avatar}
            score={opponent.score}
            total={opponent.total}
            leading={opponent.score > score}
          />
        </div>
      )}

      {/* Main: flashcard + bars (left column), camera hero (right column) */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">

      {/* LEFT column */}
      <div className="flex min-h-0 w-full flex-col gap-4 lg:w-80 lg:shrink-0 xl:w-96">

      {/* Word flashcard — sticky note */}
      <div className="shrink-0" style={{ perspective: "1200px" }}>
        <div
          key={cardIndex}
          className="animate-flip-in"
          style={{
            transform: state === "wrong" ? undefined : "rotate(-1.5deg)",
          }}
        >
          <div
            className={`flex min-h-[16rem] flex-col justify-between rounded-sm px-7 py-6 shadow-[4px_6px_24px_rgba(0,0,0,0.18)] transition-all duration-300 lg:min-h-[20rem] ${
              state === "correct"
                ? "animate-pop bg-emerald-300"
                : state === "wrong"
                ? "animate-shake bg-red-200"
                : "bg-amber-100"
            }`}
          >
            {/* Top label */}
            <div className={`text-[11px] font-bold uppercase tracking-[0.25em] ${
              state === "correct" ? "text-emerald-800" :
              state === "wrong"   ? "text-red-600" :
              "text-amber-600"
            }`}>
              {state === "correct" ? "✓ Correct!" : state === "wrong" ? "✗ Not quite" : "Act it out"}
            </div>

            {/* Word — centre of card */}
            <div className="text-center">
              <div className={`text-5xl font-bold tracking-tight xl:text-6xl ${
                state === "correct" ? "text-emerald-900" :
                state === "wrong"   ? "text-red-800" :
                "text-neutral-900"
              }`}>
                {word}
              </div>
              <div className={`mt-3 text-sm leading-snug ${
                state === "correct" ? "text-emerald-800" :
                state === "wrong"   ? "text-red-700" :
                "text-neutral-600"
              }`}>
                {hint}
              </div>
            </div>

            {/* Bottom stamp */}
            <div className={`text-right text-[10px] tabular-nums ${
              state === "correct" ? "text-emerald-700" :
              state === "wrong"   ? "text-red-500" :
              "text-amber-500"
            }`}>
              {cardIndex + 1} / {cards.length}
            </div>
          </div>
        </div>
      </div>

      {/* Live predictions — fill the rest of the left column */}
      {ready && !isMock && allPredictions.length > 0 && (
          <div className="flex flex-row flex-wrap gap-4 lg:min-h-0 lg:flex-1 lg:flex-col lg:justify-center">
            {[...allPredictions]
              .sort((a, b) => b.probability - a.probability)
              .map((p) => (
                <div key={p.className} className="flex min-w-[160px] flex-1 flex-col gap-1.5 lg:min-w-0 lg:flex-none">
                  <div className="flex justify-between text-sm">
                    <span className={`font-mono ${p.className === card.motion ? "font-semibold text-neutral-900" : "text-neutral-400"}`}>
                      {p.className}
                    </span>
                    <span className="tabular-nums text-neutral-400">
                      {Math.round(p.probability * 100)}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className={`h-full rounded-full transition-[width] duration-100 ${p.className === card.motion ? "bg-neutral-900" : "bg-neutral-300"}`}
                      style={{ width: `${p.probability * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
      )}
      </div>{/* end LEFT column */}

      {/* RIGHT column: camera hero */}
      <div className="min-h-0 min-w-0 w-full flex-1">
        <WebcamView videoRef={videoRef} canvasRef={canvasRef} />
      </div>

      </div>{/* end main */}

      {/* Status / mock controls */}
      {!ready && !error && (
        <p className="text-center text-sm text-neutral-400">Starting camera…</p>
      )}
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      {ready && isMock && (
        <div className="shrink-0 border-t border-neutral-200 pt-4 text-center">
          <p className="text-xs text-neutral-500">
            No trained model found — running in mock mode.
          </p>
          <button
            onClick={() => { playSound("uiClick"); simulate(card.motion); }}
            className="mt-3 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Simulate “{word}”
          </button>
        </div>
      )}
    </div>
  );
}
