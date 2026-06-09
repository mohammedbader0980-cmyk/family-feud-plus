CREATE POLICY "Public read team-photos" ON storage.objects FOR SELECT USING (bucket_id = 'team-photos');
CREATE POLICY "Public upload team-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'team-photos');
CREATE POLICY "Public update team-photos" ON storage.objects FOR UPDATE USING (bucket_id = 'team-photos') WITH CHECK (bucket_id = 'team-photos');
CREATE POLICY "Public delete team-photos" ON storage.objects FOR DELETE USING (bucket_id = 'team-photos');