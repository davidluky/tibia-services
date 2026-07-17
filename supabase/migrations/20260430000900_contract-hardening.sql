-- ============================================================
-- Contract Hardening (2026-04-30)
-- Enforces marketplace invariants at the database boundary so
-- direct supabase-js calls cannot bypass Next.js API validation.
-- ============================================================

-- ─── Serviceiro profile ownership and verification fields ────────────────────

DROP POLICY IF EXISTS "serviceiro_profiles_public_read" ON serviceiro_profiles;
DROP POLICY IF EXISTS "serviceiro_profiles_own_write" ON serviceiro_profiles;

CREATE POLICY "serviceiro_profiles_public_read" ON serviceiro_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = serviceiro_profiles.id
        AND profiles.role = 'serviceiro'
        AND profiles.is_banned = FALSE
    )
  );

CREATE POLICY "serviceiro_profiles_own_update" ON serviceiro_profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = serviceiro_profiles.id
        AND profiles.role = 'serviceiro'
        AND profiles.is_banned = FALSE
    )
  )
  WITH CHECK (
    auth.uid() = id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = serviceiro_profiles.id
        AND profiles.role = 'serviceiro'
        AND profiles.is_banned = FALSE
    )
  );

CREATE OR REPLACE FUNCTION prevent_self_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF OLD.is_registered IS DISTINCT FROM NEW.is_registered THEN
    RAISE EXCEPTION 'Cannot change verification status';
  END IF;
  IF OLD.registered_at IS DISTINCT FROM NEW.registered_at THEN
    RAISE EXCEPTION 'Cannot change registration timestamp';
  END IF;
  IF OLD.tibia_character IS DISTINCT FROM NEW.tibia_character THEN
    RAISE EXCEPTION 'Cannot change verified character';
  END IF;
  IF OLD.tibia_char_verified IS DISTINCT FROM NEW.tibia_char_verified THEN
    RAISE EXCEPTION 'Cannot change character verification status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_serviceiro_verification ON serviceiro_profiles;
CREATE TRIGGER protect_serviceiro_verification
  BEFORE UPDATE ON serviceiro_profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_self_verification();

-- ─── Booking creation, state, and price contracts ─────────────────────────────

DROP POLICY IF EXISTS "bookings_customer_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_participant_update" ON bookings;

CREATE POLICY "bookings_customer_insert" ON bookings
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id
    AND customer_id <> serviceiro_id
    AND status = 'pending'
    AND agreed_price_tc IS NULL
    AND completed_at IS NULL
    AND price_confirmed_by_customer = FALSE
    AND price_confirmed_by_serviceiro = FALSE
    AND payment_sent_by_customer = FALSE
    AND payment_received_by_serviceiro = FALSE
    AND complete_by_customer = FALSE
    AND complete_by_serviceiro = FALSE
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = customer_id
        AND profiles.role = 'customer'
        AND profiles.is_banned = FALSE
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = serviceiro_id
        AND profiles.role = 'serviceiro'
        AND profiles.is_banned = FALSE
    )
  );

CREATE POLICY "bookings_participant_update" ON bookings
  FOR UPDATE
  USING (auth.uid() = customer_id OR auth.uid() = serviceiro_id)
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = serviceiro_id);

CREATE OR REPLACE FUNCTION prevent_protected_booking_changes()
RETURNS TRIGGER AS $$
DECLARE
  acting_user UUID := auth.uid();
  acting_as_service_role BOOLEAN := current_setting('role') = 'service_role';
  valid_service_types TEXT[] := ARRAY['hunt_x1', 'hunt_x2', 'hunt_x3plus', 'quests', 'ks_pk', 'bestiary'];
  price_changed BOOLEAN := FALSE;
