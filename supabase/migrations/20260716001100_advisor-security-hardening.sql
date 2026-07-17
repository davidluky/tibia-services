-- ============================================================
-- Supabase Advisor Security Hardening (2026-07-16)
-- Closes the actionable advisor findings without changing the
-- application-facing database contracts.
-- ============================================================

-- Make the public projection honor the querying role's grants and RLS.
-- Migration 010 already grants anon/authenticated SELECT on exactly these
-- safe profile columns, so the view remains readable without owner bypass.
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Trigger functions execute as the row-changing caller. Pin their lookup path
-- to pg_catalog so later schema objects cannot shadow built-ins they use.
-- auth.uid() is already explicitly schema-qualified in the affected bodies.
ALTER FUNCTION public.prevent_protected_booking_changes()
  SET search_path = pg_catalog;
ALTER FUNCTION public.prevent_protected_field_changes()
  SET search_path = pg_catalog;
ALTER FUNCTION public.prevent_self_verification()
  SET search_path = pg_catalog;
ALTER FUNCTION public.prevent_featured_self_activation()
  SET search_path = pg_catalog;

-- Supabase can maintain explicit routine grants for API roles in addition to
-- PostgreSQL's PUBLIC default. Remove both paths for server-only definer RPCs,
-- then restore only the service-role access used by the trusted API routes.
REVOKE EXECUTE ON FUNCTION public.check_api_action_rate_limit(UUID, TEXT, TIMESTAMPTZ, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_api_action_rate_limit(UUID, TEXT, TIMESTAMPTZ, INTEGER)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.open_booking_dispute(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_booking_dispute(UUID, UUID, TEXT)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.resolve_booking_dispute(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_booking_dispute(UUID, UUID, TEXT)
  TO service_role;

-- This function is invoked by the existing auth.users trigger, not by clients.
-- Trigger execution does not require API roles to retain direct EXECUTE access.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;

-- Intentional exception: the dashboard needs this narrow RPC. Its definition
-- returns only the caller's own whatsapp/discord row via id = auth.uid().
REVOKE EXECUTE ON FUNCTION public.my_contact_info()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_contact_info()
  TO authenticated;

-- The mock seed's human-readable policies duplicate migration 004's canonical
-- service_requests policies. Keep the canonical policies and remove only the
-- equivalent legacy copies so each action has one permissive policy.
DROP POLICY IF EXISTS "Anyone can read open requests" ON public.service_requests;
DROP POLICY IF EXISTS "Customers can insert own requests" ON public.service_requests;
DROP POLICY IF EXISTS "Customers can update own requests" ON public.service_requests;
