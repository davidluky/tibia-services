-- Run this in Supabase Dashboard → SQL Editor
-- Adds Tibia character verification columns to serviceiro_profiles

ALTER TABLE serviceiro_profiles
  ADD COLUMN IF NOT EXISTS tibia_character TEXT,
  ADD COLUMN IF NOT EXISTS tibia_char_verified BOOLEAN NOT NULL DEFAULT FALSE;
