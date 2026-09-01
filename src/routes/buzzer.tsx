import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { sendMessage, subscribe, type SyncMessage } from "@/lib/feud-sync";

export const Route = createFileRoute("/buzzer")({
  head: () => ({
    meta: [
      { title: "جرس الفريق - حارة البطل" },
      { name: "description", content: "جرس التنافس السريع للفرق في لعبة حارة البطل" },
      { property: "og:title", content: "جرس الفريق - حارة البطل" },
      { property: "og:description", content: "اضغط الجرس أسرع من الفريق الآخر" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
    ],
  }),
  component: BuzzerPage,
});

const TEAM_COLOR: Record<1 | 2, string> = { 1: "#1d4ed8", 2: "#b91c1c" };

function BuzzerPage() {
  const [team, setTeam] = useState<1 | 2 | null | "pending">("pending");
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("team");
    setTeam(raw === "1" ? 1 : raw === "2" ? 2 : null);
  }, []);

  useEffect(() => {
    if (team !== 1 && team !== 2) return;
    const off = subscribe((msg: SyncMessage) => {
      if (msg.action !== "STATE") return;
      setWinner(msg.payload.buzzWinner ?? null);
      if (msg.payload.buzzWinner === null) setPressed(false);
    });
    sendMessage({ action: "REQUEST_STATE" });
    return off;
  }, [team]);

  if (team === "pending") return <div className="min-h-screen bg-black" />;

  if (team !== 1 && team !== 2) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-dots-start flex items-center justify-center p-6 text-center"
      >
        <p className="text-white text-xl font-bold leading-relaxed">
          رابط غير صالح — امسح رمز QR من الشاشة
        </p>
      </div>
    );
  }

  const mine = winner === team;
  const other = winner !== null && winner !== team;
  const color = TEAM_COLOR[team];

  const buzz = () => {
    if (winner !== null) return;
    setPressed(true);
    sendMessage({ action: "BUZZ", payload: { team } });
    try {
      if (navigator.vibrate) navigator.vibrate(60);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center select-none overflow-hidden transition-colors duration-200"
      style={{ background: mine ? color : "#05091a" }}
    >
      <button
        type="button"
        onPointerDown={buzz}
        disabled={other}
        aria-label={`جرس فريق ${team}`}
        className="relative flex items-center justify-center rounded-3xl active:scale-[0.97] transition-transform"
        style={{
          width: "min(88vw, 78vh)",
          height: "min(88vw, 78vh)",
          background: "linear-gradient(160deg, #23262f 0%, #0b0d13 100%)",
          border: "6px solid #000",
          boxShadow: mine
            ? `0 0 70px 18px ${color}, inset 0 0 30px rgba(0,0,0,0.9)`
            : "0 18px 40px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.9)",
          opacity: other ? 0.45 : 1,
        }}
      >
        <span
          className="rounded-full flex items-center justify-center"
          style={{
            width: "80%",
            height: "80%",
            background: other
              ? "radial-gradient(circle at 35% 28%, #6b7280 0%, #3f434c 55%, #23262c 100%)"
              : "radial-gradient(circle at 35% 28%, #ff6b6b 0%, #d61f26 45%, #7a0d12 100%)",
            border: "8px solid rgba(0,0,0,0.7)",
            boxShadow: mine
              ? `0 0 60px 12px ${color}, inset 0 -18px 40px rgba(0,0,0,0.6), inset 0 18px 40px rgba(255,255,255,0.25)`
              : "inset 0 -18px 40px rgba(0,0,0,0.6), inset 0 18px 40px rgba(255,255,255,0.2)",
            filter: other ? "grayscale(0.8) brightness(0.6)" : "none",
          }}
        >
          <span
            className="logo-text text-center whitespace-nowrap leading-tight"
            style={{ fontSize: "clamp(1.4rem, min(11vw, 10vh), 4.5rem)" }}
          >
            حارة البطل
          </span>
        </span>
      </button>

      <div className="mt-6 h-16 flex items-center justify-center px-4 text-center">
        {mine ? (
          <span className="text-white font-black win-pulse" style={{ fontSize: "clamp(2rem, 12vw, 5rem)" }}>
            سبقت!
          </span>
        ) : other ? (
          <span className="text-gray-400 font-bold text-2xl">الفريق الآخر أسبق</span>
        ) : (
          <span className="text-gray-300 font-bold text-xl">
            {pressed ? "..." : `اضغط الجرس — فريق ${team}`}
          </span>
        )}
      </div>
    </div>
  );
}
