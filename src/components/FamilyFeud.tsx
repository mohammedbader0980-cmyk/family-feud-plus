import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { premadeCatalogs, emptyQuestion, type Question, type Catalog } from "@/data/catalogs";
import {
  playDing,
  playBuzzer,
  playWin,
  playApplause,
  getCustomSound,
  setCustomSound,
  type SoundKey,
} from "@/lib/feud-sounds";
import {
  idbAddTrack,
  idbDeleteTrack,
  idbGetAllTracks,
} from "@/lib/music-db";
import { sendMessage, subscribe, type SyncMessage } from "@/lib/feud-sync";
import { Typewriter, CountUp, Confetti } from "@/components/feud-fx";
import { getSessionId, getSessionToken, saveSessionState, sessionAuth } from "@/lib/feud-session";
import { deleteMusicFn, listMusicFn } from "@/lib/feud-api.functions";
import { signTeamPhotoUrl } from "@/lib/team-photo-upload";
import {
  uploadTeamPhotoBlob,
  TeamPhotoError,
} from "@/lib/team-photo-upload";
import TeamPhotoCropper from "@/components/TeamPhotoCropper";

type Track = {
  id: string;
  name: string;
  url: string;
  source: "local" | "storage";
  storagePath?: string;
};

const signTeamPhoto = (team: 1 | 2): Promise<string | null> => signTeamPhotoUrl(team);

const loadStorageTracks = async (): Promise<Track[]> => {
  try {
    const { tracks } = await listMusicFn({ data: sessionAuth() });
    return tracks.map((t) => ({
      id: `storage-${t.path}`,
      name: t.name,
      url: t.url,
      source: "storage" as const,
      storagePath: t.path,
    }));
  } catch (e) {
    console.error("[music] storage list failed", e);
    return [];
  }
};


type Screen = "start" | "host" | "game";
type HostTab = "catalog" | "custom";

const LS_QUESTIONS = "familyFeudQuestions";
const LS_TEAM1 = "familyFeudTeam1";
const LS_TEAM2 = "familyFeudTeam2";
const LS_CUSTOM_CATS = "familyFeudCustomCatalogs";

const loadLS = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

