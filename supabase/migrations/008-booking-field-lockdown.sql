-- ============================================================
-- Booking Field Lockdown (2026-04-12)
-- Closes a gap in the schema.sql bookings UPDATE policy:
--   CREATE POLICY "bookings_participant_update" ON bookings
--     FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = serviceiro_id);
-- This is row-level only, not column-level. Either party can update
-- ANY column, including participant IDs and the opposite party's
-- confirmation booleans. The Next.js API routes validate field-level
-- access, but the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) lets any
-- authenticated user call supabase-js directly and bypass those routes.
--
-- This migration enforces participant-scoped field access at the DB
-- layer via a BEFORE UPDATE trigger, matching the pattern used in
-- migration 006 for profiles and serviceiro_profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_protected_booking_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role (admin client) bypasses all checks
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 1. Participant IDs are immutable after INSERT
  IF OLD.customer_id <> NEW.customer_id THEN
    RAISE EXCEPTION 'Cannot change customer_id';
  END IF;
  IF OLD.serviceiro_id <> NEW.serviceiro_id THEN
    RAISE EXCEPTION 'Cannot change serviceiro_id';
  END IF;

  -- 2. Each confirmation boolean can only be toggled by its owning party.
  --    Customer-owned flags: only customer may change.
  IF OLD.price_confirmed_by_customer <> NEW.price_confirmed_by_customer
     AND auth.uid() <> OLD.customer_id THEN
    RAISE EXCEPTION 'Only the customer may change price_confirmed_by_customer';
  END IF;
  IF OLD.payment_sent_by_customer <> NEW.payment_sent_by_customer
     AND auth.uid() <> OLD.customer_id THEN
    RAISE EXCEPTION 'Only the customer may change payment_sent_by_customer';
  END IF;
  IF OLD.complete_by_customer <> NEW.complete_by_customer
     AND auth.uid() <> OLD.customer_id THEN
    RAISE EXCEPTION 'Only the customer may change complete_by_customer';
  END IF;

  --    Serviceiro-owned flags: only serviceiro may change.
  IF OLD.price_confirmed_by_serviceiro <> NEW.price_confirmed_by_serviceiro
     AND auth.uid() <> OLD.serviceiro_id THEN
    RAISE EXCEPTION 'Only the serviceiro may change price_confirmed_by_serviceiro';
  END IF;
  IF OLD.payment_received_by_serviceiro <> NEW.payment_received_by_serviceiro
     AND auth.uid() <> OLD.serviceiro_id THEN
    RAISE EXCEPTION 'Only the serviceiro may change payment_received_by_serviceiro';
  END IF;
  IF OLD.complete_by_serviceiro <> NEW.complete_by_serviceiro
     AND auth.uid() <> OLD.serviceiro_id THEN
    RAISE EXCEPTION 'Only the serviceiro may change complete_by_serviceiro';
  END IF;

  -- 3. Changing agreed_price_tc invalidates any prior confirmations.
  --    If either side had already confirmed and the price moves, force
  --    both confirmation flags back to FALSE so renegotiation is explicit.
  IF OLD.agreed_price_tc IS DISTINCT FROM NEW.agreed_price_tc THEN
    IF OLD.price_confirmed_by_customer = TRUE
       AND NEW.price_confirmed_by_customer = TRUE THEN
      NEW.price_confirmed_by_customer := FALSE;
    END IF;
    IF OLD.price_confirmed_by_serviceiro = TRUE
       AND NEW.price_confirmed_by_serviceiro = TRUE THEN
      NEW.price_confirmed_by_serviceiro := FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_booking_fields
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION prevent_protected_booking_changes();

-- ─── Remaining concerns (NOT blocked by this migration) ──────────────────────
-- `status`: free-form transitions by either participant. The API routes enforce
--   valid state machine transitions (pending → active → completed/cancelled),
--   but a user hitting supabase-js directly could set status = 'completed'
--   without the dual-confirm flags being true. Fix option: add a CHECK-style
--   trigger that only permits 'completed' when both complete_by_* are TRUE.
-- `completed_at`: same as above — not pinned to status transition.
-- These are lower severity because they only affect the booking record shape,
-- not financial fields or party identity. Track as future hardening.
