## Team Avatars / Photos

Add team photo support that uploads from the controller, syncs over Realtime, and renders on the main display.

### Storage
- New public Supabase bucket `team-photos` (public read).
- RLS policies on `storage.objects` allowing public select + anonymous insert/update/delete scoped to bucket `team-photos` (matches existing `feud-music` open model — no auth in app).
- File naming: fixed slots `team1.jpg` and `team2.jpg` with `upsert: true` so a new upload replaces the old. Append `?v=timestamp` cache-buster to URLs so the display refreshes instantly.

### State + Sync (`src/lib/feud-sync.ts`)
- Extend `DisplayState.payload` with `team1Photo: string | null`, `team2Photo: string | null`.
- New action `SET_TEAM_PHOTO { team: 1|2, url: string|null }` (controller → display, also broadcast back via STATE).
- New action `CLEAR_TEAM_PHOTO { team: 1|2 }`.

### Main game (`src/components/FamilyFeud.tsx`)
- Add `team1Photo` / `team2Photo` state, persisted in localStorage (URL only) and broadcast in STATE.
- On mount, attempt to load existing photos from the bucket (`team1.jpg`, `team2.jpg`) via public URL with HEAD check, else null.
- Handle `SET_TEAM_PHOTO` / `CLEAR_TEAM_PHOTO` from controller.
- Score area: render a circular avatar (~64–80px on bar, larger in win screen) next to each team's score:
  - If photo: `<img>` clipped to `rounded-full` with `object-cover`.
  - If null: colored circle (team 1 = blue, team 2 = red) with Arabic numeral (`١` / `٢`).
- Animations:
  - `animate-bounce` (one-shot via key change) when that team's score increases.
  - Gold glow ring (`ring-4 ring-amber-400 shadow-[0_0_24px_gold]`) on the team currently leading.
- Win celebration screen: show giant avatar (e.g. 240px) of winning team.

### Controller (`src/components/FeudController.tsx`)
- New "إعدادات الفرق" card with two rows (one per team):
  - Circle preview (photo or placeholder with first letter / numeral).
  - "📷 رفع صورة" button → `<input type="file" accept="image/jpeg,image/png" capture="environment">`.
  - "حذف" button when a photo exists.
- Validation: reject >2MB or non-JPG/PNG with an Arabic alert.
- Auto-crop to square before upload: draw to canvas at min(width,height) center-crop, export as JPEG quality 0.9. Circle clipping is purely a CSS display concern (`rounded-full overflow-hidden`), so we store a square JPEG.
- Upload to `team-photos/team{1|2}.jpg` with `upsert: true`, then `send({ action: "SET_TEAM_PHOTO", payload: { team, url: publicUrl + "?v=" + Date.now() } })`.

### Placeholder component
- Small shared inline helper (in `FamilyFeud.tsx` and `FeudController.tsx`) — no new file — renders either `<img>` or a colored circle with the team's marker. Team 1 placeholder: `bg-blue-600` + `١`. Team 2: `bg-red-600` + `٢`.

### Files touched
- `supabase/migrations/<new>.sql` — bucket + storage.objects policies (public access).
- `src/lib/feud-sync.ts` — new actions + state fields.
- `src/components/FamilyFeud.tsx` — state, sync handlers, avatar rendering, win screen, animations, localStorage keys `feud.team1Photo` / `feud.team2Photo`.
- `src/components/FeudController.tsx` — new team-settings card with upload/delete + canvas crop.

### Out of scope
- No per-session photo history (each team has a single slot, as requested).
- No auth — bucket is public, matching current app posture.
