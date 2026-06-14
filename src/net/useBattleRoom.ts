import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Lang } from "../data/decks";

export type BattleStatus =
  | "connecting" // subscribing to the channel
  | "waiting" // subscribed, alone in the room
  | "ready" // opponent present; host may start
  | "playing" // start signal sent/received
  | "ended" // a finish was observed
  | "error"; // supabase not configured / channel error

export type Opponent = {
  id: string;
  name: string;
  avatar?: string;
  cardIndex: number;
  score: number;
};

// Presence stays tiny (id + name only). The avatar photo is ~10 KB of base64,
// which exceeds Presence's payload limit, so it travels over broadcast instead.
type PresenceMeta = { id: string; name: string };

// startAt is a wall-clock ms timestamp — both sides delay GameScreen mount
// until then so the 3-2-1 countdown is perfectly in sync.
type StartPayload = { seed: number; deckId: string; lang: Lang; startAt: number };
type ProgressPayload = { id: string; cardIndex: number; score: number };
type FinishPayload = { id: string; score: number; finishedAt: number };
type ProfilePayload = { id: string; avatar: string };

/**
 * Owns the Supabase Realtime channel for one battle. Pose detection stays local
 * — only tiny progress payloads cross the wire. Pass `roomCode = null` while the
 * player is still on the create/join form; the channel only opens once it's set.
 */
export function useBattleRoom(
  roomCode: string | null,
  name: string,
  isHost: boolean,
  avatar: string | null = null
) {
  const myIdRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Latest name/avatar without forcing the channel effect to resubscribe.
  const nameRef = useRef(name);
  nameRef.current = name;
  const avatarRef = useRef(avatar);
  avatarRef.current = avatar;
  const subscribedRef = useRef(false);
  // Opponent's photo arrives via broadcast, possibly before/after their
  // presence syncs — stash it so syncPresence can always reattach it.
  const oppAvatarRef = useRef<string | undefined>(undefined);

  const [status, setStatus] = useState<BattleStatus>("connecting");
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [gameLang, setGameLang] = useState<Lang | null>(null);
  const [gameStartAt, setGameStartAt] = useState<number | null>(null);
  const [opponentFinished, setOpponentFinished] = useState(false);

  useEffect(() => {
    if (!roomCode) return;
    const sb = supabase;
    if (!sb) {
      setStatus("error");
      return;
    }

    const myId = myIdRef.current;
    const channel = sb.channel(`battle:${roomCode}`, {
      config: { presence: { key: myId } },
    });
    channelRef.current = channel;

    const syncPresence = () => {
      const state = channel.presenceState<PresenceMeta>();
      const others = Object.values(state)
        .flat()
        .filter((p) => p.id !== myId);
      const other = others[0];
      if (other) {
        setOpponent((prev) => {
          if (prev && prev.id === other.id) {
            // Same opponent — refresh static fields (name, or a photo that
            // arrived over broadcast) without wiping their live cardIndex/score.
            const name = other.name || "Opponent";
            const avatar = oppAvatarRef.current ?? prev.avatar;
            if (prev.name === name && prev.avatar === avatar) return prev;
            return { ...prev, name, avatar };
          }
          return {
            id: other.id,
            name: other.name || "Opponent",
            avatar: oppAvatarRef.current,
            cardIndex: 0,
            score: 0,
          };
        });
        // Don't downgrade once the match is underway.
        setStatus((s) => (s === "playing" || s === "ended" ? s : "ready"));
      } else {
        setOpponent(null);
        setStatus((s) => (s === "playing" || s === "ended" ? s : "waiting"));
      }
    };

    // Tell a freshly-joined peer my photo (broadcasts they missed won't replay).
    const sendProfile = () => {
      if (!avatarRef.current) return;
      channel.send({
        type: "broadcast",
        event: "profile",
        payload: { id: myId, avatar: avatarRef.current } satisfies ProfilePayload,
      });
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, () => {
        syncPresence();
        sendProfile();
      })
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "profile" }, ({ payload }) => {
        const p = payload as ProfilePayload;
        if (p.id === myId) return;
        oppAvatarRef.current = p.avatar;
        setOpponent((prev) => (prev ? { ...prev, avatar: p.avatar } : prev));
      })
      .on("broadcast", { event: "start" }, ({ payload }) => {
        const p = payload as StartPayload;
        setSeed(p.seed);
        setDeckId(p.deckId);
        setGameLang(p.lang);
        setGameStartAt(p.startAt);
        setStatus("playing");
      })
      .on("broadcast", { event: "progress" }, ({ payload }) => {
        const p = payload as ProgressPayload;
        if (p.id === myId) return;
        setOpponent((prev) =>
          prev ? { ...prev, cardIndex: p.cardIndex, score: p.score } : prev
        );
      })
      .on("broadcast", { event: "finish" }, ({ payload }) => {
        const p = payload as FinishPayload;
        if (p.id === myId) return;
        setOpponentFinished(true);
      })
      .subscribe(async (s) => {
        if (s === "SUBSCRIBED") {
          subscribedRef.current = true;
          await channel.track({ id: myId, name: nameRef.current });
          // If a photo was already captured before subscribe, announce it.
          sendProfile();
          setStatus((cur) => (cur === "connecting" ? "waiting" : cur));
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
          setStatus("error");
        }
      });

    return () => {
      subscribedRef.current = false;
      sb.removeChannel(channel);
      channelRef.current = null;
    };
    // name/avatar are pushed via refs + the broadcast effect below; only the
    // room identity should drive (re)subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // Broadcast a freshly-captured photo to the opponent once subscribed.
  useEffect(() => {
    if (!subscribedRef.current || !avatar) return;
    channelRef.current?.send({
      type: "broadcast",
      event: "profile",
      payload: { id: myIdRef.current, avatar } satisfies ProfilePayload,
    });
  }, [avatar]);

  const startGame = useCallback((dId: string, lang: Lang) => {
    const channel = channelRef.current;
    if (!channel) return;
    const newSeed = Math.floor(Math.random() * 2 ** 31);
    // Give the broadcast 600 ms to reach the guest before both sides
    // mount GameScreen, so the 3-2-1 countdown starts at the same moment.
    const startAt = Date.now() + 600;
    channel.send({
      type: "broadcast",
      event: "start",
      payload: { seed: newSeed, deckId: dId, lang, startAt } satisfies StartPayload,
    });
    // The sender doesn't receive its own broadcast, so set state directly.
    setSeed(newSeed);
    setDeckId(dId);
    setGameLang(lang);
    setGameStartAt(startAt);
    setStatus("playing");
  }, []);

  const sendProgress = useCallback((cardIndex: number, score: number) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "progress",
      payload: { id: myIdRef.current, cardIndex, score } satisfies ProgressPayload,
    });
  }, []);

  const sendFinish = useCallback((score: number) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "finish",
      payload: {
        id: myIdRef.current,
        score,
        finishedAt: Date.now(),
      } satisfies FinishPayload,
    });
  }, []);

  return {
    status,
    opponent,
    seed,
    deckId,
    gameLang,
    gameStartAt,
    isHost,
    startGame,
    sendProgress,
    sendFinish,
    opponentFinished,
  };
}
