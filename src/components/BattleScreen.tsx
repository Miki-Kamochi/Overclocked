import { useEffect, useMemo, useRef, useState } from "react";
import { getDeck, GAME_LENGTH, type Lang } from "../data/decks";
import { useBattleRoom } from "../net/useBattleRoom";
import { playSound } from "../lib/sounds";
import GameScreen from "./GameScreen";
import BattleLobby from "./BattleLobby";

type Props = {
  onHome: () => void;
  initialDeckId?: string;
};

// 4-char codes; no 0/O/1/I to avoid confusion when read aloud.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeRoomCode(): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

export default function BattleScreen({ onHome, initialDeckId }: Props) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [hostDeckId, setHostDeckId] = useState<string | null>(initialDeckId ?? null);
  const [outcome, setOutcome] = useState<null | "win" | "lose">(null);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  const {
    status,
    opponent,
    seed,
    deckId,
    gameLang,
    gameStartAt,
    startGame,
    sendProgress,
    sendFinish,
    opponentFinished,
    // No real names are collected — send an empty name so the other side
    // labels us "Opponent" (each player calls themselves "You" locally).
  } = useBattleRoom(roomCode, "", isHost, myAvatar);

  // Delay GameScreen mount until the scheduled startAt so both players'
  // 3-2-1 countdowns begin at the same wall-clock moment.
  const [gameReady, setGameReady] = useState(false);
  useEffect(() => {
    if (status !== "playing" || gameStartAt === null) return;
    const delay = Math.max(0, gameStartAt - Date.now());
    const id = window.setTimeout(() => setGameReady(true), delay);
    return () => window.clearTimeout(id);
  }, [status, gameStartAt]);

  // Auto-start when both players have photos (host drives it).
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (
      isHost &&
      hostDeckId &&
      myAvatar &&
      opponent?.avatar &&
      status === "ready" &&
      !autoStartedRef.current
    ) {
      autoStartedRef.current = true;
      startGame(hostDeckId, lang);
    }
  }, [isHost, hostDeckId, myAvatar, opponent?.avatar, status, lang, startGame]);

  // Resolve win/lose: the first finish observed locally settles it.
  useEffect(() => {
    if (opponentFinished) {
      setOutcome((prev) => {
        if (prev) return prev;
        const result = myScore !== null ? "win" : "lose";
        playSound("gameFinish");
        return result;
      });
    }
  }, [opponentFinished, myScore]);

  const deck = useMemo(() => (deckId ? getDeck(deckId) ?? null : null), [deckId]);
  const hostDeck = useMemo(() => (hostDeckId ? getDeck(hostDeckId) ?? null : null), [hostDeckId]);

  // ── Result: someone won ────────────────────────────────────────────────
  if (outcome) {
    const won = outcome === "win";
    return (
      <div className="mx-auto flex max-w-xl flex-col px-6 py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-neutral-400">Battle</div>
        <h1 className={`mt-2 text-5xl font-semibold tracking-tight ${won ? "text-emerald-600" : "text-neutral-900"}`}>
          {won ? "You win" : "You lose"}
        </h1>
        <p className="mt-4 text-neutral-500">
          {won
            ? "You cleared the deck first."
            : `${opponent?.name ?? "Your opponent"} cleared the deck first.`}
        </p>

        {/* Player photos */}
        <div className="mt-8 flex items-end gap-6">
          {[
            { src: myAvatar, name: "You", isWinner: won, tilt: "-rotate-1" },
            { src: opponent?.avatar, name: opponent?.name ?? "Opponent", isWinner: !won, tilt: "rotate-2" },
          ].map(({ src, name, isWinner, tilt }) => (
            <div key={name} className={`inline-flex flex-col items-center ${tilt}`}>
              {isWinner && <span className="mb-1 text-xl">👑</span>}
              <div className={`rounded-sm bg-white p-3 shadow-lg ${isWinner ? "ring-2 ring-amber-400" : ""}`}>
                {src ? (
                  <img src={src} alt={name} className="h-40 w-40 rounded-sm object-cover" />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center rounded-sm bg-neutral-100 text-4xl font-bold text-neutral-400">
                    {name[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <p className="mt-2 text-center text-[10px] text-neutral-400">{name}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => { playSound("uiClick"); onHome(); }}
          className="mt-10 self-start rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Home
        </button>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────
  if (status === "playing" && seed !== null && deck && gameReady) {
    return (
      <GameScreen
        key={`${roomCode}-${seed}`}
        deck={deck}
        seed={seed}
        lang={gameLang ?? lang}
        me={{ name: "You", avatar: myAvatar }}
        opponent={
          opponent
            ? {
                name: opponent.name,
                avatar: opponent.avatar,
                cardIndex: opponent.cardIndex,
                score: opponent.score,
                total: GAME_LENGTH,
              }
            : null
        }
        onProgress={sendProgress}
        onFinish={(score) => {
          setMyScore(score);
          sendFinish(score);
          setOutcome((o) => o ?? (opponentFinished ? "lose" : "win"));
        }}
        onQuit={onHome}
      />
    );
  }

  // ── Starting — hold a neutral splash until the synced startAt moment, so we
  // don't flash the "waiting for opponent" lobby (and its camera blink) during
  // the ~600 ms countdown-sync window. ────────────────────────────────────────
  if (status === "playing") {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center gap-3">
        <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-neutral-300" />
        <p className="text-sm text-neutral-400">Get ready…</p>
      </div>
    );
  }

  // ── Lobby (menu / create / join / waiting room) ─────────────────────────
  return (
    <BattleLobby
      roomCode={roomCode}
      status={status}
      isHost={isHost}
      opponent={opponent}
      hostDeck={hostDeck}
      myAvatar={myAvatar}
      onCapture={(dataUrl) => setMyAvatar(dataUrl || null)}
      lang={lang}
      onLang={setLang}
      initialDeckId={initialDeckId}
      onCreate={(id) => {
        setHostDeckId(id);
        setIsHost(true);
        setRoomCode(makeRoomCode());
      }}
      onJoin={(c) => {
        setIsHost(false);
        setRoomCode(c);
      }}
      onHome={onHome}
    />
  );
}
