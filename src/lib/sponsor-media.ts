// Upload/manage the opening ("sponsor") screen media — an image or a video
// that the host can show/hide on the display, from either the host settings
// panel or the mobile controller. Mirrors src/lib/team-photo-upload.ts.

import { createSponsorUploadFn, signSponsorFn, deleteSponsorFn } from "@/lib/feud-api.functions";
import { sessionAuth, withSession } from "@/lib/feud-session";
import { sendMessage } from "@/lib/feud-sync";
import { supabase } from "@/integrations/supabase/client";

const SPONSOR_BUCKET = "feud-music"; // see feud-api.server.ts SPONSOR_BUCKET

export class SponsorMediaError extends Error {}

/** Storage accepts up to 50MB per object for this feature. */
export const MAX_SPONSOR_BYTES = 50 * 1024 * 1024;

type SponsorKind = "image" | "video";
export type SponsorExt = "jpg" | "png" | "webp" | "gif" | "mp4" | "webm" | "mov";

const MIME_MAP: Record<string, { kind: SponsorKind; ext: SponsorExt }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/jpg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "image/gif": { kind: "image", ext: "gif" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/webm": { kind: "video", ext: "webm" },
  "video/quicktime": { kind: "video", ext: "mov" },
  "video/x-m4v": { kind: "video", ext: "mp4" },
};

const EXT_MAP: Record<string, { kind: SponsorKind; ext: SponsorExt }> = {
  jpg: { kind: "image", ext: "jpg" },
  jpeg: { kind: "image", ext: "jpg" },
  png: { kind: "image", ext: "png" },
  webp: { kind: "image", ext: "webp" },
  gif: { kind: "image", ext: "gif" },
  mp4: { kind: "video", ext: "mp4" },
  m4v: { kind: "video", ext: "mp4" },
  webm: { kind: "video", ext: "webm" },
  mov: { kind: "video", ext: "mov" },
};

export type SponsorMediaResult = { kind: SponsorKind; url: string; ext: string };

/** Detect kind/extension from the MIME type, falling back to the file name. */
const detect = (file: File) => {
  const byMime = MIME_MAP[file.type.toLowerCase()];
  if (byMime) return byMime;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MAP[ext];
};

export async function uploadSponsorMedia(file: File): Promise<SponsorMediaResult> {
  const meta = detect(file);
  if (!meta) {
    throw new SponsorMediaError(
      "نوع الملف غير مدعوم. استخدم صورة JPG/PNG/WEBP أو فيديو MP4/WEBM/MOV",
    );
  }
  if (file.size > MAX_SPONSOR_BYTES) {
    throw new SponsorMediaError(
      `حجم الملف ${(file.size / (1024 * 1024)).toFixed(1)} ميجابايت — الحد الأقصى 50 ميجابايت. اضغط الفيديو أو استخدم خيار "رابط خارجي"`,
    );
  }

  let upload: { path: string; token: string } | null = null;
  try {
    upload = await withSession((auth) =>
      createSponsorUploadFn({ data: { ...auth, ext: meta.ext } }),
    );
  } catch (e) {
    throw new SponsorMediaError(
      "تعذّر تجهيز الرفع: " + (e instanceof Error ? e.message : "خطأ غير معروف"),
    );
  }
  if (!upload) throw new SponsorMediaError("تعذّر تجهيز الرفع");

  const contentType = MIME_MAP[file.type.toLowerCase()]
    ? file.type
    : meta.kind === "image"
      ? `image/${meta.ext === "jpg" ? "jpeg" : meta.ext}`
      : `video/${meta.ext === "mov" ? "quicktime" : meta.ext}`;

  const { error } = await supabase.storage
    .from(SPONSOR_BUCKET)
    .uploadToSignedUrl(upload.path, upload.token, file, {
      contentType,
      upsert: true,
    });
  if (error) {
    const msg = /exceeded|too large|maximum/i.test(error.message)
      ? "الملف أكبر من الحد المسموح في التخزين — اضغط الملف أو استخدم خيار \"رابط خارجي\""
      : "فشل رفع الملف: " + error.message;
    throw new SponsorMediaError(msg);
  }

  const signed = await withSession((auth) =>
    signSponsorFn({ data: { ...auth, ext: meta.ext } }),
  );
  if (!signed?.url) throw new SponsorMediaError("تعذّر توليد رابط الملف");
  const url = `${signed.url}&v=${Date.now()}`;

  sendMessage({ action: "SET_SPONSOR_MEDIA", payload: { kind: meta.kind, url, ext: meta.ext } });
  return { kind: meta.kind, url, ext: meta.ext };
}

/**
 * Fallback path: use media hosted elsewhere by pasting its direct URL.
 * Nothing is uploaded; the URL is broadcast to the display as-is.
 */
export function setSponsorMediaUrl(rawUrl: string): SponsorMediaResult {
  const url = rawUrl.trim();
  if (!/^https?:\/\/\S+$/i.test(url)) {
    throw new SponsorMediaError("الرابط غير صحيح — يجب أن يبدأ بـ http:// أو https://");
  }
  const clean = url.split("?")[0]!.toLowerCase();
  const ext = clean.split(".").pop() ?? "";
  const guessed = EXT_MAP[ext];
  const kind: SponsorKind = guessed
    ? guessed.kind
    : /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || /video/i.test(url)
      ? "video"
      : "image";
  // ext stays null so no storage object is deleted when clearing an external URL.
  sendMessage({ action: "SET_SPONSOR_MEDIA", payload: { kind, url, ext: null } });
  return { kind, url, ext: "" };
}

export async function clearSponsorMedia(ext: string | null): Promise<void> {
  if (ext) {
    await withSession((auth) =>
      deleteSponsorFn({ data: { ...auth, ext: ext as SponsorExt } }),
    ).catch(() => null);
  }
  sendMessage({ action: "SET_SPONSOR_MEDIA", payload: { kind: null, url: null, ext: null } });
}
