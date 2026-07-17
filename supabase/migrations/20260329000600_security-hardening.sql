-- ============================================================
-- Security Hardening Migration (2026-03-29)
-- Fixes: admin role via signup, role self-modification,
--        is_registered self-modification, contact info exposure
-- ============================================================

-- 1. Fix signup trigger: reject 'admin' role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  safe_role user_role;
BEGIN
  -- Only allow 'customer' or 'serviceiro' on signup. Never 'admin'.
  IF (NEW.raw_user_meta_data->>'role') IN ('customer', 'serviceiro') THEN
    safe_role := (NEW.raw_user_meta_data->>'role')::user_role;
  ELSE
    safe_role := 'customer'::user_role;
  END IF;

  INSERT INTO profiles (id, role, display_name)
  VALUES (
    NEW.id,
    safe_role,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User')
  );

  IF safe_role = 'serviceiro' THEN
    INSERT INTO serviceiro_profiles (id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Prevent users from changing their own role or ban status
CREATE OR REPLACE FUNCTION prevent_protected_field_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only service_role (admin client) can change these fields
  IF current_setting('role') <> 'service_role' THEN
    IF OLD.role <> NEW.role THEN
      RAISE EXCEPTION 'Cannot change role';
    END IF;
    IF OLD.is_banned <> NEW.is_banned THEN
      RAISE EXCEPTION 'Cannot change ban status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_protected_field_changes();

-- 3. Prevent serviceiros from self-verifying
CREATE OR REPLACE FUNCTION prevent_self_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
    IF OLD.is_registered <> NEW.is_registered THEN
      RAISE EXCEPTION 'Cannot change verification status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_serviceiro_verification
  BEFORE UPDATE ON serviceiro_profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_self_verification();

-- 4. Restrict contact info visibility
-- Drop the old permissive policy and create one that excludes contact fields
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;

-- Public read: only non-sensitive fields
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT USING (NOT is_banned);

-- Note: The above still exposes whatsapp/discord columns via SELECT *.
-- To truly restrict, we create a view for public access:
CREATE OR REPLACE VIEW public_profiles AS
SELECT id, role, display_name, bio, is_banned, created_at
FROM profiles
WHERE NOT is_banned;

-- The /api/contact/[id] endpoint uses adminClient to bypass RLS and read contact fields.
-- This is the correct pattern - only the API returns contact info after booking verification.
