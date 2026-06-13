import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

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
  cardIndex: number;
  score: number;
};

type StartPayload = { seed: number; deckId: string };
type ProgressPayload = { id: string; cardIndex: number; score: number };
type FinishPayload = { id: string; score: number; finishedAt: number };

/**
 * Owns the Supabase Realtime channel for one battle. Pose detection stays local
 * — only tiny progress payloads cross the wire. Pass `roomCode = null` while the
 * player is still on the create/join form; the channel only opens once it's set.
 */
export function useBattleRoom(
  roomCode: string | null,
  name: string,
  isHost: boolean
) {
  const myIdRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );
  const channelRef = useRef<RealtimeChannel | null>(null);

  const [status, setStatus] = useState<BattleStatus>("connecting");
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [deckId, setDeckId] = useState<string | null>(null);
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
      const state = channel.presenceState<{ id: string; name: string }>();
      const others = Object.values(state)
        .flat()
        .filter((p) => p.id !== myId);
      const other = others[0];
      if (other) {
        setOpponent((prev) =>
          prev && prev.id === other.id
            ? prev
            : { id: other.id, name: other.name || "Opponent", cardIndex: 0, score: 0 }
        );
        // Don't downgrade once the match is underway.
        setStatus((s) => (s === "playing" || s === "ended" ? s : "ready"));
      } else {
        setOpponent(null);
        setStatus((s) => (s === "playing" || s === "ended" ? s : "waiting"));
      }
    };

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on("presence", { event: "join" }, syncPresence)
      .on("presence", { event: "leave" }, syncPresence)
      .on("broadcast", { event: "start" }, ({ payload }) => {
        const p = payload as StartPayload;
        setSeed(p.seed);
        setDeckId(p.deckId);
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
          await channel.track({ id: myId, name });
          setStatus((cur) => (cur === "connecting" ? "waiting" : cur));
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
          setStatus("error");
        }
      });

    return () => {
      sb.removeChannel(channel);
      channelRef.current = null;
    };
    // name is fixed for the lifetime of a match; only the room identity matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  const startGame = useCallback((dId: string) => {
    const channel = channelRef.current;
    if (!channel) return;
    const newSeed = Math.floor(Math.random() * 2 ** 31);
    channel.send({
      type: "broadcast",
      event: "start",
      payload: { seed: newSeed, deckId: dId } satisfies StartPayload,
    });
    // The sender doesn't receive its own broadcast, so set state directly.
    setSeed(newSeed);
    setDeckId(dId);
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
    isHost,
    startGame,
    sendProgress,
    sendFinish,
    opponentFinished,
  };
}
