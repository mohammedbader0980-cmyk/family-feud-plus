// Session identity + durable state persistence for the game.
// A session id ties the display screen and any controller devices together.
// A private session token authorizes all database/storage access (server-side).

import { loadSessionFn, saveSessionFn } from "@/lib/feud-api.functions";
import type { DisplayState } from "@/lib/feud-sync";

const STORAGE_KEY = "feud-session-id";
const TOKEN_KEY = "feud-session-token";

const makeId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const makeToken = () => {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
};

let cached: string | null = null;
let cachedToken: string | null = null;

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

/** Private key that authorizes access to this session's data. */
export const getSessionToken = (): string => {
  if (cachedToken) return cachedToken;
  if (typeof window === "undefined") return "";

  const fromUrl = new URLSearchParams(window.location.search).get("t");
  if (fromUrl && fromUrl.trim()) {
    cachedToken = fromUrl.trim();
    try {
      window.localStorage.setItem(`${TOKEN_KEY}:${getSessionId()}`, cachedToken);
    } catch {
      /* ignore */
    }
    return cachedToken;
  }

  const key = `${TOKEN_KEY}:${getSessionId()}`;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(key);
  } catch {
    /* ignore */
  }
  if (!stored) {
    stored = makeToken();
    try {
      window.localStorage.setItem(key, stored);
    } catch {
      /* ignore */
    }
  }
  cachedToken = stored;
  return cachedToken;
};

/** Credentials for the server functions guarding session data. */
export const sessionAuth = () => ({
  sessionId: getSessionId(),
  token: getSessionToken(),
});

/** True when this device is following a session from the URL (a controller). */
const sessionFromUrl = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!new URLSearchParams(window.location.search).get("session");
};

/**
 * Start a brand new session on this device. Used to self-heal when the stored
 * token no longer matches the session row (e.g. the row was created by another
 * device or the local token was cleared) — the old id would otherwise reject
 * every upload with "invalid session token".
 */
export const rotateSession = (): string => {
  if (typeof window === "undefined") return "default";
  const id = makeId();
  const token = makeToken();
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
    window.localStorage.setItem(`${TOKEN_KEY}:${id}`, token);
  } catch {
    /* ignore */
  }
  cached = id;
  cachedToken = token;
  return id;
};

const isTokenError = (e: unknown) =>
  /invalid session token/i.test(e instanceof Error ? e.message : String(e ?? ""));

/**
 * Run a call that needs session credentials, rotating to a fresh session and
 * retrying once when the server rejects the stored token.
 */
export const withSession = async <T>(
  run: (auth: { sessionId: string; token: string }) => Promise<T>,
): Promise<T> => {
  try {
    return await run(sessionAuth());
  } catch (e) {
    if (!isTokenError(e) || sessionFromUrl()) throw e;
    rotateSession();
    const { resetChannel } = await import("@/lib/feud-sync");
    resetChannel();
    return run(sessionAuth());
  }
};


export type SessionState = DisplayState["payload"];

let saveTimer: number | null = null;
let pending: SessionState | null = null;

/** Debounced save of the latest snapshot through the secured server function. */
export const saveSessionState = (state: SessionState) => {
  if (typeof window === "undefined") return;
  pending = state;
  if (saveTimer !== null) return;
  saveTimer = window.setTimeout(() => {
    saveTimer = null;
    const body = pending;
    pending = null;
    if (!body) return;
    void withSession((auth) =>
      saveSessionFn({ data: { ...auth, stateJson: JSON.stringify(body) } }),
    ).catch((e) =>
      console.warn("[feud-session] save failed", e),
    );
  }, 600);
};

/** Last saved snapshot for this session, or null when none exists yet. */
export const loadSessionState = async (): Promise<SessionState | null> => {
  try {
    const res = await withSession((auth) => loadSessionFn({ data: auth }));
    const state = res?.stateJson ? (JSON.parse(res.stateJson) as SessionState) : undefined;
    if (!state || typeof state !== "object" || !("team1Score" in state)) return null;
    return state;
  } catch (e) {
    console.warn("[feud-session] load failed", e);
    return null;
  }
};
