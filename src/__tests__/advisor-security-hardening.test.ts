import { readFileSync } from 'fs'
import path from 'path'

const advisorMigration = readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260716001100_advisor-security-hardening.sql',
  ),
  'utf8',
)

describe('Supabase advisor security hardening migration', () => {
  it('makes the public profile projection obey caller grants and RLS', () => {
    expect(advisorMigration).toContain(
      'ALTER VIEW public.public_profiles SET (security_invoker = true)',
    )
  })

  it.each([
    'prevent_protected_booking_changes',
    'prevent_protected_field_changes',
    'prevent_self_verification',
    'prevent_featured_self_activation',
  ])('pins the %s trigger function search path', (functionName) => {
    expect(advisorMigration).toMatch(
      new RegExp(
        `ALTER FUNCTION public\\.${functionName}\\(\\)\\s+SET search_path = pg_catalog`,
      ),
    )
  })

  it.each([
    'check_api_action_rate_limit\\(UUID, TEXT, TIMESTAMPTZ, INTEGER\\)',
    'open_booking_dispute\\(UUID, UUID, TEXT\\)',
    'resolve_booking_dispute\\(UUID, UUID, TEXT\\)',
  ])('limits the %s definer RPC to service_role', (functionSignature) => {
    expect(advisorMigration).toMatch(
      new RegExp(
        `REVOKE EXECUTE ON FUNCTION public\\.${functionSignature}\\s+FROM PUBLIC, anon, authenticated;[\\s\\S]+` +
          `GRANT EXECUTE ON FUNCTION public\\.${functionSignature}\\s+TO service_role;`,
      ),
    )
  })

  it('removes direct untrusted API-role execution from the signup trigger function', () => {
    expect(advisorMigration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.handle_new_user\(\)\s+FROM PUBLIC, anon, authenticated;/,
    )
  })

  it('preserves authenticated access for the caller-scoped contact RPC', () => {
    expect(advisorMigration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.my_contact_info\(\)\s+FROM PUBLIC, anon;/,
    )
    expect(advisorMigration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.my_contact_info\(\)\s+TO authenticated;/,
    )
  })

  it.each([
    'Anyone can read open requests',
    'Customers can insert own requests',
    'Customers can update own requests',
  ])('drops the duplicate legacy service request policy %s', (policyName) => {
    expect(advisorMigration).toContain(
      `DROP POLICY IF EXISTS "${policyName}" ON public.service_requests;`,
    )
  })

  it('leaves the canonical service request policies in place', () => {
    expect(advisorMigration).not.toMatch(
      /DROP POLICY IF EXISTS "service_requests_(?:public_read|own_insert|own_update)"/,
    )
  })
})
