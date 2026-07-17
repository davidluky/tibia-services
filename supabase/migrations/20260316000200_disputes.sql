-- Run this in Supabase Dashboard → SQL Editor
-- Adds dispute resolution support: new booking statuses + disputes table

-- Add new booking status values
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'resolved';

-- Dispute status enum
CREATE TYPE dispute_status AS ENUM ('open', 'resolved');

-- Disputes table
CREATE TABLE disputes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  opened_by     UUID NOT NULL REFERENCES profiles(id),
  reason        TEXT NOT NULL,
  status        dispute_status NOT NULL DEFAULT 'open',
  resolution    TEXT,
  resolved_by   UUID REFERENCES profiles(id),
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

CREATE INDEX idx_disputes_booking ON disputes (booking_id);
CREATE INDEX idx_disputes_status ON disputes (status);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_participant_read" ON disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = disputes.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.serviceiro_id = auth.uid())
    )
  );

CREATE POLICY "disputes_participant_insert" ON disputes
  FOR INSERT WITH CHECK (
    auth.uid() = opened_by AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = disputes.booking_id
      AND (bookings.customer_id = auth.uid() OR bookings.serviceiro_id = auth.uid())
      AND bookings.status = 'active'
    )
  );
