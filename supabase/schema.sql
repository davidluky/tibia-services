-- ============================================================
-- Tibia Services Marketplace — Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('customer', 'serviceiro', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'active', 'completed', 'declined', 'cancelled');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users. Created automatically on signup via trigger.

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'customer',
  display_name  TEXT NOT NULL,
  bio           TEXT,
  -- Contact info: only returned by server-side API after booking check
  whatsapp      TEXT,
  discord       TEXT,
  is_banned     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SERVICEIRO PROFILES ──────────────────────────────────────────────────────
-- Extra data only for serviceiro-role users.

CREATE TABLE serviceiro_profiles (
  id                  UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- Arrays store selected items from the fixed lists in constants.ts
  vocations           TEXT[] NOT NULL DEFAULT '{}',
  gameplay_types      TEXT[] NOT NULL DEFAULT '{}',
  available_weekdays  TEXT[] NOT NULL DEFAULT '{}',
  available_from      TIME,
  available_to        TIME,
  -- UTC offset in hours (e.g. -3 for BRT, Brazil Standard Time)
  timezone_offset     INTEGER NOT NULL DEFAULT -3,
  is_registered       BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at       TIMESTAMPTZ
);

-- ─── VERIFICATION REQUESTS ────────────────────────────────────────────────────

CREATE TABLE verification_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serviceiro_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  character_name    TEXT NOT NULL,
  -- Storage paths — full URLs constructed in code using Supabase Storage
  screenshot_url    TEXT NOT NULL,
  id_document_url   TEXT NOT NULL,
  -- Admin manually marks this true after receiving TC payment in-game
  fee_paid          BOOLEAN NOT NULL DEFAULT FALSE,
  status            verification_status NOT NULL DEFAULT 'pending',
  admin_notes       TEXT,
  submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES profiles(id)
);

-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────

CREATE TABLE bookings (
  id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id                     UUID NOT NULL REFERENCES profiles(id),
  serviceiro_id                   UUID NOT NULL REFERENCES profiles(id),
  -- service_type matches a key from GAMEPLAY_TYPES in constants.ts
  service_type                    TEXT NOT NULL,
  -- Price agreed in Tibia Coins (multiples of 25). NULL until negotiated.
  agreed_price_tc                 INTEGER,
  -- Both parties must confirm the price before it is locked
  price_confirmed_by_customer     BOOLEAN NOT NULL DEFAULT FALSE,
  price_confirmed_by_serviceiro   BOOLEAN NOT NULL DEFAULT FALSE,
  -- Both parties must confirm payment (TC sent in-game, not verified by platform)
  payment_sent_by_customer        BOOLEAN NOT NULL DEFAULT FALSE,
  payment_received_by_serviceiro  BOOLEAN NOT NULL DEFAULT FALSE,
  -- Both parties must mark complete to move to 'completed' status
  complete_by_customer            BOOLEAN NOT NULL DEFAULT FALSE,
  complete_by_serviceiro          BOOLEAN NOT NULL DEFAULT FALSE,
  status                          booking_status NOT NULL DEFAULT 'pending',
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at                    TIMESTAMPTZ
);

-- ─── MESSAGES ─────────────────────────────────────────────────────────────────

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REVIEWS ──────────────────────────────────────────────────────────────────

CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- UNIQUE ensures one review per booking
  booking_id      UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id     UUID NOT NULL REFERENCES profiles(id),
  serviceiro_id   UUID NOT NULL REFERENCES profiles(id),
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT,
  -- Admin sets is_visible = false instead of deleting (preserves audit trail)
  is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── COMPLETION COUNTERS VIEW ─────────────────────────────────────────────────
-- Efficient read of "how many completed services per gameplay type" per serviceiro.
-- Used on profile pages. Recalculated on every read (Supabase handles caching).

CREATE VIEW serviceiro_completion_counts WITH (security_invoker = true) AS
SELECT
  serviceiro_id,
  service_type,
  COUNT(*) AS count
FROM bookings
WHERE status = 'completed'
GROUP BY serviceiro_id, service_type;

-- ─── TRIGGER: create profile on signup ────────────────────────────────────────
-- When a new user signs up via Supabase Auth, auto-create a profile row.
-- The role and display_name come from user_metadata set during signup.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, display_name)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'role')::user_role,
    NEW.raw_user_meta_data->>'display_name'
  );

  -- If registering as serviceiro, also create the serviceiro_profiles row
  IF (NEW.raw_user_meta_data->>'role') = 'serviceiro' THEN
    INSERT INTO serviceiro_profiles (id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- RLS ensures users can only access data they are allowed to see.
-- The service role key (admin client) bypasses all RLS.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE serviceiro_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: public read of non-sensitive fields (contact fields handled by API)
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (NOT is_banned);

CREATE POLICY "profiles_own_write" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Serviceiro profiles: public read
CREATE POLICY "serviceiro_profiles_public_read" ON serviceiro_profiles
  FOR SELECT USING (true);

CREATE POLICY "serviceiro_profiles_own_write" ON serviceiro_profiles
  FOR ALL USING (auth.uid() = id);

-- Verification requests: only owner and admins
CREATE POLICY "verif_own_read" ON verification_requests
  FOR SELECT USING (auth.uid() = serviceiro_id);

CREATE POLICY "verif_own_insert" ON verification_requests
  FOR INSERT WITH CHECK (auth.uid() = serviceiro_id);

-- Bookings: only the two parties
CREATE POLICY "bookings_participant_read" ON bookings
  FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = serviceiro_id);

CREATE POLICY "bookings_customer_insert" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "bookings_participant_update" ON bookings
  FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = serviceiro_id);

-- Messages: only booking participants
CREATE POLICY "messages_participant_read" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.serviceiro_id = auth.uid())
    )
  );

CREATE POLICY "messages_participant_insert" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.serviceiro_id = auth.uid())
      AND bookings.status = 'active'
    )
  );

-- Reviews: public read of visible reviews; only reviewer can insert
CREATE POLICY "reviews_public_read" ON reviews
  FOR SELECT USING (is_visible = true);

CREATE POLICY "reviews_reviewer_insert" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
      AND bookings.customer_id = auth.uid()
      AND bookings.status = 'completed'
    )
  );

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
-- Speeds up the most common queries

CREATE INDEX idx_serviceiro_profiles_vocations ON serviceiro_profiles USING GIN (vocations);
CREATE INDEX idx_serviceiro_profiles_gameplay ON serviceiro_profiles USING GIN (gameplay_types);
CREATE INDEX idx_serviceiro_profiles_weekdays ON serviceiro_profiles USING GIN (available_weekdays);
CREATE INDEX idx_bookings_customer ON bookings (customer_id);
CREATE INDEX idx_bookings_serviceiro ON bookings (serviceiro_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_messages_booking ON messages (booking_id, created_at);
CREATE INDEX idx_reviews_serviceiro ON reviews (serviceiro_id);
