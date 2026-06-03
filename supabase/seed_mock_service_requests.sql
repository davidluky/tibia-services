-- ============================================================
-- SERVICE REQUESTS — table + mock data
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Create table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type   TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  flexible_time  BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_date DATE,
  preferred_time TEXT,
  budget_tc      INTEGER,
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'taken', 'closed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read open requests" ON service_requests;
DROP POLICY IF EXISTS "Customers can insert own requests" ON service_requests;
DROP POLICY IF EXISTS "Customers can update own requests" ON service_requests;

CREATE POLICY "Anyone can read open requests"
  ON service_requests FOR SELECT
  USING (status = 'open');

CREATE POLICY "Customers can insert own requests"
  ON service_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own requests"
  ON service_requests FOR UPDATE
  USING (auth.uid() = customer_id);

-- ── Mock data ────────────────────────────────────────────────
INSERT INTO service_requests (
  id, customer_id, service_type, title, description,
  flexible_time, preferred_date, preferred_time,
  budget_tc, status, created_at
) VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-000000000001',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
    'hunt_x1',
    'Preciso de hunt solo para meu Knight lvl 300',
    'Meu personagem é um Elite Knight lvl 300, preciso de hunt em Zao ou Oramond. Prefiro alguém experiente que conheça bons spawnpoints. Disponível qualquer dia da semana.',
    true, NULL, NULL,
    500, 'open',
    now() - interval '2 hours'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-000000000002',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
    'quests',
    'Quest Inquisition — preciso terminar no sábado',
    'Travei na parte final da Inquisition Quest e preciso de alguém que conheça o caminho e possa me guiar. Preciso ser o personagem principal. Sábado depois das 18h.',
    false, '2026-03-21', '18:00',
    800, 'open',
    now() - interval '5 hours'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-000000000003',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
    'ks_pk',
    'Proteção de spawn — preciso de PK no Falcons',
    'Estou sendo constantemente KSado no spawn dos Falcons. Preciso de um PK experiente para me proteger por umas 2 horas. Pago bem por um serviço discreto e eficiente.',
    true, NULL, NULL,
    300, 'open',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;
