-- Run this in Supabase Dashboard → SQL Editor
-- Adds featured listings (Tibia Coins boost) support

CREATE TYPE featured_status AS ENUM ('pending', 'active', 'canceled');

CREATE TABLE featured_listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serviceiro_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tc_amount       INTEGER NOT NULL CHECK (tc_amount > 0 AND tc_amount % 25 = 0),
  days_requested  INTEGER NOT NULL GENERATED ALWAYS AS (tc_amount / 25) STORED,
  status          featured_status NOT NULL DEFAULT 'pending',
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_featured_serviceiro ON featured_listings (serviceiro_id);
CREATE INDEX idx_featured_status ON featured_listings (status, expires_at);

ALTER TABLE featured_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "featured_own_read" ON featured_listings
  FOR SELECT USING (auth.uid() = serviceiro_id);

CREATE POLICY "featured_own_insert" ON featured_listings
  FOR INSERT WITH CHECK (auth.uid() = serviceiro_id);
