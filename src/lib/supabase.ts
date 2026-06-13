import { createClient } from "@supabase/supabase-js";

// Realtime-only client. We never touch the database — battle mode uses
// Broadcast + Presence channels, so the anon key is all we need (and it is
// safe to ship to the browser). Values come from Vite env vars; see
// .env.local (local) and the Vercel project settings (deploy).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True only when both env vars are present — lets the UI hide battle mode. */
export const battleEnabled = Boolean(url && anonKey);

export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        realtime: { params: { eventsPerSecond: 20 } },
      })
    : null;
