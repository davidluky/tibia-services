# Deployment Checklist — tibia.davidluky.com

## Pre-deployment

- [x] Verify the canonical Supabase database state: all 11 current migrations are recorded in order and the linked database reports no schema lint errors
  - 001: `tibia_character` + `tibia_char_verified` columns on `serviceiro_profiles`
  - 002: `disputes` table + booking_status enum values
  - 003: `featured_listings` table
  - 004: `service_requests` table
  - 005: `notifications` table
  - 006: `handle_new_user` trigger rejects admin role, `prevent_protected_changes` trigger
  - 007: `my_contact_info()` function, revoked SELECT on whatsapp/discord
  - 008: `prevent_protected_booking_changes` trigger on bookings
  - 009: `protect_booking_fields` trigger, serviceiro/review/featured policy hardening, `api_rate_limits` table
  - 010: explicit safe profile-column grants, banned-user write guards, one-active-verification constraint, and transactional paid verification review RPC
  - 011: security-invoker public profile view, explicit server-RPC grants, pinned trigger search paths, and removal of duplicate legacy request policies
- [ ] Before migration 010, check for duplicate `verification_requests` rows whose status is `pending` or `approved` for the same `serviceiro_id`; resolve duplicates before creating the partial unique index
- [x] After migrations 010-011, verify real role privileges: direct private-contact reads fail, safe profile reads remain, server RPCs reject public roles, and `my_contact_info()` retains only its caller-scoped authenticated grant

- [x] Set environment variables on hosting platform (all 7 required):
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon (public) key
  - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
  - `RESEND_API_KEY` — Resend email API key
  - `RESEND_FROM_EMAIL` — Sender email address
  - `APP_URL` — Base URL for email links (https://tibia.davidluky.com)
  - `CHAR_VERIFY_SECRET` — HMAC secret for character verification codes

- [ ] Create/verify Supabase Storage bucket `verifications`
  - Private bucket, not public
  - Used by `/api/verification` for server-side admin-client uploads
  - Admin review pages generate signed URLs for file previews

- [x] Keep Supabase Auth email confirmations enabled for production
- [x] Set the provider minimum password length to 8; leaked-password screening remains unavailable on the current Free plan
- [ ] Run `npm run quality` locally and confirm lint, typecheck, tests, build, and audit all pass

## Deployment

- [ ] Deploy the reviewed tree through the Vercel-connected production branch (preferred), or run `vercel --prod` from that exact tree with an authenticated Vercel CLI
- [ ] Do not use a dashboard redeploy of an older build when local fixes have not been pushed; it cannot include the reviewed working tree
- [ ] Confirm `tibia.davidluky.com` still points to the canonical Vercel deployment
- [ ] Verify HTTPS is active on tibia.davidluky.com

## Post-deployment

- [ ] Create admin account by verified Auth user ID
  - Register at `/auth/register`
  - Confirm the email address
  - In Supabase SQL Editor, find the verified UUID:
    ```sql
    SELECT id, email, email_confirmed_at
    FROM auth.users
    WHERE email = '<your-email>';
    ```
  - Promote that exact verified user:
    ```sql
    UPDATE profiles
    SET role = 'admin'
    WHERE id = '<verified-auth-user-id>'
    AND EXISTS (
      SELECT 1
      FROM auth.users
      WHERE auth.users.id = profiles.id
        AND auth.users.email_confirmed_at IS NOT NULL
    );
    ```
- [ ] Seed demo serviceiros (run `supabase/seed_mock*.sql` in SQL Editor, or create manually)
- [ ] Smoke-test all flows:
  - [ ] Landing page loads, language switcher works (PT/EN/ES)
  - [ ] User registration and login
  - [ ] Browse serviceiros page with filters
  - [ ] Create a booking, confirm price, send messages
  - [ ] Submit a review after completing a booking
  - [ ] Character verification flow (TibiaData API)
  - [ ] Identity verification request uploads screenshot + ID through `/api/verification`
  - [ ] Service request board (create + verify the application action remains unavailable/503 while its product model is on hold)
  - [ ] Admin panel (users, verifications, reviews, disputes, featured)
  - [ ] Admin verification detail displays private files through signed review URLs
  - [ ] Notification bell receives notifications
  - [ ] Email notifications arrive (Resend)

## Optional inactive Cloudflare portability path

- [ ] Run `npm run package` and inspect the OpenNext artifact before any Cloudflare deployment work
- [ ] Enable R2 cache for static assets (if using Cloudflare Workers)
- [ ] Configure custom domain in Cloudflare Workers dashboard
- [ ] Set up Cloudflare Web Analytics

Cloudflare Workers is not the current production host. Do not change DNS,
Workers routes, or Cloudflare deployment state unless a task explicitly reopens
this path.
