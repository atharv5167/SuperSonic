-- Run this once in Supabase SQL Editor. It is safe to run independently of
-- schema.sql and creates the bucket expected by the MP3 upload flow.
INSERT INTO storage.buckets (id, name, public)
VALUES ('party-audio', 'party-audio', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Authenticated users can upload party audio" ON storage.objects;
CREATE POLICY "Authenticated users can upload party audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'party-audio'
  AND (storage.foldername(name))[1] = 'session'
);

DROP POLICY IF EXISTS "Anyone can stream party audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can stream party audio" ON storage.objects;
CREATE POLICY "Authenticated users can stream party audio"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'party-audio' AND auth.role() = 'authenticated');
