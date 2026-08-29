-- ==============================================================================
-- SuperSonic Music Jamming Platform — Supabase PostgreSQL Schema
-- Scalable Multi-Tenant Architecture for 2000+ Concurrent Users
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user search
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 2. Party Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_code VARCHAR(12) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT 'SuperSonic Music Party',
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'paused')),
  max_participants INTEGER DEFAULT 2000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{"allowChat": true}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);

-- 3. Room Tracks Table (Playlist for the room)
CREATE TABLE IF NOT EXISTS public.room_tracks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) DEFAULT 'Unknown Artist',
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('mp3', 'youtube', 'stream')),
  source_url TEXT NOT NULL,
  duration NUMERIC(10, 2) DEFAULT 0,
  thumbnail_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_tracks_room_id ON public.room_tracks(room_id);
CREATE INDEX IF NOT EXISTS idx_room_tracks_order ON public.room_tracks(room_id, order_index);

-- 4. Lightweight Party History Table (Persists after party ends)
CREATE TABLE IF NOT EXISTS public.party_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID,
  room_code VARCHAR(12),
  name VARCHAR(100) NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER DEFAULT 0,
  peak_participants INTEGER DEFAULT 0,
  tracks_played JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_party_history_host_id ON public.party_history(host_id);
CREATE INDEX IF NOT EXISTS idx_party_history_started_at ON public.party_history(started_at DESC);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_history ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can view, only owner can update
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Rooms: Anyone can view active rooms by code, host can create/update
CREATE POLICY "Rooms are viewable by everyone" 
  ON public.rooms FOR SELECT USING (true);

CREATE POLICY "Logged in users can create rooms" 
  ON public.rooms FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own rooms" 
  ON public.rooms FOR UPDATE USING (auth.uid() = host_id);

-- Room Tracks: Anyone can read tracks, host can insert/update/delete
CREATE POLICY "Tracks are viewable by room members" 
  ON public.room_tracks FOR SELECT USING (true);

CREATE POLICY "Hosts can manage room tracks" 
  ON public.room_tracks FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rooms 
      WHERE rooms.id = room_tracks.room_id AND rooms.host_id = auth.uid()
    )
  );

-- Party History: Hosts can view their own party histories
CREATE POLICY "Hosts can view own party history" 
  ON public.party_history FOR SELECT USING (auth.uid() = host_id);

CREATE POLICY "Hosts can insert party history" 
  ON public.party_history FOR INSERT WITH CHECK (auth.uid() = host_id);

-- ==============================================================================
-- Automatic Profile Creation Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTRING(NEW.id::text, 1, 4)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id::text)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Storage Bucket Setup (For Host MP3 Audio Uploads)
-- ==============================================================================
-- Run in Supabase SQL editor or create bucket named 'party-audio' in Supabase Dashboard:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('party-audio', 'party-audio', true);
