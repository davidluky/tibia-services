-- ============================================================
-- MOCK DATA SEED — development/demo only
-- Run in: Supabase Dashboard → SQL Editor → New query
--
-- To remove all mock data later, run:
--   DELETE FROM auth.users WHERE email LIKE '%@mock.dev';
-- ============================================================

-- ── Step 1: Auth users ──────────────────────────────────────
-- The handle_new_user() trigger fires automatically and creates
-- the profiles row using raw_user_meta_data (role + display_name).
-- Password for all mock accounts: MockPass123
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_user_meta_data, raw_app_meta_data
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'knightmaster99@mock.dev',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    now(), now(), now(),
    '{"role": "serviceiro", "display_name": "KnightMaster99"}',
    '{"provider": "email", "providers": ["email"]}'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'sorcquestpro@mock.dev',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    now(), now(), now(),
    '{"role": "serviceiro", "display_name": "SorcQuestPro"}',
    '{"provider": "email", "providers": ["email"]}'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'palpaladine@mock.dev',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    now(), now(), now(),
    '{"role": "serviceiro", "display_name": "PaladinElite"}',
    '{"provider": "email", "providers": ["email"]}'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'mockcustomer1@mock.dev',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    now(), now(), now(),
    '{"role": "customer", "display_name": "MockCustomer1"}',
    '{"provider": "email", "providers": ["email"]}'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'mockbuyer99@mock.dev',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    now(), now(), now(),
    '{"role": "customer", "display_name": "MockBuyer99"}',
    '{"provider": "email", "providers": ["email"]}'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Step 2: Fill in bio/contact (trigger only sets role + display_name) ──
UPDATE profiles SET
  bio     = 'Elite Knight com 10 anos de Tibia. Especialista em hunts solo e duo em qualquer spawn do jogo. Preço justo e serviço rápido. Disponível todos os dias!',
  discord = 'KnightMaster99#0001'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';

UPDATE profiles SET
  bio     = 'Sorcerer lvl 500+. Faço qualquer quest do jogo — desde Postman até Inquisition. Tenho todos os itens necessários e conheço todos os caminhos. DM para combinar!',
  whatsapp = '+55 11 99999-0002',
  discord = 'SorcQuestPro#0002'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002';

UPDATE profiles SET
  bio     = 'Paladin full equipado para KS/PK e bestiary. Rápido, discreto e experiente. Cobro por hora ou por missão. Entre em contato!',
  discord = 'PaladinElite#0003'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003';

-- ── Step 3: Serviceiro profiles ─────────────────────────────
INSERT INTO serviceiro_profiles (
  id, vocations, gameplay_types,
  available_weekdays, available_from, available_to,
  timezone_offset, is_registered
) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
    ARRAY['knight'],
    ARRAY['hunt_x1', 'hunt_x2', 'hunt_x3plus'],
    ARRAY['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    '18:00', '02:00',
    -3, true
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000002',
    ARRAY['sorcerer', 'druid'],
    ARRAY['quests', 'hunt_x1', 'bestiary'],
    ARRAY['mon', 'wed', 'fri', 'sat', 'sun'],
    '20:00', '03:00',
    -3, true
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
    ARRAY['paladin'],
    ARRAY['ks_pk', 'bestiary', 'hunt_x1'],
    ARRAY['fri', 'sat', 'sun'],
    '21:00', '04:00',
    -3, true
  )
ON CONFLICT (id) DO NOTHING;

-- ── Step 4: Completed bookings (needed for reviews) ─────────
INSERT INTO bookings (
  id, customer_id, serviceiro_id, service_type,
  status, agreed_price_tc,
  payment_sent_by_customer, payment_received_by_serviceiro,
  price_confirmed_by_customer, price_confirmed_by_serviceiro,
  complete_by_customer, complete_by_serviceiro,
  created_at
) VALUES
  (
    'cccccccc-cccc-cccc-cccc-000000000001',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
    'hunt_x1', 'completed', 500,
    true, true, true, true, true, true,
    now() - interval '7 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-000000000002',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
    'hunt_x2', 'completed', 750,
    true, true, true, true, true, true,
    now() - interval '3 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-000000000003',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000002',
    'quests', 'completed', 1200,
    true, true, true, true, true, true,
    now() - interval '5 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-000000000004',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
    'ks_pk', 'completed', 300,
    true, true, true, true, true, true,
    now() - interval '2 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-000000000005',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
    'bestiary', 'completed', 400,
    true, true, true, true, true, true,
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Step 5: Reviews ─────────────────────────────────────────
INSERT INTO reviews (
  id, booking_id, serviceiro_id, reviewer_id,
  rating, comment, is_visible, created_at
) VALUES
  (
    'dddddddd-dddd-dddd-dddd-000000000001',
    'cccccccc-cccc-cccc-cccc-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
    5,
    'Serviço impecável! KnightMaster99 é muito profissional, fez o hunt rápido e sem problemas. Super recomendo!',
    true, now() - interval '6 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-000000000002',
    'cccccccc-cccc-cccc-cccc-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
    5,
    'Melhor serviceiro que já contratei. Pontual, eficiente e o preço é justo. Voltarei mais vezes!',
    true, now() - interval '2 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-000000000003',
    'cccccccc-cccc-cccc-cccc-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000002',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
    4,
    'Ótimo na quest, conhece todos os caminhos. Demorou um pouco mais do esperado mas entregou bem.',
    true, now() - interval '4 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-000000000004',
    'cccccccc-cccc-cccc-cccc-000000000004',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
    5,
    'PaladinElite é um monstro no PK. Resolveu meu problema em menos de 10 minutos. Vale cada TC!',
    true, now() - interval '1 day'
  ),
  (
    'dddddddd-dddd-dddd-dddd-000000000005',
    'cccccccc-cccc-cccc-cccc-000000000005',
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
    'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
    4,
    'Bom serviço de bestiary, fez tudo direitinho. Recomendo!',
    true, now() - interval '12 hours'
  )
ON CONFLICT (id) DO NOTHING;
