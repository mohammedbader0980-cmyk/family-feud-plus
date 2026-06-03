let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};

// ===== Custom audio overrides (in-memory object URLs) =====
export type SoundKey = "ding" | "buzzer" | "win";
type SfxEntry = { url: string; name: string };
const sfxStore: Record<SoundKey, SfxEntry | null> = {
  ding: null,
  buzzer: null,
  win: null,
};
const cache: Record<SoundKey, HTMLAudioElement | null> = {
  ding: null,
  buzzer: null,
  win: null,
};

export const getCustomSound = (k: SoundKey): SfxEntry | null => sfxStore[k];

export const setCustomSound = (k: SoundKey, file: File | null) => {
  // Revoke previous
  const prev = sfxStore[k];
  if (prev) URL.revokeObjectURL(prev.url);
  cache[k] = null;
  if (file) {
    sfxStore[k] = { url: URL.createObjectURL(file), name: file.name };
  } else {
    sfxStore[k] = null;
  }
};

const playCustom = (k: SoundKey): boolean => {
  const entry = sfxStore[k];
  if (!entry) return false;
  try {
    if (!cache[k]) cache[k] = new Audio(entry.url);
    const a = cache[k]!;
    a.currentTime = 0;
    void a.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
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
