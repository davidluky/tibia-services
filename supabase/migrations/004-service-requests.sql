-- service_requests table (for customer-posted job requests)
-- IF NOT EXISTS safe — table may already exist if schema was applied manually

CREATE TABLE IF NOT EXISTS service_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type    TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  flexible_time   BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_date  DATE,
  preferred_time  TIME,
  budget_tc       INTEGER,
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_customer ON service_requests (customer_id);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_requests_public_read" ON service_requests;
CREATE POLICY "service_requests_public_read" ON service_requests
  FOR SELECT USING (status = 'open');

DROP POLICY IF EXISTS "service_requests_own_insert" ON service_requests;
CREATE POLICY "service_requests_own_insert" ON service_requests
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "service_requests_own_update" ON service_requests;
CREATE POLICY "service_requests_own_update" ON service_requests
  FOR UPDATE USING (auth.uid() = customer_id);
