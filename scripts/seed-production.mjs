// Seed production Supabase with demo data
// Run: node scripts/seed-production.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env.local manually (no dotenv dependency)
const envFile = readFileSync('.env.local', 'utf-8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

// Safety guard: refuse to seed non-local databases unless --force
const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
if (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1') && !process.argv.includes('--force')) {
  console.error('ERROR: Refusing to seed non-local database. Use --force to override.')
  console.error(`  Target: ${dbUrl}`)
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const MOCK_PASSWORD = 'MockPass123!';

const users = [
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', email: 'knightmaster99@mock.dev', display_name: 'KnightMaster99', role: 'serviceiro' },
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', email: 'sorcquestpro@mock.dev', display_name: 'SorcQuestPro', role: 'serviceiro' },
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', email: 'palpaladine@mock.dev', display_name: 'PaladinElite', role: 'serviceiro' },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', email: 'mockcustomer1@mock.dev', display_name: 'MockCustomer1', role: 'customer' },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002', email: 'mockbuyer99@mock.dev', display_name: 'MockBuyer99', role: 'customer' },
];

const bios = {
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000001': {
    bio: 'Elite Knight com 10 anos de Tibia. Especialista em hunts solo e duo em qualquer spawn do jogo. Preço justo e serviço rápido. Disponível todos os dias!',
    discord: 'KnightMaster99#0001',
  },
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000002': {
    bio: 'Sorcerer lvl 500+. Faço qualquer quest do jogo — desde Postman até Inquisition. Tenho todos os itens necessários e conheço todos os caminhos. DM para combinar!',
    whatsapp: '+55 11 99999-0002',
    discord: 'SorcQuestPro#0002',
  },
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000003': {
    bio: 'Paladin full equipado para KS/PK e bestiary. Rápido, discreto e experiente. Cobro por hora ou por missão. Entre em contato!',
    discord: 'PaladinElite#0003',
  },
};

const serviceiros = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
    vocations: ['knight'],
    gameplay_types: ['hunt_x1', 'hunt_x2', 'hunt_x3plus'],
    available_weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    available_from: '18:00', available_to: '23:00',
    timezone_offset: -3, is_registered: true,
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002',
    vocations: ['sorcerer', 'druid'],
    gameplay_types: ['quests', 'hunt_x1', 'bestiary'],
    available_weekdays: ['wed', 'fri', 'sat', 'sun'],
    available_from: '22:00', available_to: '04:00',
    timezone_offset: -3, is_registered: true,
  },
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
    vocations: ['paladin'],
    gameplay_types: ['ks_pk', 'bestiary', 'hunt_x1'],
    available_weekdays: ['fri', 'sat', 'sun'],
    available_from: '14:00', available_to: '02:00',
    timezone_offset: -3, is_registered: true,
  },
];

const bookings = [
  { id: 'cccccccc-cccc-cccc-cccc-000000000001', customer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', serviceiro_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', service_type: 'hunt_x1', status: 'completed', agreed_price_tc: 500, payment_sent_by_customer: true, payment_received_by_serviceiro: true, price_confirmed_by_customer: true, price_confirmed_by_serviceiro: true, complete_by_customer: true, complete_by_serviceiro: true },
  { id: 'cccccccc-cccc-cccc-cccc-000000000002', customer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002', serviceiro_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', service_type: 'hunt_x2', status: 'completed', agreed_price_tc: 750, payment_sent_by_customer: true, payment_received_by_serviceiro: true, price_confirmed_by_customer: true, price_confirmed_by_serviceiro: true, complete_by_customer: true, complete_by_serviceiro: true },
  { id: 'cccccccc-cccc-cccc-cccc-000000000003', customer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', serviceiro_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', service_type: 'quests', status: 'completed', agreed_price_tc: 1200, payment_sent_by_customer: true, payment_received_by_serviceiro: true, price_confirmed_by_customer: true, price_confirmed_by_serviceiro: true, complete_by_customer: true, complete_by_serviceiro: true },
  { id: 'cccccccc-cccc-cccc-cccc-000000000004', customer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002', serviceiro_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', service_type: 'ks_pk', status: 'completed', agreed_price_tc: 300, payment_sent_by_customer: true, payment_received_by_serviceiro: true, price_confirmed_by_customer: true, price_confirmed_by_serviceiro: true, complete_by_customer: true, complete_by_serviceiro: true },
  { id: 'cccccccc-cccc-cccc-cccc-000000000005', customer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', serviceiro_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', service_type: 'bestiary', status: 'completed', agreed_price_tc: 400, payment_sent_by_customer: true, payment_received_by_serviceiro: true, price_confirmed_by_customer: true, price_confirmed_by_serviceiro: true, complete_by_customer: true, complete_by_serviceiro: true },
];

