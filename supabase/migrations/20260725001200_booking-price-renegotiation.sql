-- ============================================================
-- Booking Price Renegotiation Fix (2026-07-25)
-- prevent_protected_booking_changes() evaluated the per-party
-- ownership checks BEFORE the price-change reset, so any
-- counter-offer raised 'Only the serviceiro may change
-- price_confirmed_by_serviceiro' (or its customer mirror) and the
-- PATCH /api/bookings/[id] set_price action answered with a 500.
-- The reset now runs first and is authoritative, so the ownership
-- checks no longer see a flag the caller never intended to write.
-- Nothing else in the function body changes.
-- ============================================================

-- CREATE OR REPLACE resets a function's configuration parameters, so the
-- search_path pinned by 20260716001100_advisor-security-hardening.sql is
-- restated inline here rather than left to be re-applied afterwards.
CREATE OR REPLACE FUNCTION prevent_protected_booking_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
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

  -- 2. Changing agreed_price_tc invalidates every prior price confirmation.
  --    This runs before the ownership checks so a counter-offer never has to
  --    write the counterparty's flag to clear it. Only the party naming the new
  --    price may carry a confirmation into it, so neither side can forge the
  --    other's confirmation through a price change.
  IF price_changed THEN
    NEW.price_confirmed_by_customer :=
      acting_user = OLD.customer_id AND NEW.price_confirmed_by_customer;
    NEW.price_confirmed_by_serviceiro :=
      acting_user = OLD.serviceiro_id AND NEW.price_confirmed_by_serviceiro;
  END IF;

  -- 3. Each confirmation boolean can only be toggled by its owning party.
  --    The price flags are already authoritative from step 2 whenever the price
  --    changed, so they are only checked on price-preserving updates.
  IF NOT price_changed THEN
    IF OLD.price_confirmed_by_customer <> NEW.price_confirmed_by_customer
       AND acting_user <> OLD.customer_id THEN
      RAISE EXCEPTION 'Only the customer may change price_confirmed_by_customer';
    END IF;
    IF OLD.price_confirmed_by_serviceiro <> NEW.price_confirmed_by_serviceiro
       AND acting_user <> OLD.serviceiro_id THEN
      RAISE EXCEPTION 'Only the serviceiro may change price_confirmed_by_serviceiro';
    END IF;
    IF OLD.price_confirmed_by_customer AND NOT NEW.price_confirmed_by_customer THEN
      RAISE EXCEPTION 'Cannot unset price_confirmed_by_customer';
    END IF;
    IF OLD.price_confirmed_by_serviceiro AND NOT NEW.price_confirmed_by_serviceiro THEN
      RAISE EXCEPTION 'Cannot unset price_confirmed_by_serviceiro';
    END IF;
  END IF;

  IF OLD.payment_sent_by_customer <> NEW.payment_sent_by_customer
     AND acting_user <> OLD.customer_id THEN
    RAISE EXCEPTION 'Only the customer may change payment_sent_by_customer';
  END IF;
  IF OLD.complete_by_customer <> NEW.complete_by_customer
     AND acting_user <> OLD.customer_id THEN
    RAISE EXCEPTION 'Only the customer may change complete_by_customer';
  END IF;

  IF OLD.payment_received_by_serviceiro <> NEW.payment_received_by_serviceiro
     AND acting_user <> OLD.serviceiro_id THEN
    RAISE EXCEPTION 'Only the serviceiro may change payment_received_by_serviceiro';
  END IF;
  IF OLD.complete_by_serviceiro <> NEW.complete_by_serviceiro
     AND acting_user <> OLD.serviceiro_id THEN
    RAISE EXCEPTION 'Only the serviceiro may change complete_by_serviceiro';
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
$$;
