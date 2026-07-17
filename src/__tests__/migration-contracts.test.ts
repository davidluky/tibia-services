import { readdirSync, readFileSync } from 'fs'
import path from 'path'

const migration = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260430000900_contract-hardening.sql'),
  'utf8',
)
const auditMigration = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260712001000_audit-security-hardening.sql'),
  'utf8',
)

describe('migration filenames', () => {
  it('uses Supabase CLI-compatible timestamp prefixes for every migration', () => {
    const migrationDirectory = path.join(process.cwd(), 'supabase/migrations')
    const migrationFilenames = readdirSync(migrationDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
    const invalidFilenames = migrationFilenames.filter(
      (filename) => !/^\d{14}_.+\.sql$/.test(filename),
    )

    expect(migrationFilenames).not.toHaveLength(0)
    expect(invalidFilenames).toEqual([])
  })
})

describe('contract hardening migration', () => {
  it('locks booking creation to safe pending defaults', () => {
    expect(migration).toContain('CREATE POLICY "bookings_customer_insert"')
    expect(migration).toContain("AND status = 'pending'")
    expect(migration).toContain('AND agreed_price_tc IS NULL')
    expect(migration).toContain('AND completed_at IS NULL')
    expect(migration).toContain("profiles.role = 'serviceiro'")
  })

  it('keeps booking updates inside the state machine', () => {
    expect(migration).toContain('Cannot change service_type')
    expect(migration).toContain('Final booking states are immutable')
    expect(migration).toContain('Price can only change while booking is active')
    expect(migration).toContain('Cannot unset complete_by_customer')
    expect(migration).toContain('Status transition cannot change unrelated booking fields')
    expect(migration).toContain('Both completion flags require completed status')
  })

  it('keeps reviews tied to the completed booking serviceiro', () => {
    expect(migration).toContain('CREATE POLICY "reviews_reviewer_insert"')
    expect(migration).toContain('bookings.serviceiro_id = reviews.serviceiro_id')
    expect(migration).toContain("bookings.status = 'completed'")
  })

  it('prevents featured listings from starting active through public inserts', () => {
    expect(migration).toContain('CREATE POLICY "featured_own_insert"')
    expect(migration).toContain("AND status = 'pending'")
    expect(migration).toContain('AND confirmed_at IS NULL')
    expect(migration).toContain('AND expires_at IS NULL')
  })

  it('adds atomic dispute transition functions', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "disputes_participant_insert"')
    expect(migration).toContain('Public inserts are disabled')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION open_booking_dispute')
    expect(migration).toContain('CREATE OR REPLACE FUNCTION resolve_booking_dispute')
    expect(migration).toContain('FOR UPDATE')
  })

  it('uses an atomic action rate-limit function', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION check_api_action_rate_limit')
    expect(migration).toContain('pg_advisory_xact_lock')
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION check_api_action_rate_limit')
  })
})

describe('audit security hardening migration', () => {
  it('replaces table-wide profile reads with an explicit safe-column grant', () => {
    expect(auditMigration).toContain('REVOKE SELECT ON TABLE profiles FROM anon, authenticated')
    expect(auditMigration).toMatch(
      /GRANT SELECT \(id, role, display_name, bio, is_banned, created_at\)\s+ON TABLE profiles TO anon, authenticated/,
    )
    expect(auditMigration).toContain('REVOKE UPDATE ON TABLE profiles FROM anon, authenticated')
    expect(auditMigration).toMatch(
      /GRANT UPDATE \(display_name, bio, whatsapp, discord\)\s+ON TABLE profiles TO authenticated/,
    )
    expect(auditMigration).toContain('GRANT EXECUTE ON FUNCTION my_contact_info() TO authenticated')
  })

  it('prevents direct verification inserts from forging review fields', () => {
    expect(auditMigration).toContain('CREATE POLICY "verif_own_insert"')
    expect(auditMigration).toContain("status = 'pending'")
    expect(auditMigration).toContain('fee_paid = FALSE')
    expect(auditMigration).toContain('reviewed_at IS NULL')
    expect(auditMigration).toContain('reviewed_by IS NULL')
    expect(auditMigration).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_requests_one_active_per_serviceiro')
    expect(auditMigration).toContain("WHERE status IN ('pending', 'approved')")
  })

  it('blocks banned booking updates and message inserts at policy and trigger layers', () => {
    expect(auditMigration).toContain('CREATE POLICY "bookings_participant_update"')
    expect(auditMigration).toContain('CREATE OR REPLACE FUNCTION enforce_non_banned_booking_actor')
    expect(auditMigration).toContain('CREATE POLICY "messages_participant_insert"')
    expect(auditMigration).toContain('CREATE OR REPLACE FUNCTION enforce_non_banned_message_sender')
    expect(auditMigration).toContain('profiles.is_banned = FALSE')
  })

  it('reviews pending verification requests atomically through service role only', () => {
    expect(auditMigration).toContain('CREATE OR REPLACE FUNCTION review_verification_request')
    expect(auditMigration).toContain('FOR UPDATE')
    expect(auditMigration).toContain("v_request.status <> 'pending'")
    expect(auditMigration).toContain('p_fee_paid IS DISTINCT FROM TRUE')
    expect(auditMigration).toContain('UPDATE serviceiro_profiles')
    expect(auditMigration).toContain('UPDATE verification_requests')
    expect(auditMigration).toContain("account.role = 'serviceiro'")
    expect(auditMigration).toContain('account.is_banned = FALSE')
    expect(auditMigration).toMatch(
      /REVOKE EXECUTE ON FUNCTION review_verification_request[\s\S]+FROM PUBLIC, anon, authenticated/,
    )
    expect(auditMigration).toMatch(
      /GRANT EXECUTE ON FUNCTION review_verification_request[\s\S]+TO service_role/,
    )
  })
})
