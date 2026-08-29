-- Run this once in Supabase SQL Editor. It is safe to run independently of
-- schema.sql and creates the bucket expected by the MP3 upload flow.
INSERT INTO storage.buckets (id, name, public)
VALUES ('party-audio', 'party-audio', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Authenticated users can upload party audio" ON storage.objects;
CREATE POLICY "Authenticated users can upload party audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'party-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Anyone can stream party audio" ON storage.objects;
CREATE POLICY "Anyone can stream party audio"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'party-audio');
