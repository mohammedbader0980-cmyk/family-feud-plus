import { useEffect, useState } from "react";
import { sendMessage, subscribe, type DisplayState, type SyncMessage } from "@/lib/feud-sync";

type State = DisplayState["payload"];

const defaultState: State = {
  currentQIndex: 0,
  totalQuestions: 0,
  questionText: "",
  questionHidden: false,
  team1Name: "فريق 1",
  team2Name: "فريق 2",
  team1Score: 0,
  team2Score: 0,
  revealed: Array(8).fill(false),
  answerHasText: Array(8).fill(false),
  timerSec: 30,
  timerRunning: false,
  musicPlaying: false,
  hasMusic: false,
  onGameScreen: false,
};

const btnBase =
  "min-h-[64px] rounded-xl font-bold text-base md:text-lg px-3 py-3 active:scale-95 transition-transform shadow-md border-2 disabled:opacity-40 disabled:active:scale-100 select-none";

const colors = {
  red: "bg-red-700 hover:bg-red-600 border-red-900 text-white",
  gold: "bg-amber-500 hover:bg-amber-400 border-amber-700 text-black",
  blue: "bg-blue-700 hover:bg-blue-600 border-blue-900 text-white",
  green: "bg-emerald-700 hover:bg-emerald-600 border-emerald-900 text-white",
  purple: "bg-purple-700 hover:bg-purple-600 border-purple-900 text-white",
  gray: "bg-gray-700 hover:bg-gray-600 border-gray-900 text-white",
  goldActive: "bg-amber-300 border-amber-500 text-black ring-2 ring-amber-200",
  purpleActive: "bg-purple-400 border-purple-300 text-black ring-2 ring-purple-200",
} as const;

