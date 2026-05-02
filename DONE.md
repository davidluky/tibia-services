# DONE — What Was Built & What To Do Next

## What Was Built

A complete full-stack marketplace website for Tibia game services.

### Features

**Public pages**
- Landing page with hero, how-it-works section, and featured serviceiros
- Browse page with filters: vocation, gameplay type, weekday, registered-only, name search
- Serviceiro public profile: bio, vocations, gameplay types, availability, reviews, contact reveal

**Auth**
- Register as customer or serviceiro (role chosen at signup, stored in DB via trigger)
- Login/logout with Supabase Auth
- Session persists across page loads

**Booking system**
- Create a booking from a serviceiro's profile
- Booking status flow: pending → active → completed (or declined/cancelled)
- In-booking chat with 30-second polling
- Price negotiation: propose TC price, both parties confirm
- Payment tracking: customer marks TC sent, serviceiro marks TC received
- Mark complete: both parties must confirm to close the booking

**Reviews**
- Customer can leave 1–5 star rating + comment after booking is completed
- Reviews visible on serviceiro profile (sorted newest first)
- Admin can hide reviews

**Serviceiro dashboard**
- Edit profile: display name, bio, WhatsApp, Discord
- Select vocations and gameplay types
- Set availability: weekdays, time range, timezone
- Link to apply for Registered badge

**Verification system**
- Upload screenshot + ID document
- Admin reviews, marks fee paid, approves/rejects
- On approval: `is_registered = true` → gold badge appears on profile

**Admin panel** (`/admin`)
- Overview dashboard with counts
- Verifications list + detail with approve/reject
- Users table with search and ban/unban toggle
- Reviews table with hide button

**Notifications & email**
- In-app notification system with bell icon (30s polling)
- Email notifications on booking status changes (`src/lib/email.ts`, Resend)

**Analytics**
- Serviceiro analytics dashboard (KPIs, monthly chart, type breakdown)
- Service request matching indicator for serviceiros

**Character verification**
- Character verification via TibiaData API v4 (comment-based proof)
- Self-verification prevention (cannot verify your own character)

**Disputes**
- Dispute resolution flow: customer opens dispute, admin resolves (refund/release/split)

**Reliability & security**
- Error retry states for failed fetches
- Rate limiting on bookings (3/min), messages (10/min), service requests (3/min), identity uploads (3/hour), and character verification (5/10min)
- Security hardening: role protection, self-verification prevention, DB-enforced booking/review/featured/dispute contracts
- Standardized API helpers (auth, errors, rate limiting)

**Testing**
- Jest + React Testing Library regression tests for helpers, constants, i18n, sanitization, validation, and migration contracts

**Tech files**
- `supabase/schema.sql` — base DB schema, RLS, triggers, indexes
- `supabase/migrations/` — incremental migration files (001–009); run after `schema.sql`
- `src/lib/constants.ts` — vocations, gameplay types, weekdays, TC limits
- `src/lib/types.ts` — all TypeScript types matching DB schema
- `src/lib/utils.ts` — TC validation, date helpers, string helpers
- `src/lib/supabase/` — browser, server, and admin clients
- `src/lib/email.ts` — email notification functions (Resend)
- `src/lib/i18n.ts` — internationalization (PT, EN, ES)

---

## What You Need To Do Next

These steps cannot be automated — they require your Supabase account and credentials.

### 1. Install Node.js (if not done)
- Download from https://nodejs.org (LTS version)
- Verify: `node --version` should show v18 or higher

### 2. Create a Supabase project
- Go to https://supabase.com → New Project → name it `tibia-services`
- Go to Project Settings → API and copy the 3 keys

### 3. Create `.env.local`
Copy `.env.local.example` to `.env.local` and fill in your Supabase keys.

### 4. Run the database schema and migrations
- Supabase dashboard → SQL Editor
- Paste contents of `supabase/schema.sql` and run it
- Run every numbered file in `supabase/migrations/` in order

### 5. Configure Supabase Auth
- Supabase dashboard → Authentication → Settings → Email
- Disable "Enable email confirmations" only for local development; keep it enabled in production

### 6. Create the Storage bucket
- Supabase dashboard → Storage → New bucket
- Name: `verifications`, set to **Private**

### 7. Install dependencies and run
```bash
cd C:/Users/david/OneDrive/Desktop/Programas/tibia-services
npm install
npm run dev
```
Open http://localhost:3000

### 8. Create your admin account
- Register on the site, confirm the email in production, then promote by verified user ID:
```sql
UPDATE profiles SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-000000000000'
AND EXISTS (
  SELECT 1 FROM auth.users
  WHERE auth.users.id = profiles.id
    AND auth.users.email_confirmed_at IS NOT NULL
);
```

### 9. Deploy to Vercel
- Push to GitHub, import in Vercel, add all 7 env vars from `.env.local.example`, deploy

---

## How to Run Locally

```bash
npm run dev
# → http://localhost:3000
```

## How to Build for Production

```bash
npm run build
npm start
```

If build succeeds, it's ready for Vercel.

---

## Known Limitations

- **Realtime messaging via Supabase subscriptions** — uses initial fetch + INSERT subscription (postgres_changes). Not full bidirectional sync.
- **Character verification requires TibiaData API comment check** — the user must place a secret code in their Tibia.com character comment, then the API verifies it.
- **Admin panel supports PT/EN/ES** — server-side i18n via cookie-based `getServerT()` helper.
- **Timezone display** — times are shown in the serviceiro's selected UTC offset but not automatically converted to the viewer's timezone.

---

## File Reference

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Run first in Supabase SQL Editor |
| `supabase/migrations/` | Run every numbered migration after `schema.sql` |
| `.env.local.example` | Copy to `.env.local`, fill in your keys |
| `SETUP.md` | Full setup guide from zero |
| `HOW-TO-CHANGE.md` | How to modify the site |
| `docs/design-decisions.md` | Why things were built the way they were |
| `src/lib/constants.ts` | Edit vocations, gameplay types, TC limits |
| `tailwind.config.ts` | Edit colors and theme |
