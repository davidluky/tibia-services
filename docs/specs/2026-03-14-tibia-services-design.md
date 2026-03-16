# Tibia Services Marketplace — Design Specification

**Date:** 2026-03-14
**Author:** David (product), Claude (technical)
**Status:** Approved — ready for implementation

---

## What We Are Building

A web marketplace where Tibia players who offer account-sitting services ("serviceiros")
can be discovered by customers. Customers browse profiles, filter by vocation and gameplay
type, and contact serviceiros through the platform. After a service is completed, the
customer can leave a review.

The site is Portuguese-first (the Tibia service community in Brazil uses Portuguese terms
like "serviceiro"), but the codebase is in English.

---

## Core Concepts

### Roles

| Role | Description |
|------|-------------|
| **Guest** | Can browse profiles, cannot see contact info or book |
| **Customer** | Registered user who hires serviceiros |
| **Serviceiro** | Registered user who offers services |
| **Admin** | Platform owner — approves verifications, bans users, deletes reviews |

A user registers as either a customer or a serviceiro. A serviceiro can also book other
serviceiros (they are also a customer). Admins are created manually in Supabase.

### Serviceiro Profile

Each serviceiro profile contains:
- Display name
- Bio / description
- Vocations they play (from fixed list — see below)
- Gameplay types they offer (from fixed list — see below)
- Available weekdays (Mon–Sun, multi-select)
- Available hours (start time – end time, timezone stored as UTC offset)
- WhatsApp number (hidden until customer clicks "Show Contact")
- Discord handle (hidden until customer clicks "Show Contact")
- "Registered" badge (verified by admin)
- Completion counters per gameplay type (auto-calculated from completed bookings)
- Average rating (auto-calculated from reviews)

### Vocations (fixed list — no promoted versions)
- Knight
- Paladin
- Sorcerer
- Druid
- Monk

**Why fixed list:** Prevents inconsistent entries like "EK", "Elite Knight", "knight".
Promotes versions are excluded to keep the list short; serviceiros who play promoted
versions simply select the base vocation.

### Gameplay Types (fixed list)

| Key | Display name | Description |
|-----|-------------|-------------|
| `hunt_x1` | Hunt x1 | Solo hunting (1 player) |
| `hunt_x2` | Hunt x2 | Duo hunting (2 players) |
| `hunt_x3plus` | Hunt x3+ | Team hunting (3+ players) |
| `quests` | Quests | Quest completion services |
| `ks_pk` | KS/PK | Kill stealing or player killing services |
| `bestiary` | Bestiary | Killing creatures to complete bestiary entries |

**Why fixed list:** Same reason as vocations — consistency for filtering.

### Payment

Services are priced in **Tibia Coins (TC)** in multiples of 25.
- There is no real-money transaction on the platform
- Price is agreed in the booking thread
- Both parties mark payment as received in-game inside the booking
- The platform does NOT process or verify the actual TC transfer — it only tracks the
  agreed amount and whether both sides confirmed receipt

**Why TC not BRL:** The Tibia service market uses TC as the standard currency. It avoids
payment processor complexity, legal issues around brokering, and fees.

### Registered Tier

A serviceiro can apply for a "Registered" badge by:
1. Submitting their Tibia character name
2. Uploading a screenshot of their character (proves they own it)
3. Uploading a government ID (proves real identity)
4. Paying a small fee in TC (amount set by admin, tracked manually for now)

An admin reviews the submission in the admin panel and approves or rejects it.

**Why manual verification:** Automated character verification would require scraping
Tibia's website, which is fragile. Manual review also allows judgment calls.

**Why charge a fee:** Discourages fake accounts from obtaining the badge.

### Contact Reveal

Contact info (WhatsApp + Discord) is only shown after a logged-in user clicks
"Show Contact" on a serviceiro profile. This:
- Prevents scraping of contact data by bots
- Creates a light intent signal (customer chose to reveal = interested)
- Allows future analytics ("profile views vs contact reveals")

### Reviews

- Only customers with a **completed booking** with that serviceiro can leave a review
- One review per completed booking
- Rating: 1–5 stars
- Optional text comment
- Admin can delete any review

