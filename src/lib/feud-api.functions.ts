import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sessionInput = z.object({
  sessionId: z.string().min(1).max(64),
  token: z.string().min(8).max(128),
});

export const loadSessionFn = createServerFn({ method: "POST" })
  .inputValidator(sessionInput)
  .handler(async ({ data }) => {
    const { readSessionState } = await import("./feud-api.server");
    return { state: await readSessionState(data.sessionId, data.token) };
  });

export const saveSessionFn = createServerFn({ method: "POST" })
  .inputValidator(sessionInput.extend({ state: z.unknown() }))
  .handler(async ({ data }) => {
    const { writeSessionState } = await import("./feud-api.server");
    await writeSessionState(data.sessionId, data.token, data.state);
    return { ok: true };
  });

export const listMusicFn = createServerFn({ method: "POST" })
  .inputValidator(sessionInput)
  .handler(async ({ data }) => {
    const { authorizeSession, listMusicTracks } = await import("./feud-api.server");
    await authorizeSession(data.sessionId, data.token, true);
    return { tracks: await listMusicTracks() };
  });

export const createMusicUploadFn = createServerFn({ method: "POST" })
  .inputValidator(sessionInput.extend({ fileName: z.string().min(1).max(120) }))
  .handler(async ({ data }) => {
    const { authorizeSession, createUpload, MUSIC_BUCKET } = await import(
      "./feud-api.server"
    );
    await authorizeSession(data.sessionId, data.token, true);
    const safe = data.fileName.replace(/[^\w.\-]+/g, "_");
    return createUpload(MUSIC_BUCKET, `${Date.now()}-${safe}`, false);
  });

export const deleteMusicFn = createServerFn({ method: "POST" })
  .inputValidator(sessionInput.extend({ path: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    const { authorizeSession, removeObject, MUSIC_BUCKET } = await import(
      "./feud-api.server"
    );
    await authorizeSession(data.sessionId, data.token, true);
    if (data.path.includes("/") || data.path.includes("..")) throw new Error("bad path");
    await removeObject(MUSIC_BUCKET, data.path);
    return { ok: true };
  });

export const createPhotoUploadFn = createServerFn({ method: "POST" })
  .inputValidator(sessionInput.extend({ team: z.union([z.literal(1), z.literal(2)]) }))
  .handler(async ({ data }) => {
    const { authorizeSession, createUpload, PHOTO_BUCKET } = await import(
      "./feud-api.server"
    );
    await authorizeSession(data.sessionId, data.token, true);
    return createUpload(PHOTO_BUCKET, `team${data.team}.jpg`, true);
  });

export const signPhotoFn = createServerFn({ method: "POST" })
  .inputValidator(sessionInput.extend({ team: z.union([z.literal(1), z.literal(2)]) }))
  .handler(async ({ data }) => {
    const { authorizeSession, signObject, PHOTO_BUCKET } = await import(
      "./feud-api.server"
    );
    await authorizeSession(data.sessionId, data.token, true);
    return { url: await signObject(PHOTO_BUCKET, `team${data.team}.jpg`, 60 * 60 * 24) };
  });

export const deletePhotoFn = createServerFn({ method: "POST" })
  .inputValidator(sessionInput.extend({ team: z.union([z.literal(1), z.literal(2)]) }))
  .handler(async ({ data }) => {
    const { authorizeSession, removeObject, PHOTO_BUCKET } = await import(
      "./feud-api.server"
    );
    await authorizeSession(data.sessionId, data.token, true);
    await removeObject(PHOTO_BUCKET, `team${data.team}.jpg`);
    return { ok: true };
  });
