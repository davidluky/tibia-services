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

**Tech files**
- `supabase/schema.sql` — complete DB schema, RLS, triggers, indexes
- `src/lib/constants.ts` — vocations, gameplay types, weekdays, TC limits
- `src/lib/types.ts` — all TypeScript types matching DB schema
- `src/lib/utils.ts` — TC validation, date helpers, string helpers
- `src/lib/supabase/` — browser, server, and admin clients

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

### 4. Run the database schema
- Supabase dashboard → SQL Editor
- Paste contents of `supabase/schema.sql` and run it

### 5. Configure Supabase Auth
- Supabase dashboard → Authentication → Settings → Email
- Disable "Enable email confirmations" (easier for development)

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
- Register on the site, then run in Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

### 9. Deploy to Vercel
- Push to GitHub, import in Vercel, add the 3 env vars, deploy

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

- **No real-time chat** — messages refresh every 30 seconds (polling). Acceptable for negotiations, but not instant.
- **No email notifications** — booking status changes do not send emails. See HOW-TO-CHANGE.md to add this.
- **No character verification via API** — the Registered badge requires manual review of a screenshot. An improvement would be to verify via TibiaData API.
- **No dispute resolution** — if a booking goes wrong, there is no formal dispute flow. Parties must resolve off-platform.
- **Timezone display** — times are shown in the serviceiro's selected UTC offset but not automatically converted to the viewer's timezone.

---

## File Reference

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Run this in Supabase SQL Editor |
| `.env.local.example` | Copy to `.env.local`, fill in your keys |
| `SETUP.md` | Full setup guide from zero |
| `HOW-TO-CHANGE.md` | How to modify the site |
| `docs/design-decisions.md` | Why things were built the way they were |
| `src/lib/constants.ts` | Edit vocations, gameplay types, TC limits |
| `tailwind.config.ts` | Edit colors and theme |