### Booking Flow

```
Customer clicks "Book" on serviceiro profile
  → Booking created (status: pending)
  → Serviceiro sees booking in dashboard, accepts or declines
  → If accepted (status: active):
      → Both see a message thread
      → Price is proposed by either party (in TC, multiples of 25)
      → Both confirm the price
      → Service happens in-game
      → Either party marks "payment sent/received"
      → Either party marks "service complete"
      → When BOTH mark complete → status: completed
      → Customer can now leave a review
  → If declined (status: declined):
      → Customer notified
```

**Why both must mark complete:** Prevents one-sided disputes (e.g. serviceiro marks
complete but customer says nothing was done).

### Messaging

Simple back-and-forth thread inside a booking. No real-time (WebSocket) — page polls
every 30 seconds and has a manual "Refresh" button. This keeps the architecture simple
and avoids WebSocket costs on the free tier.

---

## Visual Design

**Theme:** Dark, gold accents — inspired by Tibia's medieval/dark fantasy aesthetic.

**Color palette:**
```
Background:       #0a0a0f   (near black)
Card background:  #13131a   (dark navy)
Border:           #2a2a3a   (subtle dark border)
Primary / gold:   #c8a84b   (Tibia gold)
Primary bright:   #e6c56a   (hover gold)
Text primary:     #e8e8f0   (near white)
Text muted:       #6b6b8a   (grey)
Success green:    #4ade80
Error red:        #f87171
```

**Typography:** System font stack — no Google Fonts dependency, fast load.

**Style principles:**
- Cards with subtle gold borders on hover
- Smooth transitions (150ms ease)
- Mobile-first responsive
- Badge components for vocations and gameplay types
- Star rating component (filled/empty stars)

---

## Technical Architecture

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Full-stack in one project, SSR for SEO, free on Vercel |
| Language | TypeScript | Catches bugs at compile time, better DX |
| Styling | Tailwind CSS | Fast to write, consistent, no CSS files to manage |
| Database | Supabase (PostgreSQL) | Free tier, SQL (good for complex queries/filters), built-in auth |
| Auth | Supabase Auth | Built into Supabase, email+password, session management |
| File storage | Supabase Storage | For verification docs (screenshots, IDs) |
| Hosting | Vercel | Free tier, auto-deploy from git, zero config for Next.js |

### Why Next.js App Router (not Pages Router)
App Router is the current standard. Server Components reduce client JS bundle.
API routes live in `src/app/api/` — no separate backend needed.

### Why Supabase (not Firebase)
PostgreSQL handles complex queries well (filter by vocation AND gameplay type AND
available on Tuesday). Firebase's NoSQL model makes multi-field filtering expensive.
Supabase Row Level Security (RLS) enforces data access rules at the database level.

### Why no UI component library
Fewer dependencies = fewer things to break. Tailwind + custom components gives full
control over the Tibia-themed design. Adding shadcn/ui later is easy if needed.

---

## Database Schema

See `supabase/schema.sql` for the full SQL. Summary:

### `profiles` (extends Supabase auth.users)
```
id              uuid (FK → auth.users)
role            enum: customer | serviceiro | admin
display_name    text
bio             text
whatsapp        text  (encrypted at rest via Supabase)
discord         text
is_banned       boolean (default false)
created_at      timestamptz
```

### `serviceiro_profiles`
```
id                  uuid (FK → profiles)
vocations           text[]   (subset of fixed list)
gameplay_types      text[]   (subset of fixed list)
available_weekdays  text[]   (mon|tue|wed|thu|fri|sat|sun)
available_from      time
available_to        time
timezone_offset     integer  (hours from UTC, e.g. -3 for BRT)
is_registered       boolean
registered_at       timestamptz
```

### `verification_requests`
```
id                  uuid
serviceiro_id       uuid (FK → profiles)
character_name      text
screenshot_url      text  (Supabase Storage path)
id_document_url     text  (Supabase Storage path)
fee_paid            boolean (manually set by admin)
status              enum: pending | approved | rejected
admin_notes         text
submitted_at        timestamptz
reviewed_at         timestamptz
reviewed_by         uuid (FK → profiles)
```