const reviews = [
  { id: 'dddddddd-dddd-dddd-dddd-000000000001', booking_id: 'cccccccc-cccc-cccc-cccc-000000000001', serviceiro_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', reviewer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', rating: 5, comment: 'Serviço impecável! KnightMaster99 é muito profissional, fez o hunt rápido e sem problemas. Super recomendo!', is_visible: true },
  { id: 'dddddddd-dddd-dddd-dddd-000000000002', booking_id: 'cccccccc-cccc-cccc-cccc-000000000002', serviceiro_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001', reviewer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002', rating: 5, comment: 'Melhor serviceiro que já contratei. Pontual, eficiente e o preço é justo. Voltarei mais vezes!', is_visible: true },
  { id: 'dddddddd-dddd-dddd-dddd-000000000003', booking_id: 'cccccccc-cccc-cccc-cccc-000000000003', serviceiro_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002', reviewer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', rating: 4, comment: 'Ótimo na quest, conhece todos os caminhos. Demorou um pouco mais do esperado mas entregou bem.', is_visible: true },
  { id: 'dddddddd-dddd-dddd-dddd-000000000004', booking_id: 'cccccccc-cccc-cccc-cccc-000000000004', serviceiro_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', reviewer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002', rating: 5, comment: 'PaladinElite é um monstro no PK. Resolveu meu problema em menos de 10 minutos. Vale cada TC!', is_visible: true },
  { id: 'dddddddd-dddd-dddd-dddd-000000000005', booking_id: 'cccccccc-cccc-cccc-cccc-000000000005', serviceiro_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003', reviewer_id: 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001', rating: 4, comment: 'Bom serviço de bestiary, fez tudo direitinho. Recomendo!', is_visible: true },
];

async function seed() {
  console.log('=== Creating auth users ===');
  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: MOCK_PASSWORD,
      email_confirm: true,
      user_metadata: { role: u.role, display_name: u.display_name },
    });
    if (error) {
      if (error.message?.includes('already been registered')) {
        console.log(`  ✓ ${u.display_name} (already exists)`);
      } else {
        console.log(`  ✗ ${u.display_name}: ${error.message}`);
      }
    } else {
      // The trigger creates profiles/serviceiro_profiles but we need the actual UUID
      // Update our ID map if the server assigned a different one
      console.log(`  ✓ ${u.display_name} created (id: ${data.user.id})`);
    }
  }

  // Look up actual user IDs by email (in case server assigned different UUIDs)
  const idMap = {};
  for (const u of users) {
    const { data } = await supabase.auth.admin.listUsers();
    const found = data?.users?.find(x => x.email === u.email);
    if (found) idMap[u.id] = found.id;
  }

  function mapId(originalId) {
    return idMap[originalId] || originalId;
  }

  console.log('\n=== Updating profile bios ===');
  for (const [id, fields] of Object.entries(bios)) {
    const { error } = await supabase.from('profiles').update(fields).eq('id', mapId(id));
    console.log(error ? `  ✗ ${id}: ${error.message}` : `  ✓ ${id}`);
  }

  console.log('\n=== Updating serviceiro profiles ===');
  for (const s of serviceiros) {
    const realId = mapId(s.id);
    const { error } = await supabase.from('serviceiro_profiles').update({
      vocations: s.vocations,
      gameplay_types: s.gameplay_types,
      available_weekdays: s.available_weekdays,
      available_from: s.available_from,
      available_to: s.available_to,
      timezone_offset: s.timezone_offset,
      is_registered: s.is_registered,
    }).eq('id', realId);
    console.log(error ? `  ✗ ${s.id}: ${error.message}` : `  ✓ ${s.id}`);
  }

  console.log('\n=== Inserting bookings ===');
  for (const b of bookings) {
    const mapped = { ...b, customer_id: mapId(b.customer_id), serviceiro_id: mapId(b.serviceiro_id) };
    const { error } = await supabase.from('bookings').upsert(mapped);
    console.log(error ? `  ✗ ${b.id}: ${error.message}` : `  ✓ ${b.id}`);
  }

  console.log('\n=== Inserting reviews ===');
  for (const r of reviews) {
    const mapped = { ...r, serviceiro_id: mapId(r.serviceiro_id), reviewer_id: mapId(r.reviewer_id) };
    const { error } = await supabase.from('reviews').upsert(mapped);
    console.log(error ? `  ✗ ${r.id}: ${error.message}` : `  ✓ ${r.id}`);
  }

  console.log('\n=== Done ===');
}

seed().catch(console.error);
