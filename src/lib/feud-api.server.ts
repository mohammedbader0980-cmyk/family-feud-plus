// Server-only helpers backing the feud server functions.
// All access is gated on a per-session token held by the host device.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TABLE = "game_sessions";
export const MUSIC_BUCKET = "feud-music";
export const PHOTO_BUCKET = "team-photos";

export class SessionAuthError extends Error {}

/** Verify the session token; optionally create the session on first write. */
export async function authorizeSession(
  sessionId: string,
  token: string,
  create = false,
): Promise<"ok" | "missing"> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("token")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new SessionAuthError("session lookup failed");

  if (!data) {
    if (!create) return "missing";
    const { error: insertError } = await supabaseAdmin
      .from(TABLE)
      .insert({ id: sessionId, token, state: {} as never });
    if (insertError) {
      // Lost a race: re-check the token.
      return authorizeSession(sessionId, token, false);
    }
    return "ok";
  }

  if (data.token !== token) throw new SessionAuthError("invalid session token");
  return "ok";
}

export async function readSessionState(sessionId: string, token: string) {
  const status = await authorizeSession(sessionId, token, false);
  if (status === "missing") return null;
  const { data } = await supabaseAdmin
    .from(TABLE)
    .select("state")
    .eq("id", sessionId)
    .maybeSingle();
  return (data?.state as Record<string, unknown> | undefined) ?? null;
}

export async function writeSessionState(
  sessionId: string,
  token: string,
  state: unknown,
) {
  await authorizeSession(sessionId, token, true);
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ state: state as never })
    .eq("id", sessionId)
    .eq("token", token);
  if (error) throw new SessionAuthError("save failed");
}

export async function listMusicTracks() {
  const { data, error } = await supabaseAdmin.storage.from(MUSIC_BUCKET).list("", {
    limit: 200,
    sortBy: { column: "created_at", order: "asc" },
  });
  if (error || !data) return [];
  const out: { path: string; name: string; url: string }[] = [];
  for (const f of data) {
    if (!f.name || f.name.startsWith(".")) continue;
    const { data: signed } = await supabaseAdmin.storage
      .from(MUSIC_BUCKET)
      .createSignedUrl(f.name, 60 * 60 * 24 * 7);
    if (!signed?.signedUrl) continue;
    out.push({ path: f.name, name: f.name.replace(/^\d+-/, ""), url: signed.signedUrl });
  }
  return out;
}

export async function createUpload(bucket: string, path: string, upsert: boolean) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert });
  if (error || !data) throw new SessionAuthError("could not prepare upload");
  return { path, token: data.token };
}

export async function signObject(bucket: string, path: string, seconds: number) {
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}

export async function removeObject(bucket: string, path: string) {
  await supabaseAdmin.storage.from(bucket).remove([path]);
}
