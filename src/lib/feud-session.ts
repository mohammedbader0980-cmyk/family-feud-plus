// Session identity + durable state persistence for the game.
// A session id ties the display screen and any controller devices together.

import { supabase } from "@/integrations/supabase/client";
import type { DisplayState } from "@/lib/feud-sync";

const STORAGE_KEY = "feud-session-id";
const TABLE = "game_sessions";

const makeId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

let cached: string | null = null;

/** Session id from ?session= in the URL, else a stable id stored on this device. */
export const getSessionId = (): string => {
  if (cached) return cached;
  if (typeof window === "undefined") return "default";

  const fromUrl = new URLSearchParams(window.location.search).get("session");
  if (fromUrl && fromUrl.trim()) {
    cached = fromUrl.trim().toUpperCase();
    return cached;
  }

  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  if (!stored) {
    stored = makeId();
    try {
      window.localStorage.setItem(STORAGE_KEY, stored);
    } catch {
      /* ignore */
    }
  }
  cached = stored;
  return cached;
};

export type SessionState = DisplayState["payload"];

let saveTimer: number | null = null;
let pending: SessionState | null = null;

/** Debounced upsert of the latest snapshot into the database. */
export const saveSessionState = (state: SessionState) => {
  if (typeof window === "undefined") return;
  pending = state;
  if (saveTimer !== null) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    const body = pending;
    pending = null;
    if (!body) return;
    void supabase
      .from(TABLE)
      .upsert({ id: getSessionId(), state: body as never }, { onConflict: "id" })
      .then(({ error }) => {
        if (error) console.warn("[feud-session] save failed", error.message);
      });
  }, 600);
};

/** Last saved snapshot for this session, or null when none exists yet. */
export const loadSessionState = async (): Promise<SessionState | null> => {
  const { data, error } = await supabase
    .from(TABLE)
    .select("state")
    .eq("id", getSessionId())
    .maybeSingle();
  if (error) {
    console.warn("[feud-session] load failed", error.message);
    return null;
  }
  const state = data?.state as SessionState | undefined;
  if (!state || typeof state !== "object" || !("team1Score" in state)) return null;
  return state;
};
