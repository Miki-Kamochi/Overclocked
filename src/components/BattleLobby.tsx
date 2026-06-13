import { useState } from "react";
import { DECKS, type Deck } from "../data/decks";
import type { BattleStatus, Opponent } from "../net/useBattleRoom";

type Props = {
  roomCode: string | null;
  status: BattleStatus;
  isHost: boolean;
  opponent: Opponent | null;
  hostDeck: Deck | null;
  onCreate: (deckId: string) => void;
  onJoin: (code: string) => void;
  onStart: () => void;
  onHome: () => void;
};

export default function BattleLobby({
  roomCode,
  status,
  isHost,
  opponent,
  hostDeck,
  onCreate,
  onJoin,
  onStart,
  onHome,
}: Props) {
  const [view, setView] = useState<"menu" | "create" | "join">("menu");
  const [code, setCode] = useState("");

  // ── Waiting room (a room exists) ───────────────────────────────────────
  if (roomCode) {
    const ready = status === "ready" && opponent;
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-12">
        <button onClick={onHome} className="-ml-1 self-start text-sm text-neutral-400 hover:text-neutral-900">
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

        <div className="mt-10 flex items-center gap-3 text-sm">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${ready ? "bg-emerald-500" : "bg-neutral-300"}`} />
          {ready
            ? `${opponent?.name ?? "Opponent"} is ready`
            : "Waiting for opponent…"}
        </div>

        {hostDeck && (
          <div className="mt-6 text-sm text-neutral-500">
            Deck: <span className="font-medium text-neutral-900">{hostDeck.emoji} {hostDeck.title}</span>
          </div>
        )}

        {isHost ? (
          <button
            onClick={onStart}
            disabled={!ready}
            className="mt-10 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white enabled:hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Start battle
          </button>
        ) : (
          <p className="mt-10 text-sm text-neutral-400">
            Waiting for the host to start the battle…
          </p>
        )}

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
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-12">
        <button onClick={() => setView("menu")} className="-ml-1 self-start text-sm text-neutral-400 hover:text-neutral-900">
          ← Back
        </button>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Pick a deck</h1>
        <p className="mt-2 text-sm text-neutral-500">Both players race through this deck.</p>
        <div className="mt-8 flex flex-col gap-3">
          {DECKS.map((deck) => (
            <button
              key={deck.id}
              onClick={() => onCreate(deck.id)}
              className="flex items-center justify-between rounded-xl border border-neutral-200 px-5 py-4 text-left hover:border-neutral-900"
            >
              <span className="font-medium">{deck.emoji} {deck.title}</span>
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
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-12">
        <button onClick={() => setView("menu")} className="-ml-1 self-start text-sm text-neutral-400 hover:text-neutral-900">
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
    <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-12">
      <button onClick={onHome} className="-ml-1 self-start text-sm text-neutral-400 hover:text-neutral-900">
        ← Home
      </button>
      <h1 className="mt-10 text-4xl font-semibold tracking-tight">Battle</h1>
      <p className="mt-2 text-neutral-500">
        Two players, same deck. First to act out every word wins.
      </p>
      <div className="mt-10 flex flex-col gap-3">
        <button
          onClick={() => setView("create")}
          className="rounded-lg bg-neutral-900 px-6 py-4 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Create match
        </button>
        <button
          onClick={() => setView("join")}
          className="rounded-lg border border-neutral-300 px-6 py-4 text-sm font-medium text-neutral-900 hover:border-neutral-900"
        >
          Join match
        </button>
      </div>
    </div>
  );
}