BEGIN
  IF NEW.service_type <> ALL(valid_service_types) THEN
    RAISE EXCEPTION 'Invalid service_type';
  END IF;

  IF NEW.agreed_price_tc IS NOT NULL AND (
    NEW.agreed_price_tc < 25
    OR NEW.agreed_price_tc > 100000
    OR NEW.agreed_price_tc % 25 <> 0
  ) THEN
    RAISE EXCEPTION 'Invalid agreed_price_tc';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.customer_id = NEW.serviceiro_id THEN
      RAISE EXCEPTION 'Cannot book yourself';
    END IF;
    IF NEW.status <> 'pending'
       OR NEW.agreed_price_tc IS NOT NULL
       OR NEW.completed_at IS NOT NULL
       OR NEW.price_confirmed_by_customer
       OR NEW.price_confirmed_by_serviceiro
       OR NEW.payment_sent_by_customer
       OR NEW.payment_received_by_serviceiro
       OR NEW.complete_by_customer
       OR NEW.complete_by_serviceiro THEN
      RAISE EXCEPTION 'Invalid booking initial state';
    END IF;
    RETURN NEW;
  END IF;

  IF acting_as_service_role THEN
    RETURN NEW;
  END IF;

  -- 1. Participant IDs are immutable after INSERT.
  IF OLD.customer_id <> NEW.customer_id THEN
    RAISE EXCEPTION 'Cannot change customer_id';
  END IF;
  IF OLD.serviceiro_id <> NEW.serviceiro_id THEN
    RAISE EXCEPTION 'Cannot change serviceiro_id';
  END IF;
  IF OLD.service_type IS DISTINCT FROM NEW.service_type THEN
    RAISE EXCEPTION 'Cannot change service_type';
  END IF;
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Cannot change created_at';
  END IF;

  IF OLD.status IN ('completed', 'declined', 'cancelled', 'disputed', 'resolved')
     AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RAISE EXCEPTION 'Final booking states are immutable';
  END IF;

  price_changed := OLD.agreed_price_tc IS DISTINCT FROM NEW.agreed_price_tc;

  IF price_changed AND OLD.status <> 'active' THEN
    RAISE EXCEPTION 'Price can only change while booking is active';
  END IF;

  -- 2. Each confirmation boolean can only be toggled by its owning party.
  IF OLD.price_confirmed_by_customer <> NEW.price_confirmed_by_customer
     AND acting_user <> OLD.customer_id THEN
    RAISE EXCEPTION 'Only the customer may change price_confirmed_by_customer';
  END IF;
  IF OLD.payment_sent_by_customer <> NEW.payment_sent_by_customer
     AND acting_user <> OLD.customer_id THEN
    RAISE EXCEPTION 'Only the customer may change payment_sent_by_customer';
  END IF;
  IF OLD.complete_by_customer <> NEW.complete_by_customer
     AND acting_user <> OLD.customer_id THEN
    RAISE EXCEPTION 'Only the customer may change complete_by_customer';
  END IF;

  IF OLD.price_confirmed_by_serviceiro <> NEW.price_confirmed_by_serviceiro
     AND acting_user <> OLD.serviceiro_id THEN
    RAISE EXCEPTION 'Only the serviceiro may change price_confirmed_by_serviceiro';
  END IF;
  IF OLD.payment_received_by_serviceiro <> NEW.payment_received_by_serviceiro
     AND acting_user <> OLD.serviceiro_id THEN
    RAISE EXCEPTION 'Only the serviceiro may change payment_received_by_serviceiro';
  END IF;
  IF OLD.complete_by_serviceiro <> NEW.complete_by_serviceiro
     AND acting_user <> OLD.serviceiro_id THEN
    RAISE EXCEPTION 'Only the serviceiro may change complete_by_serviceiro';
  END IF;

  IF NOT price_changed THEN
    IF OLD.price_confirmed_by_customer AND NOT NEW.price_confirmed_by_customer THEN
      RAISE EXCEPTION 'Cannot unset price_confirmed_by_customer';
    END IF;
    IF OLD.price_confirmed_by_serviceiro AND NOT NEW.price_confirmed_by_serviceiro THEN
      RAISE EXCEPTION 'Cannot unset price_confirmed_by_serviceiro';
    END IF;
  END IF;

  IF OLD.payment_sent_by_customer AND NOT NEW.payment_sent_by_customer THEN
    RAISE EXCEPTION 'Cannot unset payment_sent_by_customer';
  END IF;
  IF OLD.payment_received_by_serviceiro AND NOT NEW.payment_received_by_serviceiro THEN
    RAISE EXCEPTION 'Cannot unset payment_received_by_serviceiro';
  END IF;
  IF OLD.complete_by_customer AND NOT NEW.complete_by_customer THEN
    RAISE EXCEPTION 'Cannot unset complete_by_customer';
  END IF;
  IF OLD.complete_by_serviceiro AND NOT NEW.complete_by_serviceiro THEN
    RAISE EXCEPTION 'Cannot unset complete_by_serviceiro';
  END IF;

  -- 3. Changing agreed_price_tc invalidates any prior confirmations.
  IF price_changed THEN
    IF OLD.price_confirmed_by_customer = TRUE
       AND NEW.price_confirmed_by_customer = TRUE THEN
      NEW.price_confirmed_by_customer := FALSE;
    END IF;
    IF OLD.price_confirmed_by_serviceiro = TRUE
       AND NEW.price_confirmed_by_serviceiro = TRUE THEN
      NEW.price_confirmed_by_serviceiro := FALSE;
    END IF;
  END IF;

  -- 4. Public clients may only follow the documented state machine.
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'pending' AND NEW.status = 'active' AND acting_user = OLD.serviceiro_id THEN
      IF OLD.agreed_price_tc IS DISTINCT FROM NEW.agreed_price_tc
         OR OLD.completed_at IS DISTINCT FROM NEW.completed_at
         OR OLD.price_confirmed_by_customer IS DISTINCT FROM NEW.price_confirmed_by_customer
         OR OLD.price_confirmed_by_serviceiro IS DISTINCT FROM NEW.price_confirmed_by_serviceiro
         OR OLD.payment_sent_by_customer IS DISTINCT FROM NEW.payment_sent_by_customer
         OR OLD.payment_received_by_serviceiro IS DISTINCT FROM NEW.payment_received_by_serviceiro
         OR OLD.complete_by_customer IS DISTINCT FROM NEW.complete_by_customer
         OR OLD.complete_by_serviceiro IS DISTINCT FROM NEW.complete_by_serviceiro THEN
        RAISE EXCEPTION 'Status transition cannot change unrelated booking fields';
      END IF;
      RETURN NEW;
    ELSIF OLD.status = 'pending' AND NEW.status = 'declined' AND acting_user = OLD.serviceiro_id THEN
      IF OLD.agreed_price_tc IS DISTINCT FROM NEW.agreed_price_tc
         OR OLD.completed_at IS DISTINCT FROM NEW.completed_at
         OR OLD.price_confirmed_by_customer IS DISTINCT FROM NEW.price_confirmed_by_customer
         OR OLD.price_confirmed_by_serviceiro IS DISTINCT FROM NEW.price_confirmed_by_serviceiro
         OR OLD.payment_sent_by_customer IS DISTINCT FROM NEW.payment_sent_by_customer
         OR OLD.payment_received_by_serviceiro IS DISTINCT FROM NEW.payment_received_by_serviceiro
         OR OLD.complete_by_customer IS DISTINCT FROM NEW.complete_by_customer
         OR OLD.complete_by_serviceiro IS DISTINCT FROM NEW.complete_by_serviceiro THEN
        RAISE EXCEPTION 'Status transition cannot change unrelated booking fields';
      END IF;
      RETURN NEW;
    ELSIF OLD.status IN ('pending', 'active') AND NEW.status = 'cancelled'
          AND acting_user IN (OLD.customer_id, OLD.serviceiro_id) THEN
      IF OLD.agreed_price_tc IS DISTINCT FROM NEW.agreed_price_tc
         OR OLD.completed_at IS DISTINCT FROM NEW.completed_at
         OR OLD.price_confirmed_by_customer IS DISTINCT FROM NEW.price_confirmed_by_customer
         OR OLD.price_confirmed_by_serviceiro IS DISTINCT FROM NEW.price_confirmed_by_serviceiro
         OR OLD.payment_sent_by_customer IS DISTINCT FROM NEW.payment_sent_by_customer
         OR OLD.payment_received_by_serviceiro IS DISTINCT FROM NEW.payment_received_by_serviceiro
         OR OLD.complete_by_customer IS DISTINCT FROM NEW.complete_by_customer
         OR OLD.complete_by_serviceiro IS DISTINCT FROM NEW.complete_by_serviceiro THEN
        RAISE EXCEPTION 'Status transition cannot change unrelated booking fields';
      END IF;
      RETURN NEW;
    ELSIF OLD.status = 'active' AND NEW.status = 'completed'
          AND NEW.complete_by_customer = TRUE
          AND NEW.complete_by_serviceiro = TRUE
          AND NEW.completed_at IS NOT NULL THEN
      IF OLD.agreed_price_tc IS DISTINCT FROM NEW.agreed_price_tc
         OR OLD.price_confirmed_by_customer IS DISTINCT FROM NEW.price_confirmed_by_customer
         OR OLD.price_confirmed_by_serviceiro IS DISTINCT FROM NEW.price_confirmed_by_serviceiro
         OR OLD.payment_sent_by_customer IS DISTINCT FROM NEW.payment_sent_by_customer
         OR OLD.payment_received_by_serviceiro IS DISTINCT FROM NEW.payment_received_by_serviceiro THEN
        RAISE EXCEPTION 'Completion transition cannot change unrelated booking fields';
      END IF;
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Invalid booking status transition';
    END IF;
  END IF;

  IF OLD.completed_at IS DISTINCT FROM NEW.completed_at
     AND NOT (OLD.status = 'active' AND NEW.status = 'completed') THEN
    RAISE EXCEPTION 'completed_at can only be set when completing a booking';
  END IF;

  IF NEW.status <> 'completed' AND NEW.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'completed_at requires completed status';
  END IF;

  IF NEW.status = 'active'
     AND NEW.complete_by_customer = TRUE
     AND NEW.complete_by_serviceiro = TRUE THEN
    RAISE EXCEPTION 'Both completion flags require completed status';
  END IF;

  IF NEW.status = 'completed'
     AND (NEW.complete_by_customer = FALSE
          OR NEW.complete_by_serviceiro = FALSE
          OR NEW.completed_at IS NULL) THEN
    RAISE EXCEPTION 'Completed bookings require both completions and completed_at';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_booking_fields ON bookings;
