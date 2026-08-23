// Upload/manage the opening ("sponsor") screen media — an image or a video
// that the host can show/hide on the display, from either the host settings
// panel or the mobile controller. Mirrors src/lib/team-photo-upload.ts.
 
import { createSponsorUploadFn, signSponsorFn, deleteSponsorFn } from "@/lib/feud-api.functions";
import { sessionAuth } from "@/lib/feud-session";
import { sendMessage } from "@/lib/feud-sync";
import { supabase } from "@/integrations/supabase/client";
 
const SPONSOR_BUCKET = "feud-music"; // see feud-api.server.ts SPONSOR_BUCKET
 
export class SponsorMediaError extends Error {}
 
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
const MAX_VIDEO_BYTES = 30 * 1024 * 1024; // 30MB
 
type SponsorKind = "image" | "video";
 
const MIME_MAP: Record<string, { kind: SponsorKind; ext: "jpg" | "png" | "mp4" | "webm" | "mov" }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/jpg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/webm": { kind: "video", ext: "webm" },
  "video/quicktime": { kind: "video", ext: "mov" },
};
 
export type SponsorMediaResult = { kind: SponsorKind; url: string; ext: string };
 
export async function uploadSponsorMedia(file: File): Promise<SponsorMediaResult> {
  const meta = MIME_MAP[file.type];
  if (!meta) {
    throw new SponsorMediaError("نوع الملف غير مدعوم. استخدم صورة JPG/PNG أو فيديو MP4/WEBM");
  }
  const maxBytes = meta.kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new SponsorMediaError(`حجم الملف كبير جداً (الحد الأقصى ${maxMb} ميجابايت)`);
  }
 
  const upload = await createSponsorUploadFn({ data: { ...sessionAuth(), ext: meta.ext } }).catch(
    () => null,
  );
  if (!upload) throw new SponsorMediaError("تعذّر تجهيز الرفع");
 
  const { error } = await supabase.storage
    .from(SPONSOR_BUCKET)
    .uploadToSignedUrl(upload.path, upload.token, file, {
      contentType: file.type,
      upsert: true,
    });
  if (error) throw new SponsorMediaError("فشل رفع الملف: " + error.message);
 
  const signed = await signSponsorFn({ data: { ...sessionAuth(), ext: meta.ext } });
  if (!signed?.url) throw new SponsorMediaError("تعذّر توليد رابط الملف");
  const url = `${signed.url}&v=${Date.now()}`;
 
  sendMessage({ action: "SET_SPONSOR_MEDIA", payload: { kind: meta.kind, url, ext: meta.ext } });
  return { kind: meta.kind, url, ext: meta.ext };
}
 
export async function clearSponsorMedia(ext: string | null): Promise<void> {
  if (ext) {
    await deleteSponsorFn({
      data: { ...sessionAuth(), ext: ext as "jpg" | "png" | "mp4" | "webm" | "mov" },
    }).catch(() => null);
  }
  sendMessage({ action: "SET_SPONSOR_MEDIA", payload: { kind: null, url: null, ext: null } });
}
 
