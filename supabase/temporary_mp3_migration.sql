-- Temporary MP3 session metadata.
-- Run once in the Supabase SQL Editor after the existing schema.

ALTER TABLE public.room_tracks
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_size BIGINT;

CREATE INDEX IF NOT EXISTS idx_room_tracks_storage_path
  ON public.room_tracks(storage_path)
  WHERE storage_path IS NOT NULL;