CREATE TRIGGER protect_booking_fields
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION prevent_protected_booking_changes();

-- ─── Reviews must match the completed booking being reviewed ──────────────────

DROP POLICY IF EXISTS "reviews_reviewer_insert" ON reviews;

CREATE POLICY "reviews_reviewer_insert" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND is_visible = TRUE
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = reviews.booking_id
        AND bookings.customer_id = auth.uid()
        AND bookings.serviceiro_id = reviews.serviceiro_id
        AND bookings.status = 'completed'
    )
  );

-- ─── Featured listings cannot be self-activated by public clients ─────────────

DROP POLICY IF EXISTS "featured_own_insert" ON featured_listings;

CREATE POLICY "featured_own_insert" ON featured_listings
  FOR INSERT WITH CHECK (
    auth.uid() = serviceiro_id
    AND status = 'pending'
    AND confirmed_at IS NULL
    AND expires_at IS NULL
    AND tc_amount BETWEEN 25 AND 750
    AND tc_amount % 25 = 0
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = featured_listings.serviceiro_id
        AND profiles.role = 'serviceiro'
        AND profiles.is_banned = FALSE
    )
  );

CREATE OR REPLACE FUNCTION prevent_featured_self_activation()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'pending'
     OR NEW.confirmed_at IS NOT NULL
     OR NEW.expires_at IS NOT NULL THEN
    RAISE EXCEPTION 'Featured listings must start pending and unconfirmed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_featured_listing_fields ON featured_listings;