export default function FamilyFeud() {
  const [screen, setScreen] = useState<Screen>("start");
  const [hostTab, setHostTab] = useState<HostTab>("catalog");
  const [confirmCat, setConfirmCat] = useState<Catalog | null>(null);

  const [questions, setQuestions] = useState<Question[]>(premadeCatalogs[0].questions);
  const [team1Name, setTeam1Name] = useState<string>("فريق 1");
  const [team2Name, setTeam2Name] = useState<string>("فريق 2");
  const [customCatalogs, setCustomCatalogs] = useState<Catalog[]>([]);
  const [team1Photo, setTeam1Photo] = useState<string | null>(null);
  const [team2Photo, setTeam2Photo] = useState<string | null>(null);
  const [winCelebrate, setWinCelebrate] = useState<1 | 2 | 0>(0);
  const [scoreBump, setScoreBump] = useState<{ t1: number; t2: number }>({ t1: 0, t2: 0 });
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state from localStorage AFTER mount (avoid SSR overwriting)
  useEffect(() => {
    setQuestions(loadLS<Question[]>(LS_QUESTIONS, premadeCatalogs[0].questions));
    setTeam1Name(loadLS<string>(LS_TEAM1, "فريق 1"));
    setTeam2Name(loadLS<string>(LS_TEAM2, "فريق 2"));
    setCustomCatalogs(loadLS<Catalog[]>(LS_CUSTOM_CATS, []));
    setHydrated(true);
    // Load existing team photos from storage
    (async () => {
      const [p1, p2] = await Promise.all([signTeamPhoto(1), signTeamPhoto(2)]);
      if (p1) setTeam1Photo(p1);
      if (p2) setTeam2Photo(p2);
    })();
  }, []);




  // ===== Drag & drop team photo from desktop =====
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoUploadBusy, setPhotoUploadBusy] = useState(false);
  const [cropTeam, setCropTeam] = useState<1 | 2 | null>(null);

  useEffect(() => {
    let depth = 0;
    const hasFile = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types || []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFile(e)) return;
      depth++;
      setIsDraggingFile(true);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFile(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFile(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDraggingFile(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFile(e)) return;
      e.preventDefault();
      depth = 0;
      setIsDraggingFile(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) setPendingPhotoFile(f);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const handlePhotoDropChoice = (team: 1 | 2) => {
    if (!pendingPhotoFile) return;
    setCropTeam(team);
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!pendingPhotoFile || !cropTeam) return;
    const team = cropTeam;
    setPhotoUploadBusy(true);
    try {
      const url = await uploadTeamPhotoBlob(team, blob);
      if (team === 1) setTeam1Photo(url);
      else setTeam2Photo(url);
      setCropTeam(null);
      setPendingPhotoFile(null);
    } catch (e) {
      alert(e instanceof TeamPhotoError ? e.message : "فشل رفع الصورة");
    } finally {
      setPhotoUploadBusy(false);
    }
  };

  const handleCropCancel = () => {
    setCropTeam(null);
  };


  const dragDropOverlay =
    typeof document !== "undefined" && (isDraggingFile || pendingPhotoFile)
      ? createPortal(
          <>
            {isDraggingFile && !pendingPhotoFile && (
              <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-blue-500/20 backdrop-blur-sm">
                <div className="border-4 border-dashed border-white rounded-3xl px-12 py-10 text-white text-3xl font-bold bg-black/40 shadow-2xl">
                  أفلت الصورة لرفعها 📸
                </div>
              </div>
            )}
            {pendingPhotoFile && !cropTeam && (
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
                onClick={() => !photoUploadBusy && setPendingPhotoFile(null)}
                dir="rtl"
              >
                <div
                  className="bg-card border-2 border-blue-500 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-xl font-bold text-center mb-2 text-foreground">
                    تعيين الصورة لأي فريق؟
                  </h3>
                  <p className="text-xs text-center text-muted-foreground mb-4 truncate">
                    {pendingPhotoFile.name}
                  </p>
                  <div className="flex gap-3">
                    <button
                      disabled={photoUploadBusy}
                      onClick={() => handlePhotoDropChoice(1)}
                      className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50"
                    >
                      {team1Name}
                    </button>
                    <button
                      disabled={photoUploadBusy}
                      onClick={() => handlePhotoDropChoice(2)}
                      className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50"
                    >
                      {team2Name}
                    </button>
                  </div>
                  <button
                    disabled={photoUploadBusy}
                    onClick={() => setPendingPhotoFile(null)}
                    className="w-full mt-3 py-2 rounded-xl bg-secondary text-foreground font-bold disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
            {pendingPhotoFile && cropTeam && (
              <TeamPhotoCropper
                file={pendingPhotoFile}
                team={cropTeam}
                teamName={cropTeam === 1 ? team1Name : team2Name}
                busy={photoUploadBusy}
                onCancel={handleCropCancel}
                onConfirm={(blob) => void handleCropConfirm(blob)}
              />
            )}
          </>,
          document.body,
        )
      : null;


  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LS_QUESTIONS, JSON.stringify(questions));
  }, [questions, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LS_TEAM1, JSON.stringify(team1Name));
  }, [team1Name, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LS_TEAM2, JSON.stringify(team2Name));
  }, [team2Name, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LS_CUSTOM_CATS, JSON.stringify(customCatalogs));
  }, [customCatalogs, hydrated]);

  // Music — merged from IndexedDB (local) + Supabase Storage (shared via controller)
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [musicLoop, setMusicLoop] = useState(false);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const currentTrackIndex = useMemo(() => {
    if (!currentTrackId) return 0;
    const i = tracks.findIndex((t) => t.id === currentTrackId);
    return i < 0 ? 0 : i;
  }, [tracks, currentTrackId]);
  const currentTrack = currentTrackIndex;
  const setCurrentTrack = (i: number) => {
    const t = tracks[i];
    if (t) setCurrentTrackId(t.id);
  };

  useEffect(() => {
    if (!musicRef.current) return;
    musicRef.current.volume = musicVolume;
  }, [musicVolume]);

  useEffect(() => {
    if (!musicRef.current || !tracks.length) return;
    if (musicPlaying) {
      musicRef.current.play().catch(() => setMusicPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrackId]);

  const toggleMusic = async () => {
    if (!tracks.length || !musicRef.current) return;
    if (musicPlaying) {
      musicRef.current.pause();
      setMusicPlaying(false);
    } else {
      try {
        if (!currentTrackId && tracks[0]) setCurrentTrackId(tracks[0].id);
        await musicRef.current.play();
        setMusicPlaying(true);
      } catch (e) {
        console.error("music play failed", e);
        alert("لم يتمكن المتصفح من تشغيل الأغنية. تأكد من نقرك على زر التشغيل.");
      }
    }
  };
  const nextTrack = () => {
    if (!tracks.length) return;
    const i = (currentTrackIndex + 1) % tracks.length;
    setCurrentTrackId(tracks[i].id);
  };
  const prevTrack = () => {
    if (!tracks.length) return;
    const i = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackId(tracks[i].id);
  };
  const stopMusic = () => {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current.currentTime = 0;
    }
    setMusicPlaying(false);
  };

  const refreshTracks = async () => {
    const stored = await idbGetAllTracks();
    const local: Track[] = stored.map((s) => ({
      id: `local-${s.id}`,
      name: s.name,
      url: URL.createObjectURL(s.blob),
      source: "local",
    }));
    const remote = await loadStorageTracks();
    setTracks((prev) => {
      prev.forEach((t) => {
        if (t.source === "local") URL.revokeObjectURL(t.url);
      });
      return [...local, ...remote];
    });
  };
  useEffect(() => {
    refreshTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTracks = async (files: FileList) => {
    const added: Track[] = [];
    for (const f of Array.from(files)) {
      try {
        const saved = await idbAddTrack(f);
        added.push({
          id: `local-${saved.id}`,
          name: saved.name,
          url: URL.createObjectURL(saved.blob),
          source: "local",
        });
      } catch (e) {
        console.error("Failed to save track", e);
        alert(`تعذّر حفظ الملف: ${f.name}`);
      }
    }
    if (added.length) setTracks((prev) => [...prev, ...added]);
  };
  const removeTrack = async (idx: number) => {
    const target = tracks[idx];
    if (!target) return;
    try {
      if (target.source === "local") {
        await idbDeleteTrack(target.id.replace(/^local-/, ""));
        URL.revokeObjectURL(target.url);
      } else if (target.source === "storage" && target.storagePath) {
        await supabase.storage.from(MUSIC_BUCKET).remove([target.storagePath]);
      }
    } catch (e) {
      console.error("Failed to delete track", e);
    }
    setTracks((prev) => prev.filter((_, i) => i !== idx));
    if (currentTrackId === target.id) {
      setCurrentTrackId(null);
      setMusicPlaying(false);
    }
  };
  const removeTrackById = async (id: string) => {
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx >= 0) await removeTrack(idx);
  };


  // Custom SFX (ding/buzzer/win) — bump key to force re-render
  const [sfxVersion, setSfxVersion] = useState(0);
  const uploadSfx = (k: SoundKey, file: File) => {
    setCustomSound(k, file);
    setSfxVersion((v) => v + 1);
  };
  const clearSfx = (k: SoundKey) => {
    setCustomSound(k, null);
    setSfxVersion((v) => v + 1);
  };

  // Game state
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [revealed, setRevealed] = useState<boolean[]>(Array(8).fill(false));
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [roundPoints, setRoundPoints] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [showBigX, setShowBigX] = useState(0);
  const [showQuestion, setShowQuestion] = useState(true);

  // Timer
  const [timerDuration, setTimerDuration] = useState(30);
  const [timerSec, setTimerSec] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerRunning && timerSec > 0) {
      timerRef.current = window.setTimeout(() => setTimerSec((s) => s - 1), 1000);
    } else if (timerSec === 0 && timerRunning) {
      setTimerRunning(false);
      playBuzzer();
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [timerRunning, timerSec]);

  const currentQ = useMemo<Question>(
    () =>
      questions[currentQIndex] ?? {
        question: "",
        answers: Array.from({ length: 8 }, () => ({ text: "", points: 0 })),
      },
    [questions, currentQIndex]
  );

  // Actions
  const reveal = (i: number) => {
    if (revealed[i] || !currentQ.answers[i]?.text) return;
    const r = [...revealed];
    r[i] = true;
    setRevealed(r);
    setRoundPoints((p) => p + Number(currentQ.answers[i].points || 0));
    playDing();
  };
  const revealAll = () => {
    const r = currentQ.answers.map((a) => !!a.text);
    setRevealed(r);
    const total = currentQ.answers.reduce(
      (s, a) => s + (a.text ? Number(a.points || 0) : 0),
      0
    );
    setRoundPoints(total);
  };
  const strike = (n: number) => {
    playBuzzer();
    setStrikes(n);
    setShowBigX(n);
    window.setTimeout(() => setShowBigX(0), 1500);
  };
  const award = (team: 1 | 2) => {
    if (roundPoints === 0) return;
    if (team === 1) {
      setTeam1Score((s) => s + roundPoints);
      setScoreBump((b) => ({ ...b, t1: b.t1 + 1 }));
    } else {
      setTeam2Score((s) => s + roundPoints);
      setScoreBump((b) => ({ ...b, t2: b.t2 + 1 }));
    }
    playWin();
    playApplause();
    setWinCelebrate(team);
    window.setTimeout(() => setWinCelebrate(0), 2200);
    setRoundPoints(0);
    setStrikes(0);
  };
  const resetRound = () => {
    setRevealed(Array(8).fill(false));
    setRoundPoints(0);
    setStrikes(0);
    setTimerSec(timerDuration);
    setTimerRunning(false);
  };
  const nextQ = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex((i) => i + 1);
      resetRound();
      setShowQuestion(true);
    }
  };
  const prevQ = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((i) => i - 1);
      resetRound();
      setShowQuestion(true);
    }
  };
  const startGame = () => {
    setCurrentQIndex(0);
    setRevealed(Array(8).fill(false));
    setTeam1Score(0);
    setTeam2Score(0);
    setRoundPoints(0);
    setStrikes(0);
    setTimerSec(timerDuration);
    setTimerRunning(false);
    setShowQuestion(true);
    setScreen("game");
  };

  // ============ Mobile controller sync (BroadcastChannel) ============
  const [showQR, setShowQR] = useState(false);
  const [displayMode, setDisplayMode] = useState(false);

  // Keep latest handlers in a ref so the subscription stays stable.
  const handlersRef = useRef({
    reveal,
    revealAll,
    strike,
    award,
    resetRound,
    nextQ,
    prevQ,
    toggleMusic,
    setTimerRunning,
    setTimerSec,
    setTimerDuration,
    timerDuration,
    setShowQuestion,
    setScreen,
    setTeam1Score,
    setTeam2Score,
    currentQ,
    timerRunning,
    showQuestion,
    nextTrack,
    prevTrack,
    stopMusic,
    setMusicVolume,
    setMusicLoop,
    musicLoop,
    setCurrentTrackId,
    setMusicPlaying,
    removeTrackById,
    refreshTracks,
    tracks,
  });
  useEffect(() => {
    handlersRef.current = {
      reveal,
      revealAll,
      strike,
      award,
      resetRound,
      nextQ,
      prevQ,
      toggleMusic,
      setTimerRunning,
      setTimerSec,
      setTimerDuration,
      timerDuration,
      setShowQuestion,
      setScreen,
      setTeam1Score,
      setTeam2Score,
      currentQ,
      timerRunning,
      showQuestion,
      nextTrack,
      prevTrack,
      stopMusic,
      setMusicVolume,
      setMusicLoop,
      musicLoop,
      setCurrentTrackId,
      setMusicPlaying,
      removeTrackById,
      refreshTracks,
      tracks,
    };
  });

  // Build snapshot once for both broadcast points
  const buildSnapshot = (): import("@/lib/feud-sync").DisplayState["payload"] => {
    const answers = currentQ.answers || [];
    return {
      currentQIndex,
      totalQuestions: questions.length,
      questionText: currentQ.question || "",
      questionHidden: !showQuestion,
      team1Name,
      team2Name,
      team1Score,
      team2Score,
      revealed,
      answerHasText: Array.from({ length: 8 }, (_, i) => !!answers[i]?.text?.trim()),
      answers: Array.from({ length: 8 }, (_, i) => ({
        text: answers[i]?.text ?? "",
        points: Number(answers[i]?.points ?? 0),
      })),
      timerSec,
      timerRunning,
      timerDuration,
      musicPlaying,
      hasMusic: tracks.length > 0,
      musicVolume,
      musicLoop,
      tracks: tracks.map((t) => ({ id: t.id, name: t.name })),
      currentTrackId,
      onGameScreen: screen === "game",
      team1Photo,
      team2Photo,
    };
  };

  // Broadcast state snapshot whenever something the controller shows changes
  useEffect(() => {
    const snap = buildSnapshot();
    sendMessage({ action: "STATE", payload: snap });
    saveSessionState(snap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentQIndex,
    questions.length,
    currentQ,
    showQuestion,
    team1Name,
    team2Name,
    team1Score,
    team2Score,
    revealed,
    timerSec,
    timerRunning,
    timerDuration,
    musicPlaying,
    musicVolume,
    musicLoop,
    tracks,
    currentTrackId,
    screen,
    team1Photo,
    team2Photo,
  ]);

  // Subscribe to controller actions
  useEffect(() => {
    const off = subscribe((msg: SyncMessage) => {
      const h = handlersRef.current;
      switch (msg.action) {
        case "REQUEST_STATE": {
          sendMessage({ action: "STATE", payload: buildSnapshot() });
          break;
        }
        case "REVEAL_ANSWER":
          h.reveal(msg.payload.index);
          break;
        case "REVEAL_ALL":
          h.revealAll();
          break;
        case "HIDE_QUESTION":
          h.setShowQuestion(!h.showQuestion);
          break;
        case "NEXT_QUESTION":
          h.nextQ();
          break;
        case "PREV_QUESTION":
          h.prevQ();
          break;
        case "ADD_X":
          h.strike(msg.payload.count);
          break;
        case "WIN_TEAM":
          h.award(msg.payload.team);
          break;
        case "TOGGLE_MUSIC":
          void h.toggleMusic();
          break;
        case "START_TIMER":
          h.setTimerRunning(!h.timerRunning);
          break;
        case "PAUSE_TIMER":
          h.setTimerRunning(false);
          break;
        case "RESET_TIMER":
          h.setTimerRunning(false);
          h.setTimerSec(h.timerDuration);
          break;
        case "SET_TIMER_DURATION": {
          const secs = Math.max(5, Math.min(600, Math.round(msg.payload.seconds)));
          h.setTimerDuration(secs);
          h.setTimerSec(secs);
          h.setTimerRunning(false);
          break;
        }
        case "RESET_QUESTION":
          h.resetRound();
          break;
        case "UPDATE_SCORE":
          if (msg.payload.team === 1) h.setTeam1Score((s) => s + msg.payload.delta);
          else h.setTeam2Score((s) => s + msg.payload.delta);
          break;
        case "GO_HOME":
          h.setScreen("start");
          break;
        case "PLAY_TRACK": {
          const t = h.tracks.find((x) => x.id === msg.payload.id);
          if (t) {
            h.setCurrentTrackId(t.id);
            // Slight delay so audio src updates first, then auto-play kicks in
            setTimeout(() => {
              const el = (musicRef as React.MutableRefObject<HTMLAudioElement | null>).current;
              if (el) {
                el.play().then(() => h.setMusicPlaying(true)).catch(() => {});
              }
            }, 80);
          }
          break;
        }
        case "PAUSE_MUSIC": {
          const el = (musicRef as React.MutableRefObject<HTMLAudioElement | null>).current;
          if (el) el.pause();
          h.setMusicPlaying(false);
          break;
        }
        case "RESUME_MUSIC": {
          void h.toggleMusic();
          break;
        }
        case "STOP_MUSIC":
          h.stopMusic();
          break;
        case "NEXT_TRACK":
          h.nextTrack();
          break;
        case "PREV_TRACK":
          h.prevTrack();
          break;
        case "SET_VOLUME":
          h.setMusicVolume(Math.max(0, Math.min(1, msg.payload.value)));
          break;
        case "TOGGLE_LOOP":
          h.setMusicLoop(!h.musicLoop);
          break;
        case "DELETE_TRACK":
          void h.removeTrackById(msg.payload.id);
          break;
        case "TRACKS_UPDATED":
          void h.refreshTracks();
          break;
        case "SET_TEAM_PHOTO": {
          const setter = msg.payload.team === 1 ? setTeam1Photo : setTeam2Photo;
          setter(msg.payload.url);
          break;
        }
      }
    });
    return off;
    // We want one stable subscription for the lifetime of the component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Host actions
  const updateQuestionText = (qi: number, v: string) => {
    const q = [...questions];
    q[qi] = { ...q[qi], question: v };
    setQuestions(q);
  };
  const updateAnswer = (qi: number, ai: number, field: "text" | "points", v: string) => {
    const q = [...questions];
    const ans = [...q[qi].answers];
    ans[ai] = { ...ans[ai], [field]: field === "points" ? Number(v) || 0 : v };
    q[qi] = { ...q[qi], answers: ans };
    setQuestions(q);
  };
  const deleteQuestion = (qi: number) => {
    if (questions.length <= 1) return;
    const q = [...questions];
    q.splice(qi, 1);
    setQuestions(q);
  };
  const addQuestion = () => setQuestions([...questions, emptyQuestion()]);
  const useCatalog = (cat: Catalog) => {
    setQuestions(JSON.parse(JSON.stringify(cat.questions)));
    setConfirmCat(null);
    setHostTab("custom");
  };
  const saveAsCustomCatalog = () => {
    const name = window.prompt("اسم المجموعة الجديدة:", `مجموعتي ${customCatalogs.length + 1}`);
    if (!name) return;
    setCustomCatalogs([
      ...customCatalogs,
      { title: name, questions: JSON.parse(JSON.stringify(questions)) },
    ]);
  };
  const deleteCustomCatalog = (idx: number) => {
    if (!window.confirm("حذف هذه المجموعة؟")) return;
    const c = [...customCatalogs];
    c.splice(idx, 1);
    setCustomCatalogs(c);
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "family-feud-questions.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(String(e.target?.result));
        if (Array.isArray(data) && data[0]?.question) {
          setQuestions(data);
        } else {
          alert("ملف غير صالح");
        }
      } catch {
        alert("ملف غير صالح");
      }
    };
    reader.readAsText(file);
  };

  // ============ Screens ============
  if (screen === "start") {
    return (
      <div className="min-h-screen bg-dots-start flex flex-col items-center justify-center p-4" dir="rtl">
        {dragDropOverlay}
        <div className="relative flex flex-col items-center justify-center mb-16 md:scale-125">
          <div className="w-[340px] h-[180px] md:w-[540px] md:h-[270px] bg-gradient-to-b from-[#4774d6] to-[#1d4199] rounded-[100%] border-[4px] md:border-[6px] border-white shadow-[0_0_20px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative z-10 outline outline-4 outline-[#dca34b]">
            <h1 className="logo-text text-[44px] md:text-[78px] leading-[1.1] text-center whitespace-nowrap">
              حارة البطل
            </h1>
            <p
              className="text-[#f2a611] font-black text-sm md:text-xl mt-1 drop-shadow-md"
              style={{ WebkitTextStroke: "1px #592d00" }}
            >
              لعبة العائلات التفاعلية
            </p>
          </div>
        </div>
        <button
          onClick={startGame}
          className="w-full max-w-xs py-3 bg-black text-white rounded-full font-bold text-xl border-2 border-[#1f1f1f] hover:bg-gray-800 transition-colors shadow-2xl mb-4"
        >
          ابدأ اللعبة
        </button>
        <button
          onClick={() => setScreen("host")}
          className="w-full max-w-xs py-2 bg-transparent text-gray-300 rounded-full font-bold text-sm border border-gray-500 hover:text-white hover:border-white transition-colors shadow-xl"
        >
          لوحة التحكم والأسئلة
        </button>
        <p className="mt-8 text-gray-400 text-xs text-center max-w-md">
          {questions.length} سؤال جاهز للعب · {customCatalogs.length} مجموعة محفوظة
        </p>
      </div>
    );
  }

  if (screen === "host") {
    return (
      <div className="min-h-screen bg-host text-white p-4 md:p-8" dir="rtl">
        {dragDropOverlay}
        <div className="max-w-5xl mx-auto flex justify-between items-center mb-6 flex-wrap gap-3">
          <button
            onClick={() => setScreen("start")}
            className="bg-[#1d3d8f] hover:bg-blue-600 text-white font-bold py-2 px-6 rounded shadow-lg"
          >
            ← العودة
          </button>
          <h2 className="text-2xl font-bold text-[#e09633]">الإعدادات والأسئلة</h2>
        </div>

        <div className="max-w-5xl mx-auto flex bg-gray-900 rounded-lg p-1 border border-gray-700 mb-6 shadow-lg">
          <button
            onClick={() => setHostTab("catalog")}
            className={`flex-1 py-3 text-lg font-bold rounded-md transition-colors ${
              hostTab === "catalog" ? "bg-[#1d3d8f] text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            الكتالوج الجاهز
          </button>
          <button
            onClick={() => setHostTab("custom")}
            className={`flex-1 py-3 text-lg font-bold rounded-md transition-colors ${
              hostTab === "custom" ? "bg-[#1e8b3b] text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            أسئلتي الخاصة ({questions.length})
          </button>
        </div>

        {hostTab === "catalog" && (
          <div className="max-w-5xl mx-auto pb-20">
            <h3 className="text-xl font-bold text-white mb-4">المجموعات الجاهزة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {premadeCatalogs.map((cat, idx) => (
                <div
                  key={idx}
                  className="host-card p-6 rounded-xl shadow-xl border-t-4 border-[#4774d6] flex flex-col"
                >
                  <h3 className="text-2xl font-bold text-white mb-2">{cat.title}</h3>
                  <p className="text-gray-400 mb-6 text-sm">
                    يحتوي على {cat.questions.length} أسئلة جاهزة للعب.
                  </p>
                  <button
                    onClick={() => setConfirmCat(cat)}
                    className="mt-auto w-full py-3 bg-[#4774d6] hover:bg-blue-600 rounded-lg font-bold text-white shadow-md transition-transform active:scale-95"
                  >
                    استخدام هذه المجموعة
                  </button>
                </div>
              ))}
            </div>

            {customCatalogs.length > 0 && (
              <>
                <h3 className="text-xl font-bold text-white mb-4">مجموعاتي المحفوظة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customCatalogs.map((cat, idx) => (
                    <div
                      key={idx}
                      className="host-card p-6 rounded-xl shadow-xl border-t-4 border-[#1e8b3b] flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-white">{cat.title}</h3>
                        <button
                          onClick={() => deleteCustomCatalog(idx)}
                          className="text-red-400 hover:text-white text-xs bg-red-900/40 hover:bg-red-700 px-2 py-1 rounded"
                        >
                          حذف
                        </button>
                      </div>
                      <p className="text-gray-400 mb-4 text-sm">{cat.questions.length} أسئلة</p>
                      <button
                        onClick={() => setConfirmCat(cat)}
                        className="mt-auto w-full py-2 bg-[#1e8b3b] hover:bg-green-700 rounded-lg font-bold text-white"
                      >
                        تشغيل
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {hostTab === "custom" && (
          <div className="max-w-5xl mx-auto pb-20">
            <div className="host-card p-4 md:p-6 rounded-xl mb-6 shadow-xl border-t-4 border-[#e09633]">
              <h3 className="text-xl font-bold text-white mb-4">أسماء الفرق</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-gray-400 mb-1 text-sm">الفريق الأول (يمين)</label>
                  <input
                    type="text"
                    value={team1Name}
                    onChange={(e) => setTeam1Name(e.target.value)}
                    className="w-full host-input p-3 rounded font-bold"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-gray-400 mb-1 text-sm">الفريق الثاني (يسار)</label>
                  <input
                    type="text"
                    value={team2Name}
                    onChange={(e) => setTeam2Name(e.target.value)}
                    className="w-full host-input p-3 rounded font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Music library */}
            <div className="host-card p-4 md:p-6 rounded-xl mb-6 shadow-xl border-t-4 border-[#9b5de5]">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-xl font-bold text-white">🎵 مكتبة الأغاني</h3>
                <label className="px-4 py-2 bg-[#9b5de5] hover:bg-purple-600 rounded font-bold text-white text-sm cursor-pointer">
                  + إضافة أغاني
                  <input
                    type="file"
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) addTracks(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <p className="text-gray-400 text-xs mb-3">
                ارفع أغانيك المفضلة، يتم تشغيلها أثناء اللعبة بدل صوت "Family Feud" الافتراضي. (تُحفظ في المتصفح)
              </p>
              {tracks.length === 0 ? (
                <p className="text-gray-500 text-sm italic">لا توجد أغاني بعد.</p>
              ) : (
                <ul className="space-y-2">
                  {tracks.map((t, i) => (
                    <li
                      key={i}
                      className={`flex items-center justify-between gap-2 p-2 rounded border ${
                        i === currentTrack
                          ? "border-[#9b5de5] bg-purple-900/30"
                          : "border-gray-700 bg-gray-900/40"
                      }`}
                    >
                      <button
                        onClick={() => setCurrentTrack(i)}
                        className="flex-1 text-right text-white text-sm truncate"
                      >
                        {i === currentTrack ? "▶ " : ""}
                        {t.name}
                      </button>
                      <button
                        onClick={() => removeTrack(i)}
                        className="text-red-400 hover:text-white text-xs bg-red-900/40 hover:bg-red-700 px-2 py-1 rounded"
                      >
                        حذف
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* SFX overrides */}
            <div className="host-card p-4 md:p-6 rounded-xl mb-6 shadow-xl border-t-4 border-[#ff9900]">
              <h3 className="text-xl font-bold text-white mb-3">🔔 المؤثرات الصوتية</h3>
              <p className="text-gray-400 text-xs mb-4">
                استبدل أصوات اللعبة (الإجابة الصحيحة، الخطأ، الفوز) بأصواتك الخاصة.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3" key={sfxVersion}>
                {(
                  [
                    { k: "ding" as SoundKey, label: "صح ✅" },
                    { k: "buzzer" as SoundKey, label: "خطأ ❌" },
                    { k: "win" as SoundKey, label: "فوز 🏆" },
                  ]
                ).map(({ k, label }) => {
                  const has = !!getCustomSound(k);
                  return (
                    <div key={k} className="bg-gray-900/40 border border-gray-700 rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-bold text-sm">{label}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded ${
                            has ? "bg-green-700 text-white" : "bg-gray-700 text-gray-300"
                          }`}
                        >
                          {has ? "مخصص" : "افتراضي"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <label className="flex-1 text-center px-2 py-1.5 bg-[#1d3d8f] hover:bg-blue-600 rounded font-bold text-white text-xs cursor-pointer">
                          ⬆️ رفع
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadSfx(k, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          onClick={() => k === "ding" ? playDing() : k === "buzzer" ? playBuzzer() : playWin()}
                          className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
                        >
                          ▶
                        </button>
                        {has && (
                          <button
                            onClick={() => clearSfx(k)}
                            className="px-2 py-1.5 bg-red-900/60 hover:bg-red-700 rounded text-white text-xs"
                          >
                            ✖
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>



            <div className="host-card p-4 rounded-xl mb-6 flex flex-wrap gap-2">
              <button
                onClick={saveAsCustomCatalog}
                className="px-4 py-2 bg-[#1e8b3b] hover:bg-green-700 rounded font-bold text-white text-sm"
              >
                💾 حفظ كمجموعة
              </button>
              <button
                onClick={exportJSON}
                className="px-4 py-2 bg-[#1d3d8f] hover:bg-blue-600 rounded font-bold text-white text-sm"
              >
                ⬇️ تصدير JSON
              </button>
              <label className="px-4 py-2 bg-[#1d3d8f] hover:bg-blue-600 rounded font-bold text-white text-sm cursor-pointer">
                ⬆️ استيراد JSON
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importJSON(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {questions.map((q, qi) => (
              <div key={qi} className="host-card p-4 md:p-6 rounded-xl mb-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-[#4774d6]">السؤال {qi + 1}</h3>
                  <button
                    onClick={() => deleteQuestion(qi)}
                    className="text-red-400 hover:text-white font-bold text-sm bg-red-900/40 hover:bg-red-700 px-3 py-1 rounded transition-colors"
                  >
                    حذف
                  </button>
                </div>
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => updateQuestionText(qi, e.target.value)}
                  className="w-full host-input p-4 rounded mb-6 text-lg md:text-xl font-bold text-right"
                  placeholder="اكتب السؤال هنا..."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {q.answers.map((ans, ai) => (
                    <div key={ai} className="flex gap-3 items-center">
                      <span className="text-gray-400 w-6 text-center font-bold">{ai + 1}</span>
                      <input
                        type="text"
                        value={ans.text}
                        onChange={(e) => updateAnswer(qi, ai, "text", e.target.value)}
                        className="flex-1 host-input p-2 rounded text-right font-bold"
                        placeholder={`إجابة ${ai + 1}`}
                      />
                      <input
                        type="number"
                        value={ans.points || ""}
                        onChange={(e) => updateAnswer(qi, ai, "points", e.target.value)}
                        className="w-16 host-input p-2 text-center text-yellow-400 font-bold rounded"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={addQuestion}
              className="w-full py-4 bg-[#1e8b3b] rounded-lg font-bold hover:bg-[#166d2e] text-white text-xl shadow-lg border-2 border-green-400"
            >
              + إضافة سؤال جديد
            </button>
          </div>
        )}

        {confirmCat && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[#131d36] border-2 border-[#e09633] rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
              <h3 className="text-2xl font-bold text-white mb-3">تأكيد الاستبدال</h3>
              <p className="text-gray-300 mb-6 leading-relaxed">
                هل تريد تفعيل <b>"{confirmCat.title}"</b>؟
                <br />
                <span className="text-red-400 font-bold text-sm">
                  سيتم استبدال أسئلتك الحالية.
                </span>
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => useCatalog(confirmCat)}
                  className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold text-white"
                >
                  نعم
                </button>
                <button
                  onClick={() => setConfirmCat(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 py-3 rounded-lg font-bold text-white"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============ Game ============
  return (
    <div className="min-h-screen flex flex-col font-sans overflow-hidden bg-[#051024]" dir="rtl">
      {dragDropOverlay}
      {/* Big timer - top corner so it never covers the logo */}
      <div className="fixed top-[max(0.5rem,env(safe-area-inset-top))] left-2 md:left-4 z-50 pointer-events-none">
        <div
          className={`rounded-full p-[3px] ${timerSec <= 10 && timerRunning ? "timer-warn" : ""}`}
          style={{
            background: `conic-gradient(${
              timerSec <= 10 ? "#ef4444" : "#dca34b"
            } ${Math.max(0, Math.min(1, timerSec / (timerDuration || 1))) * 360}deg, rgba(255,255,255,0.12) 0deg)`,
            borderRadius: "9999px",
            transition: "background 0.4s linear",
          }}
        >
        <div
          className={`rounded-full border-2 md:border-4 shadow-2xl flex items-center gap-[0.4em] transition-colors ${
            timerSec === 0
              ? "bg-red-700/95 border-red-300 animate-pulse"
              : timerRunning
                ? timerSec <= 10
                  ? "bg-[#4d0b0b]/95 border-red-400"
                  : "bg-[#0b1f4d]/95 border-[#dca34b]"
                : "bg-black/70 border-[#3a6bdc]"
          }`}
          style={{
            fontSize: "clamp(0.9rem, min(3.2vw, 3.6vh), 2.4rem)",
            padding: "0.35em 0.9em",
          }}
        >
          <span style={{ fontSize: "0.8em" }}>⏱</span>
          <span
            className="text-white font-bold tabular-nums drop-shadow-lg"
            style={{ letterSpacing: "0.05em", fontSize: "1.5em", lineHeight: 1.1 }}
          >
            {String(Math.floor(timerSec / 60)).padStart(2, "0")}:
            {String(timerSec % 60).padStart(2, "0")}
          </span>
        </div>
        </div>
      </div>
      <div
        className="flex-1 relative flex items-center justify-center p-2 md:p-6"
        style={{
          background:
            "linear-gradient(90deg, #943d00 0%, #943d00 15%, #051024 15%, #051024 85%, #943d00 85%, #943d00 100%)",
        }}
      >
        <div className="board-outer bg-dots-board w-full max-w-[1200px] relative pt-16 pb-8 px-4 md:px-16 md:py-16 flex flex-col items-center justify-center z-10 mt-12 sm:mt-10 md:mt-0">
          {/* Top logo + round points */}
          <div className="absolute -top-12 md:-top-16 flex flex-col items-center z-40 w-full px-2">
            <div className="bg-gradient-to-b from-[#4774d6] to-[#1d4199] rounded-[100%] border-2 md:border-[3px] border-[#dca34b] shadow-xl flex flex-col items-center justify-center w-[min(70vw,17rem)] px-6 py-3 md:py-4">
              <span
                className="logo-text leading-tight text-center whitespace-nowrap"
                style={{ fontSize: "clamp(1.05rem, min(4.2vw, 4.4vh), 2rem)" }}
              >
                حارة البطل
              </span>
            </div>
            <div className="mt-1 bg-gradient-to-b from-[#3a6bdc] to-[#15347a] border-2 border-white rounded-full px-8 md:px-12 py-1 md:py-2 shadow-lg">
              <span className="text-white text-xl md:text-3xl font-bold"><CountUp value={roundPoints} /></span>
            </div>
          </div>


          {/* Team 1 (right) */}
          <div className="absolute -right-6 md:-right-12 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
            <TeamAvatar
              team={1}
              name={team1Name}
              photo={team1Photo}
              winning={team1Score > team2Score}
              bumpKey={scoreBump.t1}
            />
            <div className="side-score w-16 h-20 md:w-28 md:h-32 flex items-center justify-center mt-1">
              <span className="text-white text-3xl md:text-5xl font-bold drop-shadow-md">
                <CountUp value={team1Score} />
              </span>
            </div>
            <button
              onClick={() => {
                const n = window.prompt("اسم الفريق الأول:", team1Name);
                if (n && n.trim()) setTeam1Name(n.trim());
              }}
              title="انقر لتغيير الاسم"
              className="team-badge w-16 md:w-28 py-1 flex items-center justify-center cursor-pointer hover:brightness-125"
            >
              <span className="text-yellow-400 font-bold text-[10px] md:text-sm truncate px-1 text-center w-full">
                {team1Name}
              </span>
            </button>
          </div>

          {/* Team 2 (left) */}
          <div className="absolute -left-6 md:-left-12 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
            <TeamAvatar
              team={2}
              name={team2Name}
              photo={team2Photo}
              winning={team2Score > team1Score}
              bumpKey={scoreBump.t2}
            />
            <div className="side-score w-16 h-20 md:w-28 md:h-32 flex items-center justify-center mt-1">
              <span className="text-white text-3xl md:text-5xl font-bold drop-shadow-md">
                <CountUp value={team2Score} />
              </span>
            </div>
            <button
              onClick={() => {
                const n = window.prompt("اسم الفريق الثاني:", team2Name);
                if (n && n.trim()) setTeam2Name(n.trim());
              }}
              title="انقر لتغيير الاسم"
              className="team-badge w-16 md:w-28 py-1 flex items-center justify-center cursor-pointer hover:brightness-125"
            >
              <span className="text-yellow-400 font-bold text-[10px] md:text-sm truncate px-1 text-center w-full">
                {team2Name}
              </span>
            </button>
          </div>


          {/* Board */}
          <div className="board-inner w-full flex flex-col relative z-20 mt-6 md:mt-4 px-2 py-4 md:p-6">
            {showQuestion && (
              <div className="w-full mb-4 z-30">
                <div
                  key={currentQIndex}
                  className="q-enter bg-gradient-to-r from-[#000] via-[#1a1a1a] to-[#000] border-2 border-[#e09633] text-white text-center p-3 md:p-5 rounded-lg shadow-[0_5px_15px_rgba(0,0,0,0.8)] mx-auto w-[98%]"
                >
                  <h2
                    className="text-lg md:text-3xl font-black leading-relaxed min-h-[1.6em]"
                    style={{ textShadow: "2px 2px 4px #000" }}
                  >
                    <Typewriter text={currentQ.question || "انتهت الأسئلة!"} />
                  </h2>
                  <p className="text-gray-400 text-xs md:text-sm mt-2">
                    سؤال {currentQIndex + 1} من {questions.length}
                  </p>
                </div>
              </div>
            )}
            <div className="w-full flex flex-col md:flex-row gap-2 md:gap-4">
              <div className="flex-1 flex flex-col gap-2 md:gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <AnswerRow
                    key={i}
                    index={i}
                    answer={currentQ.answers[i]}
                    isRevealed={revealed[i]}
                    onClick={() => reveal(i)}
                  />
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-2 md:gap-3">
                {[4, 5, 6, 7].map((i) => (
                  <AnswerRow
                    key={i}
                    index={i}
                    answer={currentQ.answers[i]}
                    isRevealed={revealed[i]}
                    onClick={() => reveal(i)}
                  />
                ))}
              </div>
            </div>

            {strikes > 0 && (
              <div className="flex gap-2 justify-center mt-4">
                {Array.from({ length: strikes }).map((_, i) => (
                  <span key={i} className="text-red-500 text-2xl md:text-4xl font-black">
                    ✖
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control bar */}
      {!displayMode && (
      <div className="feud-controls bg-black border-t-2 border-gray-800 flex justify-between items-center px-2 py-2 md:px-6 md:py-3 text-gray-300 text-xs md:text-sm overflow-x-auto gap-2">
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setScreen("start")}
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 hover:text-white font-bold"
          >
            🏠
          </button>
          <button
            onClick={() => setDisplayMode(true)}
            className="px-3 py-2 bg-amber-900/60 rounded border border-amber-600 hover:bg-amber-800 text-amber-200 font-bold whitespace-nowrap"
            title="إخفاء شريط التحكم للعرض على الشاشة"
          >
            🖥 وضع العرض
          </button>
          <button
            onClick={() => setShowQuestion(!showQuestion)}
            className={`px-3 py-2 rounded border font-bold ${
              showQuestion
                ? "bg-green-900 border-green-600 text-white"
                : "bg-gray-900 border-gray-700 hover:text-white"
            }`}
          >
            {showQuestion ? "إخفاء السؤال" : "عرض السؤال"}
          </button>
          <button
            onClick={revealAll}
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 hover:text-white font-bold"
          >
            كشف الكل
          </button>
          <button
            onClick={() => setScreen("host")}
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 hover:text-white font-bold"
          >
            ⚙️
          </button>
          <button
            onClick={prevQ}
            disabled={currentQIndex === 0}
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 hover:text-white font-bold disabled:opacity-40"
          >
            « السابق
          </button>
          <button
            onClick={nextQ}
            disabled={currentQIndex >= questions.length - 1}
            className="px-3 py-2 bg-[#1d3d8f] text-white rounded border border-blue-600 shadow-md font-bold disabled:opacity-40"
          >
            التالي »
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className="px-3 py-2 bg-[#1a1a1a] rounded-full border border-[#333] text-gold font-bold min-w-[80px]"
          >
            ⏱ {timerSec}s
          </button>
          <button
            onClick={() => {
              setTimerSec(timerDuration);
              setTimerRunning(false);
            }}
            className="px-2 py-2 bg-gray-900 rounded border border-gray-700 text-xs"
          >
            ↺
          </button>
        </div>

        {/* Music controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={toggleMusic}
            disabled={!tracks.length}
            title={tracks.length ? tracks[currentTrack]?.name : "أضف أغاني من الإعدادات"}
            className="px-3 py-2 bg-purple-900/60 rounded border border-purple-700 hover:bg-purple-800 text-white font-bold disabled:opacity-40"
          >
            {musicPlaying ? "⏸" : "🎵"}
          </button>
          {tracks.length > 1 && (
            <button
              onClick={nextTrack}
              className="px-2 py-2 bg-gray-900 rounded border border-gray-700 text-white text-xs"
            >
              ⏭
            </button>
          )}
        </div>

        <div className="flex gap-3 items-center flex-shrink-0">
          <div className="flex bg-gray-900 rounded border border-gray-700 overflow-hidden">
            <button
              onClick={() => award(1)}
              className="px-3 py-2 hover:bg-gray-800 border-l border-gray-700 text-yellow-500 font-bold whitespace-nowrap truncate max-w-[100px]"
            >
              فوز {team1Name}
            </button>
            <button
              onClick={() => award(2)}
              className="px-3 py-2 hover:bg-gray-800 text-yellow-500 font-bold whitespace-nowrap truncate max-w-[100px]"
            >
              فوز {team2Name}
            </button>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => strike(n)}
                className="text-red-500 hover:text-red-300 font-black px-3 py-2 bg-[#1a0000] rounded border border-red-900"
              >
                {"X".repeat(n)}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Exit display-mode button (only visible when in display mode) */}
      {displayMode && (
        <button
          onClick={() => setDisplayMode(false)}
          className="fixed bottom-3 right-3 z-40 bg-black/30 hover:bg-black/60 text-white/70 hover:text-white text-xs px-3 py-2 rounded-full border border-white/20 backdrop-blur-sm"
          title="إظهار شريط التحكم"
        >
          ⚙
        </button>
      )}

      {showBigX > 0 && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 pointer-events-none">
          <div className="flex gap-4 md:gap-8 animate-pop">
            {Array.from({ length: showBigX }).map((_, i) => (
              <div key={i} className="big-x-frame w-32 h-32 md:w-64 md:h-64">
                <span className="big-x-text">X</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {winCelebrate > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 pointer-events-none animate-fade-in">
          <Confetti />
          <div className="animate-scale-in">
            <TeamAvatar
              team={winCelebrate as 1 | 2}
              name={winCelebrate === 1 ? team1Name : team2Name}
              photo={winCelebrate === 1 ? team1Photo : team2Photo}
              winning
              bumpKey={0}
              giant
            />
          </div>
          <div className="win-pulse mt-6 text-5xl md:text-7xl font-black text-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
            🏆 {winCelebrate === 1 ? team1Name : team2Name}
          </div>
        </div>
      )}

      {/* Hidden audio element for background music */}
      {tracks.length > 0 && (
        <audio
          ref={musicRef}
          src={tracks[currentTrack]?.url}
          onEnded={nextTrack}
          loop={musicLoop || tracks.length === 1}
        />
      )}

      {/* Floating mobile controller QR button */}
      {!displayMode && (
        <button
          onClick={() => setShowQR(true)}
          className="fixed bottom-16 left-3 md:bottom-4 md:left-4 z-40 bg-purple-700/60 hover:bg-purple-600 backdrop-blur-sm text-white/90 hover:text-white font-bold w-11 h-11 rounded-full shadow-lg border border-purple-300/40 text-lg flex items-center justify-center"
          title="فتح وحدة تحكم الجوال (مسح QR)"
        >
          📱
        </button>
      )}

      {showQR && <QRModal onClose={() => setShowQR(false)} />}
    </div>
  );
}

function QRModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("/controller");
  useEffect(() => {
    setUrl(`${window.location.origin}/controller?session=${getSessionId()}`);
  }, []);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-2 text-white">وحدة تحكم الجوال</h3>
        <p className="text-xs text-gray-400 mb-4">
          امسح الرمز بالجوال لفتح وحدة التحكم — بدون تسجيل دخول
        </p>
        <div className="bg-white p-3 rounded-xl inline-block mb-4">
          <img src={qrSrc} alt="QR" width={220} height={220} />
        </div>
        <div className="flex gap-2 mb-3">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 bg-gray-900 border border-gray-700 text-white text-xs p-2 rounded font-mono"
          />
          <button
            onClick={copy}
            className="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-bold"
          >
            {copied ? "تم" : "نسخ"}
          </button>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
}

function AnswerRow({
  index,
  answer,
  isRevealed,
  onClick,
}: {
  index: number;
  answer: { text: string; points: number } | undefined;
  isRevealed: boolean;
  onClick: () => void;
}) {
  const hasText = !!answer?.text?.trim();
  if (!hasText) {
    return (
      <div className="flex-1 slot-bg rounded flex items-center justify-center w-full min-h-[50px] md:min-h-[65px] opacity-50" />
    );
  }
  return (
    <div
      onClick={onClick}
      className={`slot-perspective press-fx flex-1 rounded flex overflow-hidden w-full min-h-[50px] md:min-h-[65px] cursor-pointer hover:scale-[1.01] ${
        isRevealed ? "slot-revealed slot-flip" : "slot-bg"
      }`}
    >
      {isRevealed ? (
        <>
          <div
            className="flex-1 flex items-center justify-start px-3 md:px-5 text-white font-black text-lg md:text-3xl text-right truncate"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.9)" }}
          >
            {answer!.text}
          </div>
          <div
            className="score-box w-16 md:w-20 flex items-center justify-center text-white font-black text-xl md:text-3xl"
            style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.9)" }}
          >
            {answer!.points || 0}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-10 md:w-20 md:h-14 bg-gradient-to-b from-[#113280] to-[#0a1f52] border border-[#3a6bdc] rounded-[50%] flex items-center justify-center text-white text-xl md:text-3xl font-bold shadow-[inset_0_0_15px_rgba(0,0,0,0.9)]">
            {index + 1}
          </div>
        </div>
      )}
    </div>
  );
}

export function TeamAvatar({
  team,
  name,
  photo,
  winning,
  bumpKey,
  giant = false,
}: {
  team: 1 | 2;
  name: string;
  photo: string | null;
  winning?: boolean;
  bumpKey: number;
  giant?: boolean;
}) {
  const sizeCls = giant
    ? "w-56 h-56 md:w-72 md:h-72 text-7xl md:text-8xl border-8"
    : "w-14 h-14 md:w-20 md:h-20 text-2xl md:text-3xl border-4";
  const placeholderBg = team === 1 ? "bg-blue-600" : "bg-red-600";
  const numeral = team === 1 ? "١" : "٢";
  const glow = winning
    ? "ring-4 ring-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.85)] border-amber-300"
    : "border-white/70";
  return (
    <div
      key={bumpKey}
      className={`${sizeCls} ${glow} rounded-full overflow-hidden flex items-center justify-center font-black text-white shadow-lg ${
        bumpKey ? "animate-bounce" : ""
      } ${bumpKey ? "avatar-burst" : ""} ${photo ? "bg-black" : placeholderBg}`}
      style={{ animationIterationCount: 2, animationDuration: "0.6s" }}
      title={name}
    >
      {photo ? (
        <img
          src={photo}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span style={{ textShadow: "2px 2px 4px rgba(0,0,0,0.6)" }}>{numeral}</span>
      )}
    </div>
  );
}
