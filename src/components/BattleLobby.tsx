import { useState } from "react";
import { DECKS, type Deck, type Lang } from "../data/decks";
import type { BattleStatus, Opponent } from "../net/useBattleRoom";
import { playSound } from "../lib/sounds";
import ProfileCapture from "./ProfileCapture";
import LanguageToggle from "./LanguageToggle";

type Props = {
  roomCode: string | null;
  status: BattleStatus;
  isHost: boolean;
  opponent: Opponent | null;
  hostDeck: Deck | null;
  myAvatar: string | null;
  onCapture: (dataUrl: string) => void;
  lang: Lang;
  onLang: (lang: Lang) => void;
  initialDeckId?: string;
  onCreate: (deckId: string) => void;
  onJoin: (code: string) => void;
  onHome: () => void;
};

export default function BattleLobby({
  roomCode,
  status,
  isHost,
  opponent,
  hostDeck,
  myAvatar,
  onCapture,
  lang,
  onLang,
  initialDeckId,
  onCreate,
  onJoin,
  onHome,
}: Props) {
  const [view, setView] = useState<"menu" | "create" | "join">("menu");
  const [code, setCode] = useState("");

  // ── Match found — VS page with inline cameras ─────────────────────────
  if (roomCode && status === "ready" && opponent) {
    const bothReady = !!myAvatar && !!opponent.avatar;
    return (
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-8 py-10">
        <button onClick={() => { playSound("uiClick"); onHome(); }} className="-ml-1 self-start text-sm text-neutral-400 hover:text-neutral-900">
          ← Leave
        </button>

        <p className="mt-10 text-xs uppercase tracking-[0.2em] text-neutral-400">Match found</p>
        {hostDeck && (
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">{hostDeck.title}</h1>
        )}

        {/* VS layout — opponent photo left, your live camera right */}
        <div className="mt-10 flex items-start justify-between gap-8">
          {/* Opponent */}
          <div className="flex flex-1 flex-col items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Opponent</p>
            {opponent.avatar ? (
              <img
                src={opponent.avatar}
                alt={opponent.name}
                className="h-72 w-72 rounded-full object-cover ring-2 ring-neutral-200"
              />
            ) : (
              <div className="flex h-72 w-72 items-center justify-center rounded-full bg-neutral-100 text-5xl text-neutral-300">
                ?
              </div>
            )}
            <p className="text-xs text-neutral-500">
              {opponent.avatar ? opponent.name : "Waiting for photo…"}
            </p>
          </div>

          <p className="mt-28 shrink-0 text-3xl font-bold text-neutral-300">VS</p>

          {/* You — live camera inline */}
          <div className="flex flex-1 flex-col items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">You</p>
            <ProfileCapture value={myAvatar} onCapture={onCapture} large />
          </div>
        </div>

        {/* Status */}
        <p className="mt-8 text-center text-sm text-neutral-400">
          {bothReady
            ? "Both ready — starting…"
            : "Take your photo — game starts when both players are ready"}
        </p>

        {/* Language — host only */}
        {isHost && !bothReady && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">Language</p>
            <div className="mt-3">
              <LanguageToggle value={lang} onChange={onLang} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Waiting room (waiting for opponent to join) ────────────────────────
  if (roomCode) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-6 lg:py-12">
        <button onClick={() => { playSound("uiClick"); onHome(); }} className="-ml-1 self-start text-sm text-neutral-400 hover:text-neutral-900">
          ← Leave
        </button>

        <div className="mt-10 text-xs uppercase tracking-[0.2em] text-neutral-400">
          Room code
        </div>
        <div className="mt-2 font-mono text-6xl font-semibold tracking-[0.3em]">
          {roomCode}
        </div>
        {isHost && (
          <p className="mt-3 text-sm text-neutral-500">
            Share this code with your opponent so they can join.
          </p>
        )}

        {hostDeck && (
          <div className="mt-6 text-sm text-neutral-500">
            Deck: <span className="font-medium text-neutral-900">{hostDeck.title}</span>
          </div>
        )}

        <div className="mt-10 flex items-center gap-3 text-sm">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-neutral-300" />
          Waiting for opponent…
        </div>

        {status === "error" && (
          <p className="mt-6 text-sm text-red-600">
            Connection problem. Check your Supabase keys and reload.
          </p>
        )}
      </div>
    );
  }

  // ── Create: pick a deck ────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-6 lg:py-12">
        <button onClick={() => { playSound("uiClick"); setView("menu"); }} className="-ml-1 self-start text-sm text-neutral-400 hover:text-neutral-900">
          ← Back
        </button>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Pick a deck</h1>
        <p className="mt-2 text-sm text-neutral-500">Both players race through this deck.</p>
        <div className="mt-8 flex flex-col gap-3">
          {DECKS.map((deck) => (
            <button
              key={deck.id}
              onClick={() => { playSound("uiClick"); onCreate(deck.id); }}
              className="flex items-center justify-between rounded-xl border border-neutral-200 px-5 py-4 text-left hover:border-neutral-900"
            >
              <span className="font-medium">{deck.title}</span>
              <span className="text-sm text-neutral-400">{deck.cards.length} cards</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Join: enter code ───────────────────────────────────────────────────
  if (view === "join") {
    const trimmed = code.trim().toUpperCase();
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-6 lg:py-12">
        <button onClick={() => { playSound("uiClick"); setView("menu"); }} className="-ml-1 self-start text-sm text-neutral-400 hover:text-neutral-900">
          ← Back
        </button>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Join a match</h1>
        <p className="mt-2 text-sm text-neutral-500">Enter the code your opponent shared.</p>
        <form
          className="mt-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed.length >= 4) onJoin(trimmed);
          }}
        >
          <input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4}
            placeholder="ABCD"
            className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-center font-mono text-3xl tracking-[0.3em] outline-none focus:border-neutral-900"
          />
          <button
            type="submit"
            disabled={trimmed.length < 4}
            onClick={() => playSound("uiClick")}
            className="mt-6 w-full rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white enabled:hover:bg-neutral-700 disabled:opacity-30"
          >
            Join
          </button>
        </form>
      </div>
    );
  }

  // ── Menu: create or join ───────────────────────────────────────────────
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-6 lg:py-12">
      <button onClick={() => { playSound("uiClick"); onHome(); }} className="-ml-1 self-start text-sm text-neutral-400 hover:text-neutral-900">
        ← Home
      </button>
      <h1 className="mt-10 text-4xl font-semibold tracking-tight">Battle</h1>
      <p className="mt-2 text-neutral-500">
        Two players, same deck. First to act out every word wins.
      </p>
      <div className="mt-10 flex flex-col gap-3">
        <button
          onClick={() => { playSound("uiClick"); initialDeckId ? onCreate(initialDeckId) : setView("create"); }}
          className="rounded-lg bg-neutral-900 px-6 py-4 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Create match
        </button>
        <button
          onClick={() => { playSound("uiClick"); setView("join"); }}
          className="rounded-lg border border-neutral-300 px-6 py-4 text-sm font-medium text-neutral-900 hover:border-neutral-900"
        >
          Join match
        </button>
      </div>
    </div>
  );
}
