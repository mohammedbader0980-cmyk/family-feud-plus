import { useEffect, useRef, useState } from "react";
import { sendMessage, subscribe, type DisplayState, type SyncMessage } from "@/lib/feud-sync";
import { supabase } from "@/integrations/supabase/client";
import {
  uploadTeamPhoto as uploadTeamPhotoLib,
  deleteTeamPhoto as deleteTeamPhotoLib,
  TeamPhotoError,
} from "@/lib/team-photo-upload";

type State = DisplayState["payload"];

const MUSIC_BUCKET = "feud-music";

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
  answers: Array.from({ length: 8 }, () => ({ text: "", points: 0 })),
  timerSec: 30,
  timerRunning: false,
  musicPlaying: false,
  hasMusic: false,
  musicVolume: 0.5,
  musicLoop: false,
  tracks: [],
  currentTrackId: null,
  onGameScreen: false,
  team1Photo: null,
  team2Photo: null,
};

const btnBase =
  "min-h-[56px] rounded-xl font-bold text-base px-3 py-3 active:scale-95 transition-transform shadow-md border-2 disabled:opacity-40 disabled:active:scale-100 select-none";

const colors = {
  red: "bg-red-700 hover:bg-red-600 border-red-900 text-white",
  gold: "bg-amber-500 hover:bg-amber-400 border-amber-700 text-black",
  blue: "bg-blue-700 hover:bg-blue-600 border-blue-900 text-white",
  green: "bg-emerald-700 hover:bg-emerald-600 border-emerald-900 text-white",
  purple: "bg-purple-700 hover:bg-purple-600 border-purple-900 text-white",
  gray: "bg-gray-700 hover:bg-gray-600 border-gray-900 text-white",
  purpleActive: "bg-purple-400 border-purple-300 text-black ring-2 ring-purple-200",
} as const;

