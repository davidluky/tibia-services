# Pending Database Migrations

Run `supabase/schema.sql` first, then run these SQL files in your Supabase Dashboard -> SQL Editor, in order.
The canonical database state is the base schema plus every timestamped migration in `supabase/migrations/`; do not treat `schema.sql` alone as complete.

## Required Migrations (run in order after schema.sql)

### 20260316000100_character-verification.sql
- Adds `tibia_character` and `tibia_char_verified` columns to `serviceiro_profiles`
- Required for: character verification feature

### 20260316000200_disputes.sql
- Creates `disputes` table, adds `disputed`/`resolved` to booking_status enum
- Required for: dispute system

### 20260316000300_featured-listings.sql
- Creates `featured_listings` table with RLS
- Required for: featured profile promotion

### 20260316000400_service-requests.sql
- Creates `service_requests` table with RLS
- Required for: "looking for serviceiro" feature

### 20260329000500_notifications.sql (2026-03-29)
- Creates `notifications` table with RLS policies
- Required for: notification bell, booking status notifications

### 20260329000600_security-hardening.sql (2026-03-29)
- Fixes admin role escalation via signup
- Prevents role/ban status self-modification
- Prevents serviceiro self-verification
- Creates public_profiles view excluding contact info

### 20260412000700_contact-column-lockdown.sql (2026-04-12)
- Revokes column-level SELECT on `whatsapp`/`discord` from anon + authenticated roles
- Creates `my_contact_info()` SECURITY DEFINER function so users can read their own contact info (needed by dashboard edit form)
- Enforces the design that contact info is only exposed via `/api/contact/[id]` after a booking check
- Closes gap from migration 006 where `profiles_public_read` RLS policy granted SELECT on all columns

### 20260412000800_booking-field-lockdown.sql (2026-04-12)
- Creates `prevent_protected_booking_changes()` trigger on bookings table
- Prevents participant ID changes after INSERT (`customer_id`, `serviceiro_id` are immutable)
- Each confirmation boolean can only be toggled by its owning party (customer flags by customer, serviceiro flags by serviceiro)
- Price changes automatically reset both `price_confirmed_by_*` flags to force renegotiation
- `service_role` (admin client) bypasses all checks
- Note: migration 009 supersedes this file's API-only gap for `status` and `completed_at` transitions

### 20260430000900_contract-hardening.sql (2026-04-30)
- Tightens serviceiro profile read/update policies to require a serviceiro role and non-banned profile
- Protects registration and character verification fields from self-modification
- Extends booking database guards to INSERT plus UPDATE, including self-booking prevention, initial-state checks, service type validation, TC bounds, participant/service-type immutability, owned monotonic confirmation flags, price confirmation resets, final-state immutability, and status/`completed_at` transition enforcement
- Ensures review inserts match the completed booking being reviewed
- Prevents public clients from self-activating featured listings
- Creates `api_rate_limits` ledger table plus the atomic `check_api_action_rate_limit()` function for route-level rate limiting that does not naturally create a domain row
- Disables public dispute inserts; customer dispute creation goes through atomic open/resolve dispute functions

### 20260712001000_audit-security-hardening.sql (2026-07-12)
- Replaces broad `profiles` table SELECT/UPDATE grants with explicit safe-column allow-lists while preserving authenticated own-contact access through `my_contact_info()`
- Prevents direct verification inserts from forging review fields and permits only one pending/approved request per serviceiro
- Blocks banned users from updating bookings or inserting messages at both API and database boundaries
- Adds service-role-only `review_verification_request()` with a row lock so paid approve/reject review updates the request and serviceiro registration atomically
- Before applying, query for duplicate pending/approved verification rows per `serviceiro_id` and resolve them so the partial unique index can be created

**Status:** PENDING EXTERNAL VERIFICATION -- run all 10 current migrations in order before deploying, then test the profile grants and security RPCs with real Supabase roles.
