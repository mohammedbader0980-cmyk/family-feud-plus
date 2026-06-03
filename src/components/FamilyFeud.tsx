import { useEffect, useMemo, useRef, useState } from "react";
import { premadeCatalogs, emptyQuestion, type Question, type Catalog } from "@/data/catalogs";
import {
  playDing,
  playBuzzer,
  playWin,
  getCustomSound,
  setCustomSound,
  type SoundKey,
} from "@/lib/feud-sounds";

const LS_MUSIC = "harat_music_tracks"; // [{name, url(dataUrl)}]
type Track = { name: string; url: string };

const fileToDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(f);
  });

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

  const [questions, setQuestions] = useState<Question[]>(() =>
    loadLS<Question[]>(LS_QUESTIONS, premadeCatalogs[0].questions)
  );
  const [team1Name, setTeam1Name] = useState<string>(() => loadLS<string>(LS_TEAM1, "فريق 1"));
  const [team2Name, setTeam2Name] = useState<string>(() => loadLS<string>(LS_TEAM2, "فريق 2"));
  const [customCatalogs, setCustomCatalogs] = useState<Catalog[]>(() =>
    loadLS<Catalog[]>(LS_CUSTOM_CATS, [])
  );

  useEffect(() => {
    localStorage.setItem(LS_QUESTIONS, JSON.stringify(questions));
  }, [questions]);
  useEffect(() => {
    localStorage.setItem(LS_TEAM1, JSON.stringify(team1Name));
  }, [team1Name]);
  useEffect(() => {
    localStorage.setItem(LS_TEAM2, JSON.stringify(team2Name));
  }, [team2Name]);
  useEffect(() => {
    localStorage.setItem(LS_CUSTOM_CATS, JSON.stringify(customCatalogs));
  }, [customCatalogs]);

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
    if (team === 1) setTeam1Score((s) => s + roundPoints);
    else setTeam2Score((s) => s + roundPoints);
    playWin();
    setRoundPoints(0);
    setStrikes(0);
  };
  const resetRound = () => {
    setRevealed(Array(8).fill(false));
    setRoundPoints(0);
    setStrikes(0);
    setTimerSec(30);
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
    setTimerSec(30);
    setTimerRunning(false);
    setShowQuestion(true);
    setScreen("game");
  };

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
        <div className="relative flex flex-col items-center justify-center mb-16 md:scale-125">
          <div className="w-[320px] h-[160px] md:w-[500px] md:h-[250px] bg-gradient-to-b from-[#4774d6] to-[#1d4199] rounded-[100%] border-[4px] md:border-[6px] border-white shadow-[0_0_20px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center relative z-10 outline outline-4 outline-[#dca34b]">
            <h1 className="logo-text text-[50px] md:text-[75px] leading-[0.9] text-center mt-2 md:mt-4">
              FAMILY
              <br />
              FEUD
            </h1>
            <p
              className="text-[#f2a611] font-black text-sm md:text-xl mt-1 drop-shadow-md"
              style={{ WebkitTextStroke: "1px #592d00" }}
            >
              صراع العائلات
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
      <div
        className="flex-1 relative flex items-center justify-center p-2 md:p-6"
        style={{
          background:
            "linear-gradient(90deg, #943d00 0%, #943d00 15%, #051024 15%, #051024 85%, #943d00 85%, #943d00 100%)",
        }}
      >
        <div className="board-outer bg-dots-board w-full max-w-[1200px] relative pt-16 pb-8 px-4 md:px-16 md:py-16 flex flex-col items-center justify-center z-10 mt-8 md:mt-0">
          {/* Top logo + round points */}
          <div className="absolute -top-12 md:-top-16 flex flex-col items-center z-30">
            <div className="w-40 h-20 md:w-56 md:h-24 bg-gradient-to-b from-[#4774d6] to-[#1d4199] rounded-[100%] border-2 md:border-[3px] border-[#dca34b] shadow-xl flex flex-col items-center justify-center">
              <span className="logo-text text-base md:text-2xl leading-tight text-center">
                FAMILY
                <br />
                FEUD
              </span>
            </div>
            <div className="mt-1 bg-gradient-to-b from-[#3a6bdc] to-[#15347a] border-2 border-white rounded-full px-8 md:px-12 py-1 md:py-2 shadow-lg">
              <span className="text-white text-xl md:text-3xl font-bold">{roundPoints}</span>
            </div>
          </div>

          {/* Team 1 (right) */}
          <div className="absolute -right-6 md:-right-12 top-1/2 -translate-y-1/2 z-30 flex flex-col">
            <div className="side-score w-16 h-20 md:w-28 md:h-32 flex items-center justify-center">
              <span className="text-white text-3xl md:text-5xl font-bold drop-shadow-md">
                {team1Score}
              </span>
            </div>
            <div className="team-badge w-16 md:w-28 py-1 flex items-center justify-center">
              <span className="text-yellow-400 font-bold text-[10px] md:text-sm truncate px-1 text-center w-full">
                {team1Name}
              </span>
            </div>
          </div>

          {/* Team 2 (left) */}
          <div className="absolute -left-6 md:-left-12 top-1/2 -translate-y-1/2 z-30 flex flex-col">
            <div className="side-score w-16 h-20 md:w-28 md:h-32 flex items-center justify-center">
              <span className="text-white text-3xl md:text-5xl font-bold drop-shadow-md">
                {team2Score}
              </span>
            </div>
            <div className="team-badge w-16 md:w-28 py-1 flex items-center justify-center">
              <span className="text-yellow-400 font-bold text-[10px] md:text-sm truncate px-1 text-center w-full">
                {team2Name}
              </span>
            </div>
          </div>

          {/* Board */}
          <div className="board-inner w-full flex flex-col relative z-20 mt-6 md:mt-4 px-2 py-4 md:p-6">
            {showQuestion && (
              <div className="w-full mb-4 z-30">
                <div className="bg-gradient-to-r from-[#000] via-[#1a1a1a] to-[#000] border-2 border-[#e09633] text-white text-center p-3 md:p-5 rounded-lg shadow-[0_5px_15px_rgba(0,0,0,0.8)] mx-auto w-[98%]">
                  <h2
                    className="text-lg md:text-3xl font-black leading-relaxed"
                    style={{ textShadow: "2px 2px 4px #000" }}
                  >
                    {currentQ.question || "انتهت الأسئلة!"}
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
      <div className="bg-black border-t-2 border-gray-800 flex justify-between items-center px-2 py-2 md:px-6 md:py-3 text-gray-300 text-xs md:text-sm overflow-x-auto gap-2">
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setScreen("start")}
            className="px-3 py-2 bg-gray-900 rounded border border-gray-700 hover:text-white font-bold"
          >
            🏠
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
              setTimerSec(30);
              setTimerRunning(false);
            }}
            className="px-2 py-2 bg-gray-900 rounded border border-gray-700 text-xs"
          >
            ↺
          </button>
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
      className={`flex-1 rounded flex overflow-hidden w-full min-h-[50px] md:min-h-[65px] cursor-pointer transition-transform hover:scale-[1.01] ${
        isRevealed ? "slot-revealed" : "slot-bg"
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
