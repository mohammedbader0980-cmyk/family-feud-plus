// Lightweight BroadcastChannel sync between the main game screen and the
// mobile controller route. Works only across tabs in the same browser
// profile on the same device (BroadcastChannel limitation).

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
  | { action: "RESET_QUESTION" }
  | { action: "UPDATE_SCORE"; payload: { team: 1 | 2; delta: number } }
  | { action: "GO_HOME" }
  | { action: "REQUEST_STATE" };

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
    timerSec: number;
    timerRunning: boolean;
    musicPlaying: boolean;
    hasMusic: boolean;
    onGameScreen: boolean;
  };
};

export type SyncMessage = ControllerAction | DisplayState;

const CHANNEL = "family-feud-sync";

const getChannel = (): BroadcastChannel | null => {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CHANNEL);
};

export const sendMessage = (msg: SyncMessage) => {
  const ch = getChannel();
  if (!ch) return;
  ch.postMessage(msg);
  ch.close();
};

export const subscribe = (handler: (msg: SyncMessage) => void): (() => void) => {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return () => {};
  }
  const ch = new BroadcastChannel(CHANNEL);
  ch.onmessage = (e) => handler(e.data as SyncMessage);
  return () => ch.close();
};
