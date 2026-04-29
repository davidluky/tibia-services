# Pending Database Migrations

Run these SQL files in your Supabase Dashboard -> SQL Editor, in order.
All migrations are in the `supabase/migrations/` directory.

## Required Migrations (run in order after schema.sql)

### 001-character-verification.sql
- Adds `tibia_character` and `tibia_char_verified` columns to `serviceiro_profiles`
- Required for: character verification feature

### 002-disputes.sql
- Creates `disputes` table, adds `disputed`/`resolved` to booking_status enum
- Required for: dispute system

### 003-featured-listings.sql
- Creates `featured_listings` table with RLS
- Required for: featured profile promotion

### 004-service-requests.sql
- Creates `service_requests` table with RLS
- Required for: "looking for serviceiro" feature

### 005-notifications.sql (2026-03-29)
- Creates `notifications` table with RLS policies
- Required for: notification bell, booking status notifications

### 006-security-hardening.sql (2026-03-29)
- Fixes admin role escalation via signup
- Prevents role/ban status self-modification
- Prevents serviceiro self-verification
- Creates public_profiles view excluding contact info

### 007-contact-column-lockdown.sql (2026-04-12)
- Revokes column-level SELECT on `whatsapp`/`discord` from anon + authenticated roles
- Creates `my_contact_info()` SECURITY DEFINER function so users can read their own contact info (needed by dashboard edit form)
- Enforces the design that contact info is only exposed via `/api/contact/[id]` after a booking check
- Closes gap from migration 006 where `profiles_public_read` RLS policy granted SELECT on all columns

### 008-booking-field-lockdown.sql (2026-04-12)
- Creates `prevent_protected_booking_changes()` trigger on bookings table
- Prevents participant ID changes after INSERT (`customer_id`, `serviceiro_id` are immutable)
- Each confirmation boolean can only be toggled by its owning party (customer flags by customer, serviceiro flags by serviceiro)
- Price changes automatically reset both `price_confirmed_by_*` flags to force renegotiation
- `service_role` (admin client) bypasses all checks
- Note: `status` and `completed_at` transitions are still API-enforced only (tracked as future hardening)

**Status:** PENDING — run all 8 migrations in order before deploying