### `bookings`
```
id                  uuid
customer_id         uuid (FK → profiles)
serviceiro_id       uuid (FK → profiles)
service_type        text  (one of the gameplay_types keys)
agreed_price_tc     integer  (multiple of 25, nullable until agreed)
price_confirmed_by_customer    boolean
price_confirmed_by_serviceiro  boolean
payment_sent_by_customer       boolean
payment_received_by_serviceiro boolean
complete_by_customer           boolean
complete_by_serviceiro         boolean
status              enum: pending | active | completed | declined | cancelled
created_at          timestamptz
completed_at        timestamptz
```

### `messages`
```
id            uuid
booking_id    uuid (FK → bookings)
sender_id     uuid (FK → profiles)
content       text
created_at    timestamptz
```

### `reviews`
```
id              uuid
booking_id      uuid (FK → bookings, UNIQUE — one review per booking)
reviewer_id     uuid (FK → profiles)
serviceiro_id   uuid (FK → profiles)
rating          integer (1–5)
comment         text
is_visible      boolean (admin can set false to "delete")
created_at      timestamptz
```

---

## Pages & Routes

```
/                           Landing page (hero, search, featured serviceiros)
/browse                     Browse + filter (vocation, gameplay type, weekday, registered)
/serviceiro/[id]            Public profile (contact hidden behind click)
/auth/login                 Login page
/auth/register              Registration (choose role: customer or serviceiro)
/dashboard                  Serviceiro: manage profile, availability, view bookings
/dashboard/verification     Submit Registered tier application
/bookings                   List of all my bookings (customer or serviceiro view)
/bookings/[id]              Booking thread (messages, price, status actions)
/admin                      Admin dashboard (redirect non-admins)
/admin/verifications        List pending verification requests
/admin/verifications/[id]   Review a verification request
/admin/users                List all users, ban/unban
/admin/reviews              List all reviews, delete
```

---

## Security Decisions

**Row Level Security (RLS) on all tables:**
- Profiles: anyone can read non-sensitive fields; only owner can write; contact fields
  (whatsapp, discord) only readable by authenticated users who have an active or
  completed booking with that serviceiro (or admin)
- Bookings: only the two parties can read/write
- Messages: only booking participants can read/write
- Verification docs: only the submitter and admins can read storage files
- Reviews: everyone can read visible reviews; only reviewer can create; admin can update

**Contact reveal logic:** Implemented server-side in an API route — the client never
receives the raw WhatsApp/Discord values until the server confirms a qualifying booking
exists. This prevents a frontend-only bypass.

**Admin role check:** Every admin API route checks `profiles.role = 'admin'` server-side
using the Supabase service role key. Never trust the client to claim admin status.

---

## Deployment

See `SETUP.md` for step-by-step setup instructions.

**Environment variables required:**
```
NEXT_PUBLIC_SUPABASE_URL        (from Supabase project settings)
NEXT_PUBLIC_SUPABASE_ANON_KEY   (from Supabase project settings)
SUPABASE_SERVICE_ROLE_KEY       (from Supabase project settings — server only, never public)
```

**Cost at zero traffic:** $0/month (Vercel free + Supabase free tier)
**Cost at moderate traffic (< 50k MAU):** $0/month
**Cost at high traffic:** Supabase Pro ($25/month) + Vercel stays free for most cases

---

## What Is NOT Included (intentional scope limits)

- **No real-money payment processing** — TC is in-game, no Stripe needed
- **No real-time chat** — simple poll-based messaging is enough for this use case
- **No email notifications** — Supabase can add this later with Edge Functions
- **No mobile app** — responsive web is sufficient
- **No promoted vocations** — base vocations only, per product decision
- **No public API** — not needed for v1

---

## Future Improvements (not in v1)

- Email notifications for booking status changes
- Serviceiro availability calendar view
- Dispute resolution flow
- Featured/promoted listings (paid)
- Tibia character verification via tibia.com scraping
- Multi-language support (PT-BR first, then EN)