CREATE TRIGGER protect_featured_listing_fields
  BEFORE INSERT OR UPDATE ON featured_listings
  FOR EACH ROW EXECUTE FUNCTION prevent_featured_self_activation();

-- ─── Generic server-side rate-limit ledger for routes without write rows ──────

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_action_created
  ON api_rate_limits (user_id, action, created_at DESC);

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_api_action_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_since TIMESTAMPTZ,
  p_max_requests INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_max_requests <= 0 THEN
    RAISE EXCEPTION 'invalid_max_requests';
  END IF;
  IF p_action IS NULL OR length(trim(p_action)) = 0 THEN
    RAISE EXCEPTION 'invalid_action';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT || ':' || p_action, 0));

  SELECT COUNT(*) INTO v_count
  FROM api_rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > p_since;

  IF v_count >= p_max_requests THEN
    RETURN TRUE;
  END IF;

  INSERT INTO api_rate_limits (user_id, action)
  VALUES (p_user_id, p_action);

  RETURN FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION check_api_action_rate_limit(UUID, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_api_action_rate_limit(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO service_role;

-- ─── Atomic dispute transitions ───────────────────────────────────────────────

DROP POLICY IF EXISTS "disputes_participant_insert" ON disputes;
DROP POLICY IF EXISTS "disputes_customer_insert" ON disputes;

-- Disputes are opened through open_booking_dispute() so the dispute row and
-- booking status change in the same transaction. Public inserts are disabled.

CREATE OR REPLACE FUNCTION open_booking_dispute(
  p_booking_id UUID,
  p_opened_by UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking bookings%ROWTYPE;
  v_dispute_id UUID;
BEGIN
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;
  IF p_opened_by <> v_booking.customer_id THEN
    RAISE EXCEPTION 'not_booking_customer';
  END IF;
  IF v_booking.status <> 'active' THEN
    RAISE EXCEPTION 'booking_not_active';
  END IF;

  INSERT INTO disputes (booking_id, opened_by, reason)
  VALUES (p_booking_id, p_opened_by, p_reason)
  RETURNING id INTO v_dispute_id;

  UPDATE bookings
  SET status = 'disputed'
  WHERE id = p_booking_id;

  RETURN v_dispute_id;
END;
$$;

CREATE OR REPLACE FUNCTION resolve_booking_dispute(
  p_dispute_id UUID,
  p_resolved_by UUID,
  p_resolution TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute disputes%ROWTYPE;
BEGIN
  SELECT * INTO v_dispute
  FROM disputes
  WHERE id = p_dispute_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'dispute_not_found';
  END IF;
  IF v_dispute.status <> 'open' THEN
    RAISE EXCEPTION 'dispute_not_open';
  END IF;

  UPDATE disputes
  SET
    status = 'resolved',
    resolution = p_resolution,
    resolved_by = p_resolved_by,
    resolved_at = NOW()
  WHERE id = p_dispute_id;

  UPDATE bookings
  SET status = 'resolved'
  WHERE id = v_dispute.booking_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION open_booking_dispute(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION resolve_booking_dispute(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION open_booking_dispute(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION resolve_booking_dispute(UUID, UUID, TEXT) TO service_role;
