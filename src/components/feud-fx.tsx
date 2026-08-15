import { useEffect, useMemo, useRef, useState } from "react";

/** Typewriter text — reveals characters progressively when `text` changes. */
export function Typewriter({ text, speed = 28 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (typeof window === "undefined") {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);
  const done = shown.length >= text.length;
  return (
    <>
      {shown}
      {!done && <span className="caret">&nbsp;</span>}
    </>
  );
}

/** Animated count-up number. */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  useEffect(() => {
    fromRef.current = display;
  });
  return <>{display}</>;
}

const COLORS = ["#f2c14e", "#ffed99", "#3a6bdc", "#8fb6ff", "#e09633", "#ffffff"];

/** Lightweight CSS confetti (no libraries). */
export function Confetti({ count = 36 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        i,
        left: Math.random() * 100,
        dx: `${(Math.random() - 0.5) * 200}px`,
        delay: Math.random() * 1.2,
        dur: 2.2 + Math.random() * 1.8,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 7,
        h: 10 + Math.random() * 12,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-40" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ["--dx" as string]: p.dx,
          }}
        />
      ))}
    </div>
  );
}
