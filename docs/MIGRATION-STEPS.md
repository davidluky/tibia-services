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

**Status:** PENDING — run all migrations before deploying
