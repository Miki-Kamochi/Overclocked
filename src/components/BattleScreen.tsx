import { useEffect, useMemo, useState } from "react";
import { getDeck } from "../data/decks";
import { useBattleRoom } from "../net/useBattleRoom";
import GameScreen from "./GameScreen";
import BattleLobby from "./BattleLobby";

type Props = {
  onHome: () => void;
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

export default function BattleScreen({ onHome }: Props) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [hostDeckId, setHostDeckId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<null | "win" | "lose">(null);
  const [myScore, setMyScore] = useState<number | null>(null);

  const {
    status,
    opponent,
    seed,
    deckId,
    startGame,
    sendProgress,
    sendFinish,
    opponentFinished,
  } = useBattleRoom(roomCode, "You", isHost);

  // Resolve win/lose: the first finish observed locally settles it.
  useEffect(() => {
    if (opponentFinished) {
      setOutcome((o) => o ?? (myScore !== null ? "win" : "lose"));
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
          {won ? "You win 🎉" : "You lose"}
        </h1>
        <p className="mt-4 text-neutral-500">
          {won
            ? "You cleared the deck first."
            : `${opponent?.name ?? "Your opponent"} cleared the deck first.`}
        </p>
        <button
          onClick={onHome}
          className="mt-10 self-start rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Home
        </button>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────
  if (status === "playing" && seed !== null && deck) {
    return (
      <GameScreen
        key={`${roomCode}-${seed}`}
        deck={deck}
        seed={seed}
        opponent={
          opponent
            ? {
                name: opponent.name,
                cardIndex: opponent.cardIndex,
                score: opponent.score,
                total: deck.cards.length,
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

  // ── Lobby (menu / create / join / waiting room) ─────────────────────────
  return (
    <BattleLobby
      roomCode={roomCode}
      status={status}
      isHost={isHost}
      opponent={opponent}
      hostDeck={hostDeck}
      onCreate={(id) => {
        setHostDeckId(id);
        setIsHost(true);
        setRoomCode(makeRoomCode());
      }}
      onJoin={(c) => {
        setIsHost(false);
        setRoomCode(c);
      }}
      onStart={() => {
        if (hostDeckId) startGame(hostDeckId);
      }}
      onHome={onHome}
    />
  );
}
