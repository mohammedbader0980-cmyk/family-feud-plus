import { createPhotoUploadFn, deletePhotoFn, signPhotoFn } from "@/lib/feud-api.functions";
import { sessionAuth, withSession } from "@/lib/feud-session";
import { sendMessage } from "@/lib/feud-sync";
import { supabase } from "@/integrations/supabase/client";

const PHOTO_BUCKET = "team-photos";

export class TeamPhotoError extends Error {}

export const cropToSquareJpeg = (file: File): Promise<Blob> =>
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
        if (!ctx) return reject(new TeamPhotoError("تعذّر تجهيز الرسم"));
        ctx.drawImage(img, sx, sy, size, size, 0, 0, target, target);
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new TeamPhotoError("تعذّر تحويل الصورة"))),
          "image/jpeg",
          0.9,
        );
      };
      img.onerror = () => reject(new TeamPhotoError("تعذّر قراءة الصورة"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new TeamPhotoError("تعذّر قراءة الملف"));
    reader.readAsDataURL(file);
  });

/** Signed URL for a team's photo, or null when there is none. */
export async function signTeamPhotoUrl(team: 1 | 2): Promise<string | null> {
  try {
    const { url } = await withSession((auth) => signPhotoFn({ data: { ...auth, team } }));
    return url ?? null;
  } catch {
    return null;
  }
}

async function putTeamPhoto(team: 1 | 2, blob: Blob): Promise<string> {
  const upload = await withSession((auth) =>
    createPhotoUploadFn({ data: { ...auth, team } }),
  ).catch(() => null);
  if (!upload) throw new TeamPhotoError("تعذّر تجهيز الرفع");
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .uploadToSignedUrl(upload.path, upload.token, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (error) throw new TeamPhotoError("تعذّر رفع الصورة: " + error.message);
  const signed = await signTeamPhotoUrl(team);
  if (!signed) throw new TeamPhotoError("تعذّر توليد رابط الصورة");
  const url = `${signed}&v=${Date.now()}`;
  sendMessage({ action: "SET_TEAM_PHOTO", payload: { team, url } });
  return url;
}

export async function uploadTeamPhoto(team: 1 | 2, file: File): Promise<string> {
  if (!/^image\/(jpe?g|png)$/i.test(file.type)) {
    throw new TeamPhotoError("الصورة يجب أن تكون JPG أو PNG");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new TeamPhotoError("حجم الصورة يجب أن يكون أقل من 2 ميجابايت");
  }
  const cropped = await cropToSquareJpeg(file);
  return putTeamPhoto(team, cropped);
}

export async function uploadTeamPhotoBlob(team: 1 | 2, blob: Blob): Promise<string> {
  if (blob.size > 4 * 1024 * 1024) {
    throw new TeamPhotoError("الصورة كبيرة جداً بعد القص");
  }
  return putTeamPhoto(team, blob);
}

export async function deleteTeamPhoto(team: 1 | 2): Promise<void> {
  await withSession((auth) => deletePhotoFn({ data: { ...auth, team } })).catch(() => null);
  sendMessage({ action: "SET_TEAM_PHOTO", payload: { team, url: null } });
}
