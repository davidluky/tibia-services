-- ============================================================
-- Audit security hardening
-- Fixes contact-column grants, banned-user write access, and
-- verification review atomicity discovered during the 2026 audit.
-- ============================================================

-- The earlier column-level REVOKE did not override the table-level SELECT
-- granted by Supabase. Replace it with an explicit safe-column allow-list.
-- service_role retains its existing table privileges for server-side work.
REVOKE SELECT ON TABLE profiles FROM anon, authenticated;
GRANT SELECT (id, role, display_name, bio, is_banned, created_at)
  ON TABLE profiles TO anon, authenticated;

-- Limit direct profile edits to the fields exposed by DashboardClient. RLS
-- still pins authenticated writes to the caller's own row.
REVOKE UPDATE ON TABLE profiles FROM anon, authenticated;
GRANT UPDATE (display_name, bio, whatsapp, discord)
  ON TABLE profiles TO authenticated;

REVOKE EXECUTE ON FUNCTION my_contact_info() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION my_contact_info() TO authenticated;

-- Direct Supabase clients may create their own request, but cannot forge the
-- administrative review fields that the review RPC owns.
DROP POLICY IF EXISTS "verif_own_insert" ON verification_requests;

CREATE POLICY "verif_own_insert" ON verification_requests
  FOR INSERT WITH CHECK (
    auth.uid() = serviceiro_id
    AND status = 'pending'
    AND fee_paid = FALSE
    AND admin_notes IS NULL
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'serviceiro'
        AND profiles.is_banned = FALSE
    )
  );

-- Match the API's one-active-request contract and close the check/insert race.
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_requests_one_active_per_serviceiro
  ON verification_requests (serviceiro_id)
  WHERE status IN ('pending', 'approved');

-- Banned participants may keep historical read access, but cannot mutate an
-- existing booking. The policy is the normal RLS boundary; the trigger keeps
-- the invariant in place if a future policy is accidentally broadened.
DROP POLICY IF EXISTS "bookings_participant_update" ON bookings;

CREATE POLICY "bookings_participant_update" ON bookings
  FOR UPDATE
  USING (
    (auth.uid() = customer_id OR auth.uid() = serviceiro_id)
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_banned = FALSE
    )
  )
  WITH CHECK (
    (auth.uid() = customer_id OR auth.uid() = serviceiro_id)
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_banned = FALSE
    )
  );

CREATE OR REPLACE FUNCTION enforce_non_banned_booking_actor()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.is_banned = FALSE
  ) THEN
    RAISE EXCEPTION 'banned_booking_actor';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS require_non_banned_booking_actor ON bookings;
CREATE TRIGGER require_non_banned_booking_actor
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_non_banned_booking_actor();

-- Messages use the same defense in depth. Existing conversations remain
-- readable to their participants, while a ban immediately stops new sends.
DROP POLICY IF EXISTS "messages_participant_insert" ON messages;

CREATE POLICY "messages_participant_insert" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_banned = FALSE
    )
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
        AND (bookings.customer_id = auth.uid() OR bookings.serviceiro_id = auth.uid())
        AND bookings.status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION enforce_non_banned_message_sender()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR NEW.sender_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'invalid_message_sender';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.is_banned = FALSE
  ) THEN
    RAISE EXCEPTION 'banned_message_sender';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS require_non_banned_message_sender ON messages;
CREATE TRIGGER require_non_banned_message_sender
  BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION enforce_non_banned_message_sender();

-- Approving a verification updates the request and the serviceiro profile in
-- one transaction. Locking the request makes concurrent/replayed reviews fail
-- with a stable conflict signal rather than partially applying a second review.
CREATE OR REPLACE FUNCTION review_verification_request(
  p_request_id UUID,
  p_reviewed_by UUID,
  p_action TEXT,
  p_admin_notes TEXT,
  p_fee_paid BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request verification_requests%ROWTYPE;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'invalid_verification_action';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_reviewed_by
      AND role = 'admin'
      AND is_banned = FALSE
  ) THEN
    RAISE EXCEPTION 'reviewer_not_admin';
  END IF;

  SELECT * INTO v_request
  FROM verification_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'verification_request_not_found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'verification_not_pending';
  END IF;

  IF p_action = 'approve' THEN
    IF p_fee_paid IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'verification_fee_not_paid';
    END IF;

    UPDATE serviceiro_profiles AS serviceiro
    SET is_registered = TRUE,
        registered_at = NOW()
    FROM profiles AS account
    WHERE serviceiro.id = v_request.serviceiro_id
      AND account.id = serviceiro.id
      AND account.role = 'serviceiro'
      AND account.is_banned = FALSE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'serviceiro_profile_ineligible';
    END IF;

    UPDATE verification_requests
    SET status = 'approved',
        admin_notes = p_admin_notes,
        fee_paid = TRUE,
        reviewed_at = NOW(),
        reviewed_by = p_reviewed_by
    WHERE id = p_request_id;
  ELSE
    UPDATE verification_requests
    SET status = 'rejected',
        admin_notes = p_admin_notes,
        fee_paid = COALESCE(p_fee_paid, FALSE),
        reviewed_at = NOW(),
        reviewed_by = p_reviewed_by
    WHERE id = p_request_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION review_verification_request(UUID, UUID, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION review_verification_request(UUID, UUID, TEXT, TEXT, BOOLEAN)
  TO service_role;