export default function FeudController() {
  const [state, setState] = useState<State>(defaultState);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const off = subscribe((msg: SyncMessage) => {
      if (msg.action === "STATE") {
        setState(msg.payload);
        setConnected(true);
      }
    });
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

  const currentTrack = state.tracks.find((t) => t.id === state.currentTrackId);

  // Upload directly to Supabase Storage from phone
  const uploadFiles = async (files: FileList) => {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const safeName = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${Date.now()}-${safeName}`;
        const { error } = await supabase.storage
          .from(MUSIC_BUCKET)
          .upload(path, f, { contentType: f.type || "audio/mpeg", upsert: false });
        if (error) {
          console.error("upload error", error);
          alert(`تعذّر رفع: ${f.name}\n${error.message}`);
        }
      }
      send({ action: "TRACKS_UPDATED" });
    } finally {
      setUploading(false);
    }
  };

  // Long-press to delete
  const pressTimer = useRef<number | null>(null);
  const startPress = (id: string) => {
    pressTimer.current = window.setTimeout(() => {
      if (window.confirm("حذف هذه الأغنية؟")) {
        send({ action: "DELETE_TRACK", payload: { id } });
      }
    }, 700);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // ===== Team photo upload =====
  const [photoUploading, setPhotoUploading] = useState<0 | 1 | 2>(0);

  const cropToSquareJpeg = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          const target = Math.min(512, size);
          const canvas = document.createElement("canvas");
          canvas.width = target;
          canvas.height = target;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("canvas"));
          ctx.drawImage(img, sx, sy, size, size, 0, 0, target, target);
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            "image/jpeg",
            0.9,
          );
        };
        img.onerror = () => reject(new Error("image load"));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("file read"));
      reader.readAsDataURL(file);
    });

  const uploadTeamPhoto = async (team: 1 | 2, file: File) => {
    if (!/^image\/(jpe?g|png)$/i.test(file.type)) {
      alert("الصورة يجب أن تكون JPG أو PNG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("حجم الصورة يجب أن يكون أقل من 2 ميجابايت");
      return;
    }
    setPhotoUploading(team);
    try {
      const cropped = await cropToSquareJpeg(file);
      const path = `team${team}.jpg`;
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, cropped, { contentType: "image/jpeg", upsert: true });
      if (error) {
        console.error(error);
        alert("تعذّر رفع الصورة: " + error.message);
        return;
      }
      const { data: signed } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) {
        send({
          action: "SET_TEAM_PHOTO",
          payload: { team, url: `${signed.signedUrl}&v=${Date.now()}` },
        });
      }
    } catch (e) {
      console.error(e);
      alert("فشل تجهيز الصورة");
    } finally {
      setPhotoUploading(0);
    }
  };

  const deleteTeamPhoto = async (team: 1 | 2) => {
    if (!window.confirm("حذف صورة الفريق؟")) return;
    await supabase.storage.from(PHOTO_BUCKET).remove([`team${team}.jpg`]);
    send({ action: "SET_TEAM_PHOTO", payload: { team, url: null } });
  };


  return (
    <div className="min-h-screen bg-background text-foreground p-3 pb-10" dir="rtl">
      <div className="max-w-[480px] mx-auto flex flex-col gap-3">
        {/* Header status */}
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
            {state.questionText || "—"}
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

        {/* ============ ANSWER CHEAT SHEET ============ */}
        <div className="rounded-2xl bg-card border-2 border-amber-700/40 p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-amber-300">📋 ورقة الإجابات (سرية)</h3>
            <span className="text-[10px] text-muted-foreground">
              يراها المضيف فقط
            </span>
          </div>
          <ul className="space-y-1.5">
            {state.answers.map((a, i) => {
              const hasText = !!a.text?.trim();
              const revealed = state.revealed[i];
              if (!hasText) {
                return (
                  <li
                    key={i}
                    className="flex items-center gap-2 p-2 rounded bg-secondary/30 border border-border/50 opacity-40 text-xs text-muted-foreground"
                  >
                    <span className="w-5 text-center">{i + 1}</span>
                    <span className="flex-1">— فارغ —</span>
                  </li>
                );
              }
              return (
                <li
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded border ${
                    revealed
                      ? "bg-emerald-900/30 border-emerald-700"
                      : "bg-secondary border-border"
                  }`}
                >
                  <span className="w-5 text-center text-xs text-muted-foreground">
                    {i + 1}
                  </span>
                  <button
                    onClick={() => send({ action: "REVEAL_ANSWER", payload: { index: i } })}
                    disabled={revealed}
                    className={`min-w-[64px] px-2 py-1.5 rounded text-xs font-bold border-2 active:scale-95 transition-transform ${
                      revealed
                        ? "bg-emerald-700 border-emerald-900 text-white"
                        : "bg-blue-700 hover:bg-blue-600 border-blue-900 text-white"
                    }`}
                  >
                    {revealed ? "✅ مكشوفة" : "🔒 كشف"}
                  </button>
                  <span className="w-10 text-center font-black text-amber-400 text-sm">
                    {a.points}
                  </span>
                  <span className="flex-1 text-sm font-bold truncate text-right">
                    {a.text}
                  </span>
                </li>
              );
            })}
          </ul>
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

        {/* Row 3: Reset / timer */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => send({ action: "RESET_QUESTION" })}
            className={`${btnBase} ${colors.gray}`}
          >
            ↺ إعادة السؤال
          </button>
          <button
            onClick={() => send({ action: "START_TIMER" })}
            className={`${btnBase} ${state.timerRunning ? colors.purpleActive : colors.purple}`}
          >
            ⏱️ 30s
          </button>
        </div>

        {/* Row 4: Navigation */}
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

        {/* Row 5: Reveal / hide */}
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

        {/* Row 6: Scores */}
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

        {/* ============ TEAM PHOTOS ============ */}
        <div className="rounded-2xl bg-card border-2 border-blue-700/40 p-3 shadow-lg">
          <h3 className="text-sm font-bold text-blue-300 mb-3">👥 إعدادات الفرق</h3>
          {([1, 2] as const).map((team) => {
            const photo = team === 1 ? state.team1Photo : state.team2Photo;
            const tname = team === 1 ? state.team1Name : state.team2Name;
            const placeholderBg = team === 1 ? "bg-blue-600" : "bg-red-600";
            const numeral = team === 1 ? "١" : "٢";
            const busy = photoUploading === team;
            return (
              <div
                key={team}
                className="flex items-center gap-3 p-2 mb-2 rounded-lg bg-secondary/40 border border-border"
              >
                <div
                  className={`w-16 h-16 rounded-full overflow-hidden border-2 border-white/70 flex items-center justify-center font-black text-white text-2xl shadow ${
                    photo ? "bg-black" : placeholderBg
                  }`}
                >
                  {photo ? (
                    <img src={photo} alt={tname} className="w-full h-full object-cover" />
                  ) : (
                    <span>{numeral}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold truncate mb-1">{tname}</div>
                  <div className="flex gap-1.5">
                    <label
                      className={`flex-1 text-center px-2 py-2 rounded font-bold text-white text-xs ${
                        busy
                          ? "bg-gray-600 cursor-wait"
                          : "bg-blue-700 hover:bg-blue-600 active:scale-95 cursor-pointer"
                      }`}
                    >
                      {busy ? "جارٍ الرفع..." : photo ? "📷 تغيير" : "📷 رفع صورة"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        disabled={busy}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadTeamPhoto(team, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {photo && (
                      <button
                        onClick={() => void deleteTeamPhoto(team)}
                        className="px-2 py-2 rounded bg-red-900/60 hover:bg-red-700 text-white text-xs font-bold"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground text-center mt-1">
            JPG/PNG · حد أقصى 2MB · يتم القص دائرياً
          </p>
        </div>

        {/* ============ MUSIC PLAYER ============ */}
        <div className="rounded-2xl bg-card border-2 border-purple-700/40 p-3 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-purple-300">🎵 الموسيقى (تشتغل على الشاشة)</h3>
          </div>

          {/* Currently playing */}
          <div className="bg-secondary/60 rounded-lg p-2 mb-3 text-center">
            <div className="text-[10px] text-muted-foreground">الآن</div>
            <div className="text-sm font-bold truncate">
              {currentTrack?.name || "— لم تُختار أغنية —"}
            </div>
            <div className="text-[10px] text-purple-300 mt-1">
              {state.musicPlaying ? "▶ يعمل" : "⏸ متوقف"}
              {state.musicLoop ? " · 🔁 تكرار" : ""}
            </div>
          </div>

          {/* Player controls */}
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            <button
              onClick={() => send({ action: "PREV_TRACK" })}
              disabled={!state.hasMusic}
              className={`${btnBase} ${colors.gray} min-h-[48px] text-lg px-0`}
            >
              ⏮
            </button>
            <button
              onClick={() =>
                send({ action: state.musicPlaying ? "PAUSE_MUSIC" : "RESUME_MUSIC" })
              }
              disabled={!state.hasMusic}
              className={`${btnBase} ${state.musicPlaying ? colors.purpleActive : colors.purple} min-h-[48px] text-lg px-0`}
            >
              {state.musicPlaying ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => send({ action: "STOP_MUSIC" })}
              disabled={!state.hasMusic}
              className={`${btnBase} ${colors.red} min-h-[48px] text-lg px-0`}
            >
              ⏹
            </button>
            <button
              onClick={() => send({ action: "NEXT_TRACK" })}
              disabled={!state.hasMusic}
              className={`${btnBase} ${colors.gray} min-h-[48px] text-lg px-0`}
            >
              ⏭
            </button>
            <button
              onClick={() => send({ action: "TOGGLE_LOOP" })}
              className={`${btnBase} ${state.musicLoop ? colors.purpleActive : colors.purple} min-h-[48px] text-lg px-0`}
            >
              🔁
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🔊</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.musicVolume}
              onChange={(e) =>
                send({ action: "SET_VOLUME", payload: { value: Number(e.target.value) } })
              }
              className="flex-1 accent-purple-500"
            />
            <span className="text-xs w-10 text-center font-mono">
              {Math.round(state.musicVolume * 100)}%
            </span>
          </div>

          {/* Upload */}
          <label
            className={`block text-center px-3 py-2.5 rounded-lg font-bold text-white text-sm cursor-pointer mb-3 ${
              uploading
                ? "bg-gray-600 cursor-wait"
                : "bg-purple-700 hover:bg-purple-600 active:scale-95"
            }`}
          >
            {uploading ? "جارٍ الرفع..." : "⬆️ رفع أغنية MP3"}
            <input
              type="file"
              accept="audio/*"
              multiple
              disabled={uploading}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {/* Playlist */}
          {state.tracks.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground italic py-2">
              لا توجد أغاني — ارفع MP3 من جوالك
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {state.tracks.map((t) => {
                const active = t.id === state.currentTrackId;
                return (
                  <li
                    key={t.id}
                    onPointerDown={() => startPress(t.id)}
                    onPointerUp={cancelPress}
                    onPointerLeave={cancelPress}
                    onPointerCancel={cancelPress}
                    className={`flex items-center gap-2 p-2 rounded border select-none ${
                      active
                        ? "bg-purple-900/40 border-purple-500"
                        : "bg-secondary border-border"
                    }`}
                  >
                    <button
                      onClick={() => send({ action: "PLAY_TRACK", payload: { id: t.id } })}
                      className="flex-1 text-right text-sm truncate"
                    >
                      {active && state.musicPlaying ? "▶ " : ""}
                      {t.name}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("حذف هذه الأغنية؟")) {
                          send({ action: "DELETE_TRACK", payload: { id: t.id } });
                        }
                      }}
                      className="text-red-400 hover:text-red-200 text-xs px-2 py-1 rounded bg-red-900/30"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            اضغط مطولاً على الأغنية للحذف
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2">
          متصل عبر الشبكة - يمكن استخدامه من أي جهاز يمسح رمز QR
        </p>
      </div>
    </div>
  );
}
