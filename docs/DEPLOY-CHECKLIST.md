# Deployment Checklist — tibia.davidluky.com

## Pre-deployment

- [ ] Verify all 8 Supabase migrations ran (Dashboard > SQL Editor > check tables/triggers exist)
  - 001: `tibia_character` + `tibia_char_verified` columns on `serviceiro_profiles`
  - 002: `disputes` table + booking_status enum values
  - 003: `featured_listings` table
  - 004: `service_requests` table
  - 005: `notifications` table
  - 006: `handle_new_user` trigger rejects admin role, `prevent_protected_changes` trigger
  - 007: `my_contact_info()` function, revoked SELECT on whatsapp/discord
  - 008: `prevent_protected_booking_changes` trigger on bookings

- [ ] Set environment variables on hosting platform (all 7 required):
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon (public) key
  - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
  - `RESEND_API_KEY` — Resend email API key
  - `RESEND_FROM_EMAIL` — Sender email address
  - `APP_URL` — Base URL for email links (https://tibia.davidluky.com)
  - `CHAR_VERIFY_SECRET` — HMAC secret for character verification codes

## Deployment

- [ ] Deploy to Cloudflare Workers (`npx opennextjs-cloudflare && wrangler deploy`) OR Vercel (`vercel --prod`)
- [ ] Point `tibia.davidluky.com` DNS (Cloudflare-managed — add CNAME or use Workers route)
- [ ] Verify HTTPS is active on tibia.davidluky.com

## Post-deployment

- [ ] Create admin account (register at /auth/register, then in Supabase SQL Editor: `UPDATE profiles SET role = 'admin' WHERE email = '<your-email>'`)
- [ ] Seed demo serviceiros (run `supabase/seed_mock*.sql` in SQL Editor, or create manually)
- [ ] Smoke-test all flows:
  - [ ] Landing page loads, language switcher works (PT/EN/ES)
  - [ ] User registration and login
  - [ ] Browse serviceiros page with filters
  - [ ] Create a booking, confirm price, send messages
  - [ ] Submit a review after completing a booking
  - [ ] Character verification flow (TibiaData API)
  - [ ] Service request board (create + apply)
  - [ ] Admin panel (users, verifications, reviews, disputes, featured)
  - [ ] Notification bell receives notifications
  - [ ] Email notifications arrive (Resend)

## Optional (Cloudflare-specific)

- [ ] Enable R2 cache for static assets (if using Cloudflare Workers)
- [ ] Configure custom domain in Cloudflare Workers dashboard
- [ ] Set up Cloudflare Web Analytics