export default function FeudController() {
  const [state, setState] = useState<State>(defaultState);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const off = subscribe((msg: SyncMessage) => {
      if (msg.action === "STATE") {
        setState(msg.payload);
        setConnected(true);
      }
    });
    // Ask the display for its current state
    sendMessage({ action: "REQUEST_STATE" });
    const t = window.setInterval(() => {
      if (!connected) sendMessage({ action: "REQUEST_STATE" });
    }, 1500);
    return () => {
      off();
      window.clearInterval(t);
    };
  }, [connected]);

  const send = (msg: SyncMessage) => sendMessage(msg);

  const fmtTimer = `${String(Math.floor(state.timerSec / 60)).padStart(2, "0")}:${String(
    state.timerSec % 60,
  ).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-background text-foreground p-3 pb-10" dir="rtl">
      <div className="max-w-[480px] mx-auto flex flex-col gap-3">
        {/* Header status card */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">وحدة تحكم حارة البطل</span>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                connected ? "bg-emerald-700 text-white" : "bg-gray-700 text-gray-200"
              }`}
            >
              {connected ? "متصل" : "بانتظار الشاشة..."}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mb-1">
            سؤال {state.currentQIndex + 1} من {state.totalQuestions || "—"}
          </div>
          <div className="text-base font-bold mb-3 min-h-[1.5rem]">
            {state.questionHidden ? "(السؤال مخفي)" : state.questionText || "—"}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-secondary p-2 text-center">
              <div className="text-xs text-muted-foreground truncate">{state.team1Name}</div>
              <div className="text-2xl font-black text-amber-400">{state.team1Score}</div>
            </div>
            <div className="rounded-lg bg-secondary p-2 text-center">
              <div className="text-xs text-muted-foreground truncate">{state.team2Name}</div>
              <div className="text-2xl font-black text-amber-400">{state.team2Score}</div>
            </div>
          </div>
          <div className="mt-2 text-center text-sm">
            <span
              className={`inline-block px-3 py-1 rounded-full font-mono ${
                state.timerRunning ? "bg-purple-600 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              ⏱ {fmtTimer} {state.timerRunning ? "(يعمل)" : ""}
            </span>
          </div>
        </div>

        {/* Row 1: Wrong answers */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => send({ action: "ADD_X", payload: { count: n as 1 | 2 | 3 } })}
              className={`${btnBase} ${colors.red} text-2xl tracking-widest`}
            >
              {"X".repeat(n)}
            </button>
          ))}
        </div>

        {/* Row 2: Win buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => send({ action: "WIN_TEAM", payload: { team: 1 } })}
            className={`${btnBase} ${colors.gold}`}
          >
            فوز {state.team1Name}
          </button>
          <button
            onClick={() => send({ action: "WIN_TEAM", payload: { team: 2 } })}
            className={`${btnBase} ${colors.gold}`}
          >
            فوز {state.team2Name}
          </button>
        </div>

        {/* Row 3: Playback */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => send({ action: "TOGGLE_MUSIC" })}
            disabled={!state.hasMusic}
            className={`${btnBase} ${state.musicPlaying ? colors.purpleActive : colors.purple}`}
          >
            {state.musicPlaying ? "⏸ موسيقى" : "🎵 موسيقى"}
          </button>
          <button
            onClick={() => send({ action: "RESET_QUESTION" })}
            className={`${btnBase} ${colors.gray}`}
          >
            ↺ إعادة
          </button>
          <button
            onClick={() => send({ action: "START_TIMER" })}
            className={`${btnBase} ${state.timerRunning ? colors.purpleActive : colors.purple}`}
          >
            30s ⏱️
          </button>
        </div>

        {/* Row 4: Navigation (RTL: previous on the right visually) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => send({ action: "PREV_QUESTION" })}
            className={`${btnBase} ${colors.blue}`}
          >
            » السابق
          </button>
          <button
            onClick={() => send({ action: "NEXT_QUESTION" })}
            className={`${btnBase} ${colors.blue}`}
          >
            التالي «
          </button>
        </div>

        {/* Row 5: Reveal controls */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => send({ action: "REVEAL_ALL" })}
            className={`${btnBase} ${colors.blue}`}
          >
            كشف الكل
          </button>
          <button
            onClick={() => send({ action: "HIDE_QUESTION" })}
            className={`${btnBase} ${colors.green}`}
          >
            {state.questionHidden ? "إظهار السؤال" : "إخفاء السؤال"}
          </button>
          <button
            onClick={() => send({ action: "GO_HOME" })}
            className={`${btnBase} ${colors.gray}`}
          >
            🏠
          </button>
        </div>

        {/* Row 6: Individual reveal */}
        <div className="rounded-2xl bg-card border border-border p-3">
          <div className="text-xs text-muted-foreground mb-2">كشف الإجابات</div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => {
              const revealed = state.revealed[i];
              const hasText = state.answerHasText[i];
              return (
                <button
                  key={i}
                  onClick={() => send({ action: "REVEAL_ANSWER", payload: { index: i } })}
                  disabled={!hasText || revealed}
                  className={`${btnBase} ${
                    revealed
                      ? "bg-emerald-900 border-emerald-700 text-emerald-300"
                      : "bg-blue-700 hover:bg-blue-600 border-blue-900 text-white"
                  }`}
                >
                  {revealed ? "✓" : "كشف"} {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 7: Scores */}
        <div className="rounded-2xl bg-card border border-border p-3">
          <div className="text-xs text-muted-foreground mb-2">تعديل النقاط</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              <div className="text-center text-sm font-bold truncate">{state.team1Name}</div>
              <button
                onClick={() => send({ action: "UPDATE_SCORE", payload: { team: 1, delta: 10 } })}
                className={`${btnBase} ${colors.gold}`}
              >
                +10
              </button>
              <button
                onClick={() => send({ action: "UPDATE_SCORE", payload: { team: 1, delta: -10 } })}
                className={`${btnBase} bg-amber-700 hover:bg-amber-600 border-amber-900 text-white`}
              >
                -10
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-center text-sm font-bold truncate">{state.team2Name}</div>
              <button
                onClick={() => send({ action: "UPDATE_SCORE", payload: { team: 2, delta: 10 } })}
                className={`${btnBase} ${colors.gold}`}
              >
                +10
              </button>
              <button
                onClick={() => send({ action: "UPDATE_SCORE", payload: { team: 2, delta: -10 } })}
                className={`${btnBase} bg-amber-700 hover:bg-amber-600 border-amber-900 text-white`}
              >
                -10
              </button>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          متصل عبر الشبكة - يمكن استخدامه من أي جهاز يمسح رمز QR
        </p>
      </div>
    </div>
  );
}
