-- ============================================================
-- Contact Column Lockdown (2026-04-12)
-- Closes a gap in migration 006: the `profiles_public_read` RLS
-- policy granted SELECT on ALL columns (including whatsapp/discord)
-- to any authenticated user. The documented design is that contact
-- info is only exposed via /api/contact/[id] after a booking check.
-- This migration enforces that at the database layer.
-- ============================================================

-- 1. Revoke column-level SELECT on contact fields for anon + authenticated.
-- service_role (used by createAdminClient) bypasses these grants, so the
-- /api/contact/[id] endpoint continues to work as intended.
REVOKE SELECT (whatsapp, discord) ON profiles FROM anon, authenticated;

-- 2. SECURITY DEFINER function so users can read their OWN contact info
-- (needed by /dashboard to pre-fill the edit form). Bypasses the column
-- grant safely because the WHERE clause pins to auth.uid().
CREATE OR REPLACE FUNCTION my_contact_info()
RETURNS TABLE (whatsapp TEXT, discord TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT whatsapp, discord FROM profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION my_contact_info() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_contact_info() TO authenticated;

-- 3. UPDATE privilege on whatsapp/discord is preserved so users can still
-- edit their own contact info via the dashboard. RLS already restricts
-- UPDATE to own row via the existing "profiles_own_write" policy.
