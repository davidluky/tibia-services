import { readFileSync } from 'fs'
import path from 'path'

const migration = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/009-contract-hardening.sql'),
  'utf8',
)

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
