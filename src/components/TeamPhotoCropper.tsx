import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const OUTPUT_SIZE = 512;
const DISPLAY_SIZE = 280;

type Props = {
  file: File;
  team: 1 | 2;
  teamName: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

export default function TeamPhotoCropper({
  file,
  team,
  teamName,
  busy = false,
  onCancel,
  onConfirm,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  // image coords (natural px) shown at container center
  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Validate + load
  useEffect(() => {
    if (!/^image\/(jpe?g|png)$/i.test(file.type)) {
      setError("الصورة يجب أن تكون JPG أو PNG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("حجم الصورة يجب أن يكون أقل من 2 ميجابايت");
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setCx(im.naturalWidth / 2);
      setCy(im.naturalHeight / 2);
      setZoom(1);
    };
    im.onerror = () => setError("تعذّر قراءة الصورة");
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // baseScale = makes the image's shorter side fill the display square
  const baseScale = useMemo(() => {
    if (!img) return 1;
    return DISPLAY_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
  }, [img]);

  const renderedScale = baseScale * zoom;

  // Clamp center so crop square stays inside image
  const clamp = (vx: number, vy: number, z: number) => {
    if (!img) return { x: vx, y: vy };
    const half = DISPLAY_SIZE / 2 / (baseScale * z); // half crop size in natural px
    const x = Math.min(Math.max(vx, half), img.naturalWidth - half);
    const y = Math.min(Math.max(vy, half), img.naturalHeight - half);
    return { x, y };
  };

  useEffect(() => {
    if (!img) return;
    const { x, y } = clamp(cx, cy, zoom);
    if (x !== cx) setCx(x);
    if (y !== cy) setCy(y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, img]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!img) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !img) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    const nx = cx - dx / renderedScale;
    const ny = cy - dy / renderedScale;
    const c = clamp(nx, ny, zoom);
    setCx(c.x);
    setCy(c.y);
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = () => {
    if (!img) return;
    const cropNatural = DISPLAY_SIZE / renderedScale;
    const sx = cx - cropNatural / 2;
    const sy = cy - cropNatural / 2;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("تعذّر تجهيز الرسم");
      return;
    }
    ctx.drawImage(img, sx, sy, cropNatural, cropNatural, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    canvas.toBlob(
      (b) => {
        if (!b) {
          setError("تعذّر تحويل الصورة");
          return;
        }
        onConfirm(b);
      },
      "image/jpeg",
      0.9,
    );
  };

  if (typeof document === "undefined") return null;

  const imgLeft = img ? DISPLAY_SIZE / 2 - cx * renderedScale : 0;
  const imgTop = img ? DISPLAY_SIZE / 2 - cy * renderedScale : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4"
      onClick={() => !busy && onCancel()}
      dir="rtl"
    >
      <div
        className="bg-card border-2 border-blue-500 rounded-2xl p-5 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-center mb-1 text-foreground">
          قص صورة {teamName}
        </h3>
        <p className="text-[11px] text-center text-muted-foreground mb-3">
          اسحب لتحريك الصورة · استخدم الشريط للتكبير
        </p>

        {error ? (
          <div className="text-center text-red-400 text-sm py-6">{error}</div>
        ) : (
          <>
            <div className="flex justify-center mb-3">
              <div
                className="relative overflow-hidden rounded-full border-4 border-white/80 bg-black touch-none select-none cursor-grab active:cursor-grabbing"
                style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {src && img && (
                  <img
                    src={src}
                    alt=""
                    draggable={false}
                    style={{
                      position: "absolute",
                      left: imgLeft,
                      top: imgTop,
                      width: img.naturalWidth * renderedScale,
                      height: img.naturalHeight * renderedScale,
                      maxWidth: "none",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground">تكبير</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-blue-500"
                disabled={busy || !img}
              />
              <span className="text-xs tabular-nums w-10 text-center">
                {zoom.toFixed(1)}x
              </span>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-bold disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            disabled={busy || !!error || !img}
            onClick={handleConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50 ${
              team === 1 ? "bg-blue-600 hover:bg-blue-500" : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {busy ? "جارٍ الرفع..." : "رفع الصورة"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
