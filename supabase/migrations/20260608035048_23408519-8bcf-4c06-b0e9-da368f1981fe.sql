
CREATE POLICY "Public read feud-music" ON storage.objects FOR SELECT USING (bucket_id = 'feud-music');
CREATE POLICY "Public upload feud-music" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'feud-music');
CREATE POLICY "Public delete feud-music" ON storage.objects FOR DELETE USING (bucket_id = 'feud-music');
