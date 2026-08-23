ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS token text;

UPDATE public.game_sessions SET token = encode(gen_random_bytes(16), 'hex') WHERE token IS NULL;

ALTER TABLE public.game_sessions ALTER COLUMN token SET NOT NULL;

DROP POLICY IF EXISTS "Anyone can read game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can create game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can update game sessions" ON public.game_sessions;

REVOKE ALL ON public.game_sessions FROM anon;
REVOKE ALL ON public.game_sessions FROM authenticated;
GRANT ALL ON public.game_sessions TO service_role;

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read feud-music" ON storage.objects;
DROP POLICY IF EXISTS "Public upload feud-music" ON storage.objects;
DROP POLICY IF EXISTS "Public delete feud-music" ON storage.objects;
DROP POLICY IF EXISTS "Public read team-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public upload team-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public update team-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public delete team-photos" ON storage.objects;