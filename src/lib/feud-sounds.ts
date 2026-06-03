let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

// ===== Custom audio overrides (data URLs from user uploads) =====
export type SoundKey = "ding" | "buzzer" | "win";
const LS_SOUND = (k: SoundKey) => `harat_sound_${k}`;
const cache: Record<SoundKey, HTMLAudioElement | null> = {
  ding: null,
  buzzer: null,
  win: null,
};

export const getCustomSound = (k: SoundKey): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_SOUND(k));
};

export const setCustomSound = (k: SoundKey, dataUrl: string | null) => {
  if (typeof window === "undefined") return;
  if (dataUrl) localStorage.setItem(LS_SOUND(k), dataUrl);
  else localStorage.removeItem(LS_SOUND(k));
  cache[k] = null;
};

const playCustom = (k: SoundKey): boolean => {
  const url = getCustomSound(k);
  if (!url) return false;
  try {
    if (!cache[k]) cache[k] = new Audio(url);
    const a = cache[k]!;
    a.currentTime = 0;
    a.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
};

export const stopAllCustom = () => {
  (Object.keys(cache) as SoundKey[]).forEach((k) => {
    const a = cache[k];
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
  });
};

export const playDing = () => {
  if (playCustom("ding")) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(900, c.currentTime);
  g.gain.setValueAtTime(0.5, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 1.2);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 1.2);
};

export const playBuzzer = () => {
  if (playCustom("buzzer")) return;
  const c = getCtx();
  if (!c) return;
  const oscs = [150, 155, 145].map((f) => {
    const o = c.createOscillator();
    o.type = f === 155 ? "square" : "sawtooth";
    o.frequency.setValueAtTime(f, c.currentTime);
    return o;
  });
  const g = c.createGain();
  oscs.forEach((o) => o.connect(g));
  g.connect(c.destination);
  g.gain.setValueAtTime(0.3, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.8);
  oscs.forEach((o) => {
    o.start(c.currentTime);
    o.stop(c.currentTime + 0.8);
  });
};

export const playWin = () => {
  if (playCustom("win")) return;
  const c = getCtx();
  if (!c) return;
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, c.currentTime + i * 0.12);
    g.gain.setValueAtTime(0.3, c.currentTime + i * 0.12);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + i * 0.12 + 0.3);
    o.start(c.currentTime + i * 0.12);
    o.stop(c.currentTime + i * 0.12 + 0.3);
  });
};
