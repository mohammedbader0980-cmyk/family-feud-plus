// Cross-device sync via Supabase Realtime broadcast.
// Channel "feud-control" - public access, no auth required.

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ControllerAction =
  | { action: "REVEAL_ANSWER"; payload: { index: number } }
  | { action: "REVEAL_ALL" }
  | { action: "HIDE_QUESTION" }
  | { action: "NEXT_QUESTION" }
  | { action: "PREV_QUESTION" }
  | { action: "ADD_X"; payload: { count: 1 | 2 | 3 } }
  | { action: "WIN_TEAM"; payload: { team: 1 | 2 } }
  | { action: "TOGGLE_MUSIC" }
  | { action: "START_TIMER" }
  | { action: "PAUSE_TIMER" }
  | { action: "RESET_TIMER" }
  | { action: "SET_TIMER_DURATION"; payload: { seconds: number } }
  | { action: "RESET_QUESTION" }
  | { action: "UPDATE_SCORE"; payload: { team: 1 | 2; delta: number } }
  | { action: "GO_HOME" }
  | { action: "REQUEST_STATE" }
  // Music controls from controller
  | { action: "PLAY_TRACK"; payload: { id: string } }
  | { action: "PAUSE_MUSIC" }
  | { action: "RESUME_MUSIC" }
  | { action: "STOP_MUSIC" }
  | { action: "NEXT_TRACK" }
  | { action: "PREV_TRACK" }
  | { action: "SET_VOLUME"; payload: { value: number } }
  | { action: "TOGGLE_LOOP" }
  | { action: "DELETE_TRACK"; payload: { id: string } }
  | { action: "TRACKS_UPDATED" }
  | { action: "SET_TEAM_PHOTO"; payload: { team: 1 | 2; url: string | null } };

export type DisplayState = {
  action: "STATE";
  payload: {
    currentQIndex: number;
    totalQuestions: number;
    questionText: string;
    questionHidden: boolean;
    team1Name: string;
    team2Name: string;
    team1Score: number;
    team2Score: number;
    revealed: boolean[];
    answerHasText: boolean[];
    answers: { text: string; points: number }[];
    timerSec: number;
    timerRunning: boolean;
    timerDuration: number;
    musicPlaying: boolean;
    hasMusic: boolean;
    musicVolume: number;
    musicLoop: boolean;
    tracks: { id: string; name: string }[];
    currentTrackId: string | null;
    onGameScreen: boolean;
    team1Photo: string | null;
    team2Photo: string | null;
  };
};

export type SyncMessage = ControllerAction | DisplayState;

const ROOM = "feud-control";
const EVENT = "sync";

const SENDER_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

type Listener = (msg: SyncMessage) => void;

let channel: RealtimeChannel | null = null;
let channelReady = false;
const pendingSends: SyncMessage[] = [];
const listeners = new Set<Listener>();

const ensureChannel = (): RealtimeChannel | null => {
  if (typeof window === "undefined") return null;
  if (channel) return channel;

  channel = supabase.channel(ROOM, {
    config: { broadcast: { self: false, ack: false } },
  });

  channel.on("broadcast", { event: EVENT }, (msg) => {
    const data = msg.payload as { sender: string; body: SyncMessage } | undefined;
    if (!data || data.sender === SENDER_ID) return;
    listeners.forEach((l) => {
      try {
        l(data.body);
      } catch (e) {
        console.error("[feud-sync] listener error", e);
      }
    });
  });

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channelReady = true;
      const queued = pendingSends.splice(0);
      queued.forEach((m) => sendMessage(m));
    }
  });

  return channel;
};

export const sendMessage = (msg: SyncMessage) => {
  const ch = ensureChannel();
  if (!ch) return;
  if (!channelReady) {
    pendingSends.push(msg);
    return;
  }
  ch.send({
    type: "broadcast",
    event: EVENT,
    payload: { sender: SENDER_ID, body: msg },
  }).catch((e) => console.error("[feud-sync] send failed", e));
};

export const subscribe = (handler: Listener): (() => void) => {
  if (typeof window === "undefined") return () => {};
  ensureChannel();
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
};
