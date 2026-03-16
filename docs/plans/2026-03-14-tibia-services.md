# Tibia Services Marketplace — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if
> subagents available) or superpowers:executing-plans to implement this plan. Steps use
> checkbox (`- [ ]`) syntax for tracking.

> **IMPORTANT CONTEXT FOR NEW SESSIONS:**
> This plan was written in a prior conversation. The user (David) is a beginner developer
> building a marketplace website for Tibia game services. Read the full design spec at
> `docs/specs/2026-03-14-tibia-services-design.md` before starting. The project folder
> is at `C:/Users/david/OneDrive/Desktop/Programas/tibia-services/`.
> Build everything documented below autonomously. When done, leave a `DONE.md` file at
> the project root summarising what was built and what the user needs to do next.

**Goal:** Build a full-stack Next.js + Supabase marketplace website for Tibia game
service providers.

**Architecture:** Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase
(PostgreSQL + Auth + Storage) — deployed to Vercel.

**Tech Stack:** Node.js, Next.js 14, TypeScript, Tailwind CSS, Supabase JS v2

**Working directory for all commands:** `C:/Users/david/OneDrive/Desktop/Programas/tibia-services/`

---

## Prerequisites (user must do these — cannot be automated)

Before executing this plan, the user must:

1. **Install Node.js** (if not already): https://nodejs.org — download LTS version
   - Verify: `node --version` should print v18 or higher

2. **Create a Supabase project:**
   - Go to https://supabase.com → sign up free → New Project
   - Name it `tibia-services`
   - Save the database password somewhere safe
   - Go to Project Settings → API and copy:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

3. **Create a `.env.local` file** in the project root (after Task 1 creates the folder):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Run the database schema** in Supabase:
   - Go to Supabase dashboard → SQL Editor
   - Paste the contents of `supabase/schema.sql` and run it

5. **Deploy to Vercel** (after building locally):
   - Go to https://vercel.com → Import Project → connect GitHub repo
   - Add the 3 environment variables from step 3
   - Deploy

---

## File Structure (what we are building)

```
tibia-services/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (dark theme, fonts)
│   │   ├── page.tsx                      # Landing page
│   │   ├── browse/
│   │   │   └── page.tsx                  # Browse + filter page
│   │   ├── serviceiro/
│   │   │   └── [id]/
│   │   │       └── page.tsx              # Serviceiro public profile
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx                  # Serviceiro dashboard
│   │   │   └── verification/page.tsx     # Apply for Registered badge
│   │   ├── bookings/
│   │   │   ├── page.tsx                  # My bookings list
│   │   │   └── [id]/page.tsx             # Booking thread
│   │   ├── admin/
│   │   │   ├── page.tsx                  # Admin home
│   │   │   ├── verifications/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── reviews/page.tsx
│   │   └── api/
│   │       ├── contact/[id]/route.ts     # Reveal contact info (server-side check)
│   │       ├── bookings/route.ts         # Create booking
│   │       ├── bookings/[id]/route.ts    # Update booking status
│   │       ├── messages/route.ts         # Send message
│   │       └── admin/
│   │           ├── verify/[id]/route.ts
│   │           ├── ban/[id]/route.ts
│   │           └── review/[id]/route.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Badge.tsx                 # Vocation / gameplay type badges
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Stars.tsx                 # Star rating display
│   │   │   └── Modal.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── serviceiro/
│   │   │   ├── ServiceiroCard.tsx        # Card shown in browse list
│   │   │   ├── ServiceiroFilters.tsx     # Filter sidebar/bar
│   │   │   └── ContactReveal.tsx         # "Show Contact" button + modal
│   │   ├── booking/
│   │   │   ├── BookingThread.tsx         # Full booking page
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── BookingActions.tsx        # Confirm price, mark complete, etc.
│   │   └── review/
│   │       ├── ReviewForm.tsx
│   │       └── ReviewCard.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser Supabase client
│   │   │   ├── server.ts                 # Server-side Supabase client
│   │   │   └── admin.ts                  # Service-role client (admin ops)
│   │   ├── constants.ts                  # Vocations, gameplay types, weekdays
│   │   ├── types.ts                      # All TypeScript types
│   │   └── utils.ts                      # Helpers (TC validation, date format, etc.)
├── supabase/
│   └── schema.sql                        # Full database schema + RLS policies
├── docs/
│   ├── specs/2026-03-14-tibia-services-design.md
│   ├── plans/2026-03-14-tibia-services.md  (this file)
│   └── design-decisions.md               # All decisions with reasons
├── public/
│   └── tibia-logo.svg                    # Placeholder logo
├── .env.local.example                    # Template (no real secrets)
├── SETUP.md                              # How to set up from scratch
├── HOW-TO-CHANGE.md                      # Guide for making common modifications
├── DONE.md                               # Created at end: what was built + next steps
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: Project Scaffolding

**Files:** Creates the entire project skeleton.

- [ ] **Step 1: Create Next.js project**

  Run from `C:/Users/david/OneDrive/Desktop/Programas/`:
  ```bash
  npx create-next-app@latest tibia-services --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
  ```
  Answer prompts: accept all defaults.

- [ ] **Step 2: Install Supabase and dependencies**

  ```bash
  cd tibia-services
  npm install @supabase/supabase-js @supabase/ssr
  ```

- [ ] **Step 3: Clean up Next.js default files**

  Delete `src/app/page.tsx` content (we will replace it).
  Delete `public/next.svg` and `public/vercel.svg` (not needed).

- [ ] **Step 4: Create `.env.local.example`**

  Create `C:/Users/david/OneDrive/Desktop/Programas/tibia-services/.env.local.example`:
  ```
  # Copy this file to .env.local and fill in your values
  # Get these from: Supabase Dashboard → Project Settings → API

  NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
  ```

- [ ] **Step 5: Configure Tailwind with Tibia theme colors**

  Replace `tailwind.config.ts` content:
  ```typescript
  import type { Config } from 'tailwindcss'

  const config: Config = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          // Tibia-inspired dark gold theme
          bg: {
            primary: '#0a0a0f',    // near-black background
            card: '#13131a',       // card background
            hover: '#1a1a24',      // card hover state
          },
          border: {
            DEFAULT: '#2a2a3a',
            gold: '#c8a84b',
          },
          gold: {
            DEFAULT: '#c8a84b',    // Tibia gold
            bright: '#e6c56a',     // hover/active gold
            dim: '#8a7030',        // muted gold
          },
          text: {
            primary: '#e8e8f0',
            muted: '#6b6b8a',
            gold: '#c8a84b',
          },
          status: {
            success: '#4ade80',
            error: '#f87171',
            warning: '#fbbf24',
            info: '#60a5fa',
          }
        },
        fontFamily: {
          // System font stack — no external dependency, fast loading
          sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        },
        animation: {
          'fade-in': 'fadeIn 0.15s ease-in-out',
        },
        keyframes: {
          fadeIn: {
            '0%': { opacity: '0', transform: 'translateY(4px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' },
          }
        }
      },
    },
    plugins: [],
  }
  export default config
  ```

- [ ] **Step 6: Set up global CSS**

  Replace `src/app/globals.css`:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  /* Base dark theme */
  body {
    @apply bg-bg-primary text-text-primary;
  }

  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }

  /* Custom scrollbar for dark theme */
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    @apply bg-bg-primary;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-border rounded-full;
  }
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-gold-dim;
  }

  /* Gold focus ring for accessibility */
  *:focus-visible {
    @apply outline outline-2 outline-gold outline-offset-2;
  }
  ```

- [ ] **Step 7: Commit**
  ```bash
  git init
  git add .
  git commit -m "chore: scaffold Next.js project with Tibia theme"
  ```

---

## Task 2: Constants, Types, and Supabase Clients

**Files:** `src/lib/constants.ts`, `src/lib/types.ts`, `src/lib/utils.ts`,
`src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`

- [ ] **Step 1: Write constants**

  Create `src/lib/constants.ts`:
  ```typescript
  // ─── Vocations ────────────────────────────────────────────────────────────────
  // Fixed list — no promoted versions (e.g. no "Elite Knight").
  // Keeping base vocations only prevents inconsistent entries and keeps filters simple.
  export const VOCATIONS = [
    { key: 'knight',   label: 'Knight' },
    { key: 'paladin',  label: 'Paladin' },
    { key: 'sorcerer', label: 'Sorcerer' },
    { key: 'druid',    label: 'Druid' },
    { key: 'monk',     label: 'Monk' },
  ] as const

  export type VocationKey = typeof VOCATIONS[number]['key']

  // ─── Gameplay Types ───────────────────────────────────────────────────────────
  // hunt_x1 = solo, hunt_x2 = duo, hunt_x3plus = 3+ players, quests, ks_pk
  // These are the service categories a serviceiro can offer.
  // Completion counters are tracked per gameplay type in the reviews/bookings data.
  export const GAMEPLAY_TYPES = [
    { key: 'hunt_x1',    label: 'Hunt x1',   description: 'Solo hunting' },
    { key: 'hunt_x2',    label: 'Hunt x2',   description: 'Duo hunting' },
    { key: 'hunt_x3plus',label: 'Hunt x3+',  description: 'Team hunting (3+ players)' },
    { key: 'quests',     label: 'Quests',    description: 'Quest completion' },
    { key: 'ks_pk',      label: 'KS/PK',     description: 'Kill stealing / Player killing' },
    { key: 'bestiary',   label: 'Bestiary',  description: 'Killing creatures for bestiary completion' },
  ] as const

  export type GameplayTypeKey = typeof GAMEPLAY_TYPES[number]['key']

  // ─── Weekdays ─────────────────────────────────────────────────────────────────
  export const WEEKDAYS = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ] as const

  export type WeekdayKey = typeof WEEKDAYS[number]['key']

  // ─── Booking Statuses ─────────────────────────────────────────────────────────
  export const BOOKING_STATUSES = {
    PENDING:   'pending',    // created, waiting for serviceiro to accept
    ACTIVE:    'active',     // accepted, in progress
    COMPLETED: 'completed',  // both parties marked complete
    DECLINED:  'declined',   // serviceiro declined
    CANCELLED: 'cancelled',  // either party cancelled while active
  } as const

  // ─── Tibia Coins ─────────────────────────────────────────────────────────────
  // TC prices must be multiples of 25 (the smallest TC denomination in the game).
  export const TC_INCREMENT = 25
  export const TC_MIN = 25
  export const TC_MAX = 100000
  ```

- [ ] **Step 2: Write TypeScript types**

  Create `src/lib/types.ts`:
  ```typescript
  import type { VocationKey, GameplayTypeKey, WeekdayKey } from './constants'

  // ─── Database row types ────────────────────────────────────────────────────────
  // These match the Supabase database schema exactly.

  export type UserRole = 'customer' | 'serviceiro' | 'admin'

  export interface Profile {
    id: string
    role: UserRole
    display_name: string
    bio: string | null
    whatsapp: string | null        // only returned by /api/contact/[id]
    discord: string | null         // only returned by /api/contact/[id]
    is_banned: boolean
    created_at: string
  }

  export interface ServiceiroProfile {
    id: string
    vocations: VocationKey[]
    gameplay_types: GameplayTypeKey[]
    available_weekdays: WeekdayKey[]
    available_from: string           // "HH:MM" format
    available_to: string             // "HH:MM" format
    timezone_offset: number          // hours from UTC (e.g. -3 for BRT)
    is_registered: boolean
    registered_at: string | null
  }

  // Combined type used in most UI components
  export interface ServiceiroWithProfile extends ServiceiroProfile {
    profile: Profile
    avg_rating: number | null
    review_count: number
    completion_counts: Record<GameplayTypeKey, number>
  }

  export interface Booking {
    id: string
    customer_id: string
    serviceiro_id: string
    service_type: GameplayTypeKey
    agreed_price_tc: number | null
    price_confirmed_by_customer: boolean
    price_confirmed_by_serviceiro: boolean
    payment_sent_by_customer: boolean
    payment_received_by_serviceiro: boolean
    complete_by_customer: boolean
    complete_by_serviceiro: boolean
    status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled'
    created_at: string
    completed_at: string | null
    // Joined fields
    customer?: Profile
    serviceiro?: Profile
  }

  export interface Message {
    id: string
    booking_id: string
    sender_id: string
    content: string
    created_at: string
    sender?: Profile
  }

  export interface Review {
    id: string
    booking_id: string
    reviewer_id: string
    serviceiro_id: string
    rating: number   // 1–5
    comment: string | null
    is_visible: boolean
    created_at: string
    reviewer?: Profile
  }

  export interface VerificationRequest {
    id: string
    serviceiro_id: string
    character_name: string
    screenshot_url: string
    id_document_url: string
    fee_paid: boolean
    status: 'pending' | 'approved' | 'rejected'
    admin_notes: string | null
    submitted_at: string
    reviewed_at: string | null
    reviewed_by: string | null
  }

  // ─── API response types ────────────────────────────────────────────────────────
  export interface ContactInfo {
    whatsapp: string
    discord: string
  }

  export interface ApiError {
    error: string
  }
  ```

- [ ] **Step 3: Write utility functions**

  Create `src/lib/utils.ts`:
  ```typescript
  import { TC_INCREMENT, TC_MIN, TC_MAX } from './constants'

  // ─── Tibia Coins validation ────────────────────────────────────────────────────
  // TC must be in multiples of 25 (game denomination).
  export function isValidTC(amount: number): boolean {
    return (
      Number.isInteger(amount) &&
      amount >= TC_MIN &&
      amount <= TC_MAX &&
      amount % TC_INCREMENT === 0
    )
  }

  // Round a TC amount to the nearest multiple of 25
  export function snapToTC(amount: number): number {
    return Math.round(amount / TC_INCREMENT) * TC_INCREMENT
  }

  // Format TC for display: "1,250 TC"
  export function formatTC(amount: number): string {
    return `${amount.toLocaleString('pt-BR')} TC`
  }

  // ─── Date/time helpers ────────────────────────────────────────────────────────
  // Format a UTC timestamp to a readable local date
  export function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  // How long ago (e.g. "3 hours ago")
  export function timeAgo(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'agora'
    if (minutes < 60) return `${minutes} min atrás`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h atrás`
    const days = Math.floor(hours / 24)
    return `${days}d atrás`
  }

  // ─── String helpers ────────────────────────────────────────────────────────────
  // Truncate text with ellipsis
  export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 3) + '...'
  }

  // Capitalise first letter
  export function capitalise(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  ```

- [ ] **Step 4: Write Supabase browser client**

  Create `src/lib/supabase/client.ts`:
  ```typescript
  // Browser-side Supabase client (used in Client Components)
  // Uses the public anon key — safe to expose in browser.
  import { createBrowserClient } from '@supabase/ssr'

  export function createClient() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  ```

- [ ] **Step 5: Write Supabase server client**

  Create `src/lib/supabase/server.ts`:
  ```typescript
  // Server-side Supabase client (used in Server Components and API routes)
  // Still uses the anon key but runs server-side — respects RLS policies.
  import { createServerClient } from '@supabase/ssr'
  import { cookies } from 'next/headers'

  export function createClient() {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
  }
  ```

- [ ] **Step 6: Write Supabase admin client**

  Create `src/lib/supabase/admin.ts`:
  ```typescript
  // Admin Supabase client using the service role key.
  // NEVER import this in client components — it bypasses all RLS policies.
  // Only used in API routes for admin operations (ban user, approve verification, etc.)
  import { createClient } from '@supabase/supabase-js'

  export function createAdminClient() {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only, never expose to client
    )
  }
  ```

- [ ] **Step 7: Commit**
  ```bash
  git add .
  git commit -m "feat: add constants, types, utils, and Supabase clients"
  ```

---

## Task 3: Database Schema

**Files:** `supabase/schema.sql`

- [ ] **Step 1: Write full schema**

  Create `supabase/schema.sql`:
  ```sql
  -- ============================================================
  -- Tibia Services Marketplace — Database Schema
  -- Run this in Supabase Dashboard → SQL Editor
  -- ============================================================

  -- Enable UUID extension (usually already enabled in Supabase)
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- ─── ENUMS ────────────────────────────────────────────────────────────────────

  CREATE TYPE user_role AS ENUM ('customer', 'serviceiro', 'admin');
  CREATE TYPE booking_status AS ENUM ('pending', 'active', 'completed', 'declined', 'cancelled');
  CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

  -- ─── PROFILES ─────────────────────────────────────────────────────────────────
  -- Extends Supabase auth.users. Created automatically on signup via trigger.

  CREATE TABLE profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role          user_role NOT NULL DEFAULT 'customer',
    display_name  TEXT NOT NULL,
    bio           TEXT,
    -- Contact info: only returned by server-side API after booking check
    whatsapp      TEXT,
    discord       TEXT,
    is_banned     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- ─── SERVICEIRO PROFILES ──────────────────────────────────────────────────────
  -- Extra data only for serviceiro-role users.

  CREATE TABLE serviceiro_profiles (
    id                  UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    -- Arrays store selected items from the fixed lists in constants.ts
    vocations           TEXT[] NOT NULL DEFAULT '{}',
    gameplay_types      TEXT[] NOT NULL DEFAULT '{}',
    available_weekdays  TEXT[] NOT NULL DEFAULT '{}',
    available_from      TIME,
    available_to        TIME,
    -- UTC offset in hours (e.g. -3 for BRT, Brazil Standard Time)
    timezone_offset     INTEGER NOT NULL DEFAULT -3,
    is_registered       BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at       TIMESTAMPTZ
  );

  -- ─── VERIFICATION REQUESTS ────────────────────────────────────────────────────

  CREATE TABLE verification_requests (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serviceiro_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    character_name    TEXT NOT NULL,
    -- Storage paths — full URLs constructed in code using Supabase Storage
    screenshot_url    TEXT NOT NULL,
    id_document_url   TEXT NOT NULL,
    -- Admin manually marks this true after receiving TC payment in-game
    fee_paid          BOOLEAN NOT NULL DEFAULT FALSE,
    status            verification_status NOT NULL DEFAULT 'pending',
    admin_notes       TEXT,
    submitted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at       TIMESTAMPTZ,
    reviewed_by       UUID REFERENCES profiles(id)
  );

  -- ─── BOOKINGS ─────────────────────────────────────────────────────────────────

  CREATE TABLE bookings (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id                     UUID NOT NULL REFERENCES profiles(id),
    serviceiro_id                   UUID NOT NULL REFERENCES profiles(id),
    -- service_type matches a key from GAMEPLAY_TYPES in constants.ts
    service_type                    TEXT NOT NULL,
    -- Price agreed in Tibia Coins (multiples of 25). NULL until negotiated.
    agreed_price_tc                 INTEGER,
    -- Both parties must confirm the price before it is locked
    price_confirmed_by_customer     BOOLEAN NOT NULL DEFAULT FALSE,
    price_confirmed_by_serviceiro   BOOLEAN NOT NULL DEFAULT FALSE,
    -- Both parties must confirm payment (TC sent in-game, not verified by platform)
    payment_sent_by_customer        BOOLEAN NOT NULL DEFAULT FALSE,
    payment_received_by_serviceiro  BOOLEAN NOT NULL DEFAULT FALSE,
    -- Both parties must mark complete to move to 'completed' status
    complete_by_customer            BOOLEAN NOT NULL DEFAULT FALSE,
    complete_by_serviceiro          BOOLEAN NOT NULL DEFAULT FALSE,
    status                          booking_status NOT NULL DEFAULT 'pending',
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at                    TIMESTAMPTZ
  );

  -- ─── MESSAGES ─────────────────────────────────────────────────────────────────

  CREATE TABLE messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES profiles(id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- ─── REVIEWS ──────────────────────────────────────────────────────────────────

  CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- UNIQUE ensures one review per booking
    booking_id      UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_id     UUID NOT NULL REFERENCES profiles(id),
    serviceiro_id   UUID NOT NULL REFERENCES profiles(id),
    rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT,
    -- Admin sets is_visible = false instead of deleting (preserves audit trail)
    is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- ─── COMPLETION COUNTERS VIEW ─────────────────────────────────────────────────
  -- Efficient read of "how many completed services per gameplay type" per serviceiro.
  -- Used on profile pages. Recalculated on every read (Supabase handles caching).

  CREATE VIEW serviceiro_completion_counts AS
  SELECT
    serviceiro_id,
    service_type,
    COUNT(*) AS count
  FROM bookings
  WHERE status = 'completed'
  GROUP BY serviceiro_id, service_type;

  -- ─── TRIGGER: create profile on signup ────────────────────────────────────────
  -- When a new user signs up via Supabase Auth, auto-create a profile row.
  -- The role and display_name come from user_metadata set during signup.

  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO profiles (id, role, display_name)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'role')::user_role,
      NEW.raw_user_meta_data->>'display_name'
    );

    -- If registering as serviceiro, also create the serviceiro_profiles row
    IF (NEW.raw_user_meta_data->>'role') = 'serviceiro' THEN
      INSERT INTO serviceiro_profiles (id) VALUES (NEW.id);
    END IF;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

  -- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
  -- RLS ensures users can only access data they are allowed to see.
  -- The service role key (admin client) bypasses all RLS.

  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE serviceiro_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
  ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

  -- Profiles: public read of non-sensitive fields (contact fields handled by API)
  CREATE POLICY "profiles_public_read" ON profiles
    FOR SELECT USING (NOT is_banned);

  CREATE POLICY "profiles_own_write" ON profiles
    FOR UPDATE USING (auth.uid() = id);

  -- Serviceiro profiles: public read
  CREATE POLICY "serviceiro_profiles_public_read" ON serviceiro_profiles
    FOR SELECT USING (true);

  CREATE POLICY "serviceiro_profiles_own_write" ON serviceiro_profiles
    FOR ALL USING (auth.uid() = id);

  -- Verification requests: only owner and admins
  CREATE POLICY "verif_own_read" ON verification_requests
    FOR SELECT USING (auth.uid() = serviceiro_id);

  CREATE POLICY "verif_own_insert" ON verification_requests
    FOR INSERT WITH CHECK (auth.uid() = serviceiro_id);

  -- Bookings: only the two parties
  CREATE POLICY "bookings_participant_read" ON bookings
    FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = serviceiro_id);

  CREATE POLICY "bookings_customer_insert" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

  CREATE POLICY "bookings_participant_update" ON bookings
    FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = serviceiro_id);

  -- Messages: only booking participants
  CREATE POLICY "messages_participant_read" ON messages
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM bookings
        WHERE bookings.id = messages.booking_id
        AND (bookings.customer_id = auth.uid() OR bookings.serviceiro_id = auth.uid())
      )
    );

  CREATE POLICY "messages_participant_insert" ON messages
    FOR INSERT WITH CHECK (
      auth.uid() = sender_id AND
      EXISTS (
        SELECT 1 FROM bookings
        WHERE bookings.id = messages.booking_id
        AND (bookings.customer_id = auth.uid() OR bookings.serviceiro_id = auth.uid())
        AND bookings.status = 'active'
      )
    );

  -- Reviews: public read of visible reviews; only reviewer can insert
  CREATE POLICY "reviews_public_read" ON reviews
    FOR SELECT USING (is_visible = true);

  CREATE POLICY "reviews_reviewer_insert" ON reviews
    FOR INSERT WITH CHECK (
      auth.uid() = reviewer_id AND
      EXISTS (
        SELECT 1 FROM bookings
        WHERE bookings.id = reviews.booking_id
        AND bookings.customer_id = auth.uid()
        AND bookings.status = 'completed'
      )
    );

  -- ─── INDEXES ──────────────────────────────────────────────────────────────────
  -- Speeds up the most common queries

  CREATE INDEX idx_serviceiro_profiles_vocations ON serviceiro_profiles USING GIN (vocations);
  CREATE INDEX idx_serviceiro_profiles_gameplay ON serviceiro_profiles USING GIN (gameplay_types);
  CREATE INDEX idx_serviceiro_profiles_weekdays ON serviceiro_profiles USING GIN (available_weekdays);
  CREATE INDEX idx_bookings_customer ON bookings (customer_id);
  CREATE INDEX idx_bookings_serviceiro ON bookings (serviceiro_id);
  CREATE INDEX idx_bookings_status ON bookings (status);
  CREATE INDEX idx_messages_booking ON messages (booking_id, created_at);
  CREATE INDEX idx_reviews_serviceiro ON reviews (serviceiro_id);
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add .
  git commit -m "feat: add Supabase database schema with RLS policies"
  ```

---

## Task 4: Root Layout and Shared Components

**Files:** `src/app/layout.tsx`, `src/components/layout/Navbar.tsx`,
`src/components/layout/Footer.tsx`, `src/components/ui/` (all UI primitives)

- [ ] **Step 1: Write root layout**

  Replace `src/app/layout.tsx`:
  ```tsx
  import type { Metadata } from 'next'
  import './globals.css'
  import { Navbar } from '@/components/layout/Navbar'
  import { Footer } from '@/components/layout/Footer'

  export const metadata: Metadata = {
    title: 'Tibia Services — Encontre seu Serviceiro',
    description: 'Marketplace de serviceiros para Tibia. Encontre players confiáveis para hunts, quests, e mais.',
  }

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="pt-BR">
        <body className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </body>
      </html>
    )
  }
  ```

- [ ] **Step 2: Write Navbar component**

  Create `src/components/layout/Navbar.tsx`:
  ```tsx
  'use client'
  import Link from 'next/link'
  import { useState, useEffect } from 'react'
  import { createClient } from '@/lib/supabase/client'
  import type { User } from '@supabase/supabase-js'

  export function Navbar() {
    const [user, setUser] = useState<User | null>(null)
    const supabase = createClient()

    useEffect(() => {
      // Get initial session
      supabase.auth.getUser().then(({ data }) => setUser(data.user))
      // Listen for auth changes (login/logout)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
        setUser(session?.user ?? null)
      })
      return () => subscription.unsubscribe()
    }, [])

    const handleLogout = async () => {
      await supabase.auth.signOut()
      window.location.href = '/'
    }

    return (
      <nav className="border-b border-border bg-bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-gold font-bold text-xl tracking-wide hover:text-gold-bright transition-colors">
            ⚔ Tibia Services
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-6">
            <Link href="/browse" className="text-text-muted hover:text-text-primary transition-colors text-sm">
              Buscar
            </Link>

            {user ? (
              <>
                <Link href="/bookings" className="text-text-muted hover:text-text-primary transition-colors text-sm">
                  Reservas
                </Link>
                <Link href="/dashboard" className="text-text-muted hover:text-text-primary transition-colors text-sm">
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-text-muted hover:text-status-error transition-colors text-sm"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-text-muted hover:text-text-primary transition-colors text-sm">
                  Entrar
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-gold text-bg-primary px-4 py-2 rounded-md text-sm font-semibold hover:bg-gold-bright transition-colors"
                >
                  Cadastrar
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    )
  }
  ```

- [ ] **Step 3: Write Footer component**

  Create `src/components/layout/Footer.tsx`:
  ```tsx
  export function Footer() {
    return (
      <footer className="border-t border-border bg-bg-card mt-20">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-text-muted text-sm">
          <p>© {new Date().getFullYear()} Tibia Services. Não afiliado à CipSoft GmbH.</p>
          <p className="mt-1 text-xs">
            Tibia é marca registrada da CipSoft GmbH. Todos os nomes de vocação e itens pertencem aos seus respectivos donos.
          </p>
        </div>
      </footer>
    )
  }
  ```

- [ ] **Step 4: Write UI primitives (Button, Card, Badge, Input, Stars, Modal)**

  Create `src/components/ui/Button.tsx`:
  ```tsx
  import { type ButtonHTMLAttributes } from 'react'
  import { clsx } from 'clsx' // install: npm install clsx

  type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
  type Size = 'sm' | 'md' | 'lg'

  interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant
    size?: Size
    loading?: boolean
  }

  const variants: Record<Variant, string> = {
    primary:   'bg-gold text-bg-primary hover:bg-gold-bright font-semibold',
    secondary: 'bg-bg-card border border-border text-text-primary hover:border-gold',
    danger:    'bg-status-error/10 border border-status-error text-status-error hover:bg-status-error/20',
    ghost:     'text-text-muted hover:text-text-primary',
  }

  const sizes: Record<Size, string> = {
    sm:  'px-3 py-1.5 text-sm rounded',
    md:  'px-4 py-2 text-sm rounded-md',
    lg:  'px-6 py-3 text-base rounded-lg',
  }

  export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    children,
    className,
    ...props
  }: ButtonProps) {
    return (
      <button
        disabled={disabled || loading}
        className={clsx(
          'transition-colors inline-flex items-center gap-2 cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && <span className="animate-spin">⟳</span>}
        {children}
      </button>
    )
  }
  ```

  Install clsx:
  ```bash
  npm install clsx
  ```

  Create `src/components/ui/Card.tsx`:
  ```tsx
  interface CardProps {
    children: React.ReactNode
    className?: string
    gold?: boolean   // gold border variant (used for featured/registered cards)
  }

  export function Card({ children, className = '', gold = false }: CardProps) {
    return (
      <div className={`
        bg-bg-card rounded-xl border transition-all duration-150
        ${gold
          ? 'border-gold/40 hover:border-gold shadow-[0_0_20px_rgba(200,168,75,0.1)]'
          : 'border-border hover:border-gold/30'
        }
        ${className}
      `}>
        {children}
      </div>
    )
  }
  ```

  Create `src/components/ui/Badge.tsx`:
  ```tsx
  // Used to display vocation names and gameplay types as pills

  type BadgeVariant = 'vocation' | 'gameplay' | 'registered' | 'status'

  interface BadgeProps {
    label: string
    variant?: BadgeVariant
  }

  const styles: Record<BadgeVariant, string> = {
    vocation:   'bg-gold/10 text-gold border border-gold/20',
    gameplay:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    registered: 'bg-gold text-bg-primary font-semibold',
    status:     'bg-bg-primary text-text-muted border border-border',
  }

  export function Badge({ label, variant = 'status' }: BadgeProps) {
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs ${styles[variant]}`}>
        {label}
      </span>
    )
  }
  ```

  Create `src/components/ui/Stars.tsx`:
  ```tsx
  // Display a 1–5 star rating. Shows filled/empty stars.

  interface StarsProps {
    rating: number      // can be decimal (e.g. 4.3)
    max?: number        // default 5
    size?: 'sm' | 'md'
  }

  export function Stars({ rating, max = 5, size = 'sm' }: StarsProps) {
    const sizeClass = size === 'sm' ? 'text-sm' : 'text-lg'
    return (
      <span className={`${sizeClass} inline-flex gap-0.5`} title={`${rating.toFixed(1)} / ${max}`}>
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={i < Math.round(rating) ? 'text-gold' : 'text-text-muted/30'}>
            ★
          </span>
        ))}
      </span>
    )
  }
  ```

  Create `src/components/ui/Input.tsx`:
  ```tsx
  import { type InputHTMLAttributes } from 'react'

  interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
  }

  export function Input({ label, error, className = '', ...props }: InputProps) {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm text-text-muted">{label}</label>
        )}
        <input
          className={`
            bg-bg-primary border border-border rounded-md px-3 py-2 text-sm
            text-text-primary placeholder:text-text-muted
            focus:outline-none focus:border-gold transition-colors
            ${error ? 'border-status-error' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-status-error">{error}</p>}
      </div>
    )
  }
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add .
  git commit -m "feat: add root layout, navbar, footer, and UI primitives"
  ```

---

## Task 5: Auth Pages (Login + Register)

**Files:** `src/app/auth/login/page.tsx`, `src/app/auth/register/page.tsx`

- [ ] **Step 1: Write login page**

  Create `src/app/auth/login/page.tsx`:
  ```tsx
  'use client'
  import { useState } from 'react'
  import { useRouter } from 'next/navigation'
  import Link from 'next/link'
  import { createClient } from '@/lib/supabase/client'
  import { Input } from '@/components/ui/Input'
  import { Button } from '@/components/ui/Button'
  import { Card } from '@/components/ui/Card'

  export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')
      setLoading(true)

      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError('Email ou senha incorretos.')
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    }

    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Entrar</h1>
          <p className="text-text-muted text-sm mb-8">
            Não tem conta?{' '}
            <Link href="/auth/register" className="text-gold hover:text-gold-bright">
              Cadastre-se
            </Link>
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            {error && (
              <p className="text-status-error text-sm bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    )
  }
  ```

- [ ] **Step 2: Write register page**

  Create `src/app/auth/register/page.tsx`:
  ```tsx
  'use client'
  import { useState } from 'react'
  import { useRouter } from 'next/navigation'
  import Link from 'next/link'
  import { createClient } from '@/lib/supabase/client'
  import { Input } from '@/components/ui/Input'
  import { Button } from '@/components/ui/Button'
  import { Card } from '@/components/ui/Card'

  // Role explanation shown to the user during registration.
  // This choice cannot be changed later (would require admin action).
  const ROLE_OPTIONS = [
    {
      value: 'customer',
      title: 'Sou cliente',
      description: 'Quero contratar serviceiros para minhas contas.',
    },
    {
      value: 'serviceiro',
      title: 'Sou serviceiro',
      description: 'Ofereço serviços de hunting, quests e mais.',
    },
  ]

  export default function RegisterPage() {
    const [displayName, setDisplayName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState<'customer' | 'serviceiro'>('customer')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault()
      setError('')

      if (password.length < 8) {
        setError('Senha deve ter pelo menos 8 caracteres.')
        return
      }

      setLoading(true)

      // Pass role and display_name as user_metadata so the DB trigger can use them
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, display_name: displayName }
        }
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Redirect to home after signup (Supabase may require email confirmation
      // depending on project settings — disable it in Supabase Auth settings for easier dev)
      router.push('/')
      router.refresh()
    }

    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Criar conta</h1>
          <p className="text-text-muted text-sm mb-8">
            Já tem conta?{' '}
            <Link href="/auth/login" className="text-gold hover:text-gold-bright">
              Entrar
            </Link>
          </p>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {/* Role selection */}
            <div className="flex flex-col gap-2">
              <label className="text-sm text-text-muted">Sou um...</label>
              <div className="grid grid-cols-2 gap-3">
                {ROLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value as 'customer' | 'serviceiro')}
                    className={`
                      p-3 rounded-lg border text-left transition-all
                      ${role === opt.value
                        ? 'border-gold bg-gold/10 text-text-primary'
                        : 'border-border text-text-muted hover:border-gold/50'
                      }
                    `}
                  >
                    <div className="font-medium text-sm">{opt.title}</div>
                    <div className="text-xs mt-1 opacity-70">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Nome de exibição"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Seu nome no site"
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
            />

            {error && (
              <p className="text-status-error text-sm bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Criar conta
            </Button>
          </form>
        </Card>
      </div>
    )
  }
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add .
  git commit -m "feat: add login and register pages"
  ```

---

## Task 6: Landing Page + Browse Page

**Files:** `src/app/page.tsx`, `src/app/browse/page.tsx`,
`src/components/serviceiro/ServiceiroCard.tsx`, `src/components/serviceiro/ServiceiroFilters.tsx`

- [ ] **Step 1: Write ServiceiroCard component**

  Create `src/components/serviceiro/ServiceiroCard.tsx`:
  ```tsx
  import Link from 'next/link'
  import { Card } from '@/components/ui/Card'
  import { Badge } from '@/components/ui/Badge'
  import { Stars } from '@/components/ui/Stars'
  import { VOCATIONS, GAMEPLAY_TYPES } from '@/lib/constants'
  import { formatTC } from '@/lib/utils'
  import type { ServiceiroWithProfile } from '@/lib/types'

  interface ServiceiroCardProps {
    serviceiro: ServiceiroWithProfile
  }

  export function ServiceiroCard({ serviceiro }: ServiceiroCardProps) {
    const { profile } = serviceiro

    return (
      <Link href={`/serviceiro/${profile.id}`}>
        <Card
          gold={serviceiro.is_registered}
          className="p-5 cursor-pointer animate-fade-in hover:translate-y-[-2px] transition-all"
        >
          {/* Header: name + registered badge */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-text-primary">{profile.display_name}</h3>
              {serviceiro.avg_rating !== null && (
                <div className="flex items-center gap-2 mt-1">
                  <Stars rating={serviceiro.avg_rating} />
                  <span className="text-xs text-text-muted">
                    {serviceiro.avg_rating.toFixed(1)} ({serviceiro.review_count})
                  </span>
                </div>
              )}
            </div>
            {serviceiro.is_registered && (
              <Badge label="✓ Registrado" variant="registered" />
            )}
          </div>

          {/* Bio snippet */}
          {profile.bio && (
            <p className="text-sm text-text-muted mb-3 line-clamp-2">{profile.bio}</p>
          )}

          {/* Vocations */}
          {serviceiro.vocations.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {serviceiro.vocations.map(v => {
                const voc = VOCATIONS.find(x => x.key === v)
                return voc ? <Badge key={v} label={voc.label} variant="vocation" /> : null
              })}
            </div>
          )}

          {/* Gameplay types + completion counts */}
          {serviceiro.gameplay_types.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {serviceiro.gameplay_types.map(g => {
                const gp = GAMEPLAY_TYPES.find(x => x.key === g)
                const count = serviceiro.completion_counts[g as keyof typeof serviceiro.completion_counts] ?? 0
                return gp ? (
                  <Badge key={g} label={`${gp.label}${count > 0 ? ` ×${count}` : ''}`} variant="gameplay" />
                ) : null
              })}
            </div>
          )}

          {/* Available weekdays */}
          <div className="flex gap-1 mt-auto pt-2 border-t border-border">
            {['mon','tue','wed','thu','fri','sat','sun'].map(day => (
              <span
                key={day}
                className={`text-xs px-1.5 py-0.5 rounded ${
                  serviceiro.available_weekdays.includes(day)
                    ? 'bg-gold/10 text-gold'
                    : 'text-text-muted/30'
                }`}
              >
                {day.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        </Card>
      </Link>
    )
  }
  ```

- [ ] **Step 2: Write ServiceiroFilters component**

  Create `src/components/serviceiro/ServiceiroFilters.tsx`:
  ```tsx
  'use client'
  import { VOCATIONS, GAMEPLAY_TYPES, WEEKDAYS } from '@/lib/constants'

  export interface Filters {
    vocations: string[]
    gameplay_types: string[]
    weekdays: string[]
    registered_only: boolean
    search: string
  }

  interface FiltersProps {
    filters: Filters
    onChange: (filters: Filters) => void
  }

  export function ServiceiroFilters({ filters, onChange }: FiltersProps) {
    const toggle = (field: 'vocations' | 'gameplay_types' | 'weekdays', key: string) => {
      const current = filters[field]
      const updated = current.includes(key)
        ? current.filter(x => x !== key)
        : [...current, key]
      onChange({ ...filters, [field]: updated })
    }

    return (
      <aside className="flex flex-col gap-6">
        {/* Search */}
        <div>
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors"
          />
        </div>

        {/* Registered only */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.registered_only}
            onChange={e => onChange({ ...filters, registered_only: e.target.checked })}
            className="accent-gold"
          />
          <span className="text-sm text-text-primary">Somente Registrados ✓</span>
        </label>

        {/* Vocations */}
        <FilterGroup
          title="Vocação"
          items={VOCATIONS.map(v => ({ key: v.key, label: v.label }))}
          selected={filters.vocations}
          onToggle={key => toggle('vocations', key)}
          activeStyle="bg-gold/10 text-gold border-gold/30"
        />

        {/* Gameplay types */}
        <FilterGroup
          title="Tipo de Serviço"
          items={GAMEPLAY_TYPES.map(g => ({ key: g.key, label: g.label }))}
          selected={filters.gameplay_types}
          onToggle={key => toggle('gameplay_types', key)}
          activeStyle="bg-blue-500/10 text-blue-400 border-blue-500/30"
        />

        {/* Weekdays */}
        <FilterGroup
          title="Dias disponíveis"
          items={WEEKDAYS.map(w => ({ key: w.key, label: w.label }))}
          selected={filters.weekdays}
          onToggle={key => toggle('weekdays', key)}
          activeStyle="bg-gold/10 text-gold border-gold/30"
        />
      </aside>
    )
  }

  function FilterGroup({
    title, items, selected, onToggle, activeStyle,
  }: {
    title: string
    items: { key: string; label: string }[]
    selected: string[]
    onToggle: (key: string) => void
    activeStyle: string
  }) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          {title}
        </h3>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <button
              key={item.key}
              onClick={() => onToggle(item.key)}
              className={`
                px-3 py-1 rounded-full text-xs border transition-colors cursor-pointer
                ${selected.includes(item.key)
                  ? activeStyle
                  : 'border-border text-text-muted hover:border-gold/30'
                }
              `}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Write Landing page**

  Create `src/app/page.tsx` — hero section with animated gold title, search bar, and
  featured serviceiro cards. Query the top 6 registered serviceiros from Supabase for
  the featured section. Keep the hero copy in Portuguese.

  The hero should have:
  - Large headline: "Encontre seu Serviceiro de Confiança"
  - Sub-headline about TC-based services
  - CTA button → `/browse`
  - Below: "Serviceiros em Destaque" section with up to 6 ServiceiroCard components
  - A dark background with subtle gold gradient overlay

- [ ] **Step 4: Write Browse page**

  Create `src/app/browse/page.tsx` — server component that fetches all serviceiros,
  passes them to a client component for filtering. Layout: sidebar filters (desktop) or
  collapsible (mobile), main grid of ServiceiroCard components. Include result count.

- [ ] **Step 5: Commit**
  ```bash
  git add .
  git commit -m "feat: add landing page, browse page, serviceiro card and filters"
  ```

---

## Task 7: Serviceiro Public Profile Page

**Files:** `src/app/serviceiro/[id]/page.tsx`, `src/components/serviceiro/ContactReveal.tsx`,
`src/app/api/contact/[id]/route.ts`

- [ ] **Step 1: Write contact reveal API route**

  Create `src/app/api/contact/[id]/route.ts`:
  ```typescript
  // Returns WhatsApp + Discord for a serviceiro IF the requesting user has an
  // active or completed booking with them. Never exposes contact to strangers.
  import { NextRequest, NextResponse } from 'next/server'
  import { createClient } from '@/lib/supabase/server'

  export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    const supabase = createClient()

    // Verify the user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    // Check that a qualifying booking exists between this user and the serviceiro
    const { data: booking } = await supabase
      .from('bookings')
      .select('id')
      .eq('serviceiro_id', params.id)
      .eq('customer_id', user.id)
      .in('status', ['active', 'completed'])
      .limit(1)
      .single()

    if (!booking) {
      return NextResponse.json(
        { error: 'Você precisa ter uma reserva ativa com este serviceiro para ver o contato.' },
        { status: 403 }
      )
    }

    // Fetch contact info using admin client (bypasses RLS on contact fields)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('whatsapp, discord')
      .eq('id', params.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({
      whatsapp: profile.whatsapp ?? 'Não informado',
      discord:  profile.discord  ?? 'Não informado',
    })
  }
  ```

- [ ] **Step 2: Write ContactReveal component**

  Create `src/components/serviceiro/ContactReveal.tsx`:
  ```tsx
  'use client'
  import { useState } from 'react'
  import { Button } from '@/components/ui/Button'

  interface ContactRevealProps {
    serviceiroId: string
    isLoggedIn: boolean
  }

  export function ContactReveal({ serviceiroId, isLoggedIn }: ContactRevealProps) {
    const [contact, setContact] = useState<{ whatsapp: string; discord: string } | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleReveal = async () => {
      if (!isLoggedIn) {
        window.location.href = '/auth/login'
        return
      }

      setLoading(true)
      setError('')

      const res = await fetch(`/api/contact/${serviceiroId}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        setLoading(false)
        return
      }

      setContact(data)
      setLoading(false)
    }

    if (contact) {
      return (
        <div className="bg-bg-primary border border-gold/20 rounded-xl p-5 space-y-3 animate-fade-in">
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Contato</h3>
          <div className="flex items-center gap-3">
            <span className="text-lg">📱</span>
            <div>
              <p className="text-xs text-text-muted">WhatsApp</p>
              <p className="text-text-primary font-medium">{contact.whatsapp}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg">🎮</span>
            <div>
              <p className="text-xs text-text-muted">Discord</p>
              <p className="text-text-primary font-medium">{contact.discord}</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="border border-border rounded-xl p-5">
        <p className="text-sm text-text-muted mb-4">
          {isLoggedIn
            ? 'Faça uma reserva para revelar o contato do serviceiro.'
            : 'Entre na sua conta para ver o contato.'}
        </p>
        {error && <p className="text-status-error text-xs mb-3">{error}</p>}
        <Button onClick={handleReveal} loading={loading} className="w-full">
          {isLoggedIn ? 'Ver Contato' : 'Entrar para ver'}
        </Button>
      </div>
    )
  }
  ```

- [ ] **Step 3: Write Profile page**

  Create `src/app/serviceiro/[id]/page.tsx` — server component that fetches the full
  serviceiro data, renders their profile with:
  - Name + Registered badge
  - Star rating + review count
  - Bio
  - Vocation badges
  - Gameplay type badges with completion counters
  - Available weekdays grid
  - Available hours
  - ContactReveal component (passes isLoggedIn from server session check)
  - Book Now button (links to create booking)
  - Reviews list (visible, sorted by newest)

- [ ] **Step 4: Commit**
  ```bash
  git add .
  git commit -m "feat: add serviceiro profile page with contact reveal"
  ```

---

## Task 8: Booking System

**Files:** `src/app/bookings/page.tsx`, `src/app/bookings/[id]/page.tsx`,
`src/app/api/bookings/route.ts`, `src/app/api/bookings/[id]/route.ts`,
`src/app/api/messages/route.ts`, and booking components

- [ ] **Step 1: Write bookings API (create)**

  Create `src/app/api/bookings/route.ts` — POST endpoint, creates a booking,
  validates that the requesting user is a customer, serviceiro is different user,
  service_type is valid. Returns the new booking id.

- [ ] **Step 2: Write booking update API**

  Create `src/app/api/bookings/[id]/route.ts` — PATCH endpoint. Handles all
  status transitions:
  - accept: serviceiro accepts → active
  - decline: serviceiro declines → declined
  - cancel: either party cancels active booking → cancelled
  - set_price: either party proposes/confirms TC price
  - payment_sent: customer marks TC sent
  - payment_received: serviceiro marks TC received
  - mark_complete: either party marks done; when both mark → completed + completed_at

  When both parties mark complete, also trigger completion count update.

- [ ] **Step 3: Write messages API**

  Create `src/app/api/messages/route.ts` — POST creates a message; GET returns
  all messages for a booking_id (verifying the user is a participant).

- [ ] **Step 4: Write BookingThread component**

  Create `src/components/booking/BookingThread.tsx` — the full booking page UI:
  - Top: booking status badge, service type, price (if agreed)
  - Middle: scrollable message list with sender name and timestamp
  - Bottom: text input + Send button
  - Sidebar: action buttons (accept/decline for serviceiro, set price, confirm price,
    mark payment, mark complete) shown conditionally based on booking status and role
  - Auto-polls messages every 30 seconds

- [ ] **Step 5: Write bookings list page**

  Create `src/app/bookings/page.tsx` — shows all bookings for the current user
  (as customer or serviceiro). Group by status: active, pending, completed/declined.

- [ ] **Step 6: Write booking detail page**

  Create `src/app/bookings/[id]/page.tsx` — server component, verifies user is a
  participant, renders BookingThread. If status is completed and no review yet,
  show ReviewForm below the thread.

- [ ] **Step 7: Commit**
  ```bash
  git add .
  git commit -m "feat: add booking system with messaging and status flow"
  ```

---

## Task 9: Reviews

**Files:** `src/components/review/ReviewForm.tsx`, `src/components/review/ReviewCard.tsx`,
`src/app/api/reviews/route.ts`

- [ ] **Step 1: Write review API**

  Create `src/app/api/reviews/route.ts` — POST creates a review. Validates:
  - User is authenticated
  - booking_id exists and status is 'completed'
  - booking.customer_id == auth user
  - No existing review for this booking (UNIQUE constraint also catches this)
  - rating is 1–5

- [ ] **Step 2: Write ReviewForm component**

  Create `src/components/review/ReviewForm.tsx`:
  - Star selector (click to set 1–5)
  - Optional text comment
  - Submit button
  - Shows success message after submit, hides form

- [ ] **Step 3: Write ReviewCard component**

  Create `src/components/review/ReviewCard.tsx`:
  - Reviewer name + date
  - Star display
  - Comment text
  - Used in serviceiro profile page

- [ ] **Step 4: Commit**
  ```bash
  git add .
  git commit -m "feat: add review form and display"
  ```

---

## Task 10: Serviceiro Dashboard

**Files:** `src/app/dashboard/page.tsx`, `src/app/dashboard/verification/page.tsx`

- [ ] **Step 1: Write dashboard page**

  Create `src/app/dashboard/page.tsx` — serviceiro-only page (redirect others).
  Sections:
  - Profile editor: display name, bio, WhatsApp, Discord
  - Vocation selector: checkbox grid from VOCATIONS
  - Gameplay types selector: checkbox grid from GAMEPLAY_TYPES
  - Availability: weekday checkboxes + time range inputs + timezone offset selector
  - Save button (PATCH to Supabase directly from client)
  - Link to /bookings
  - Link to /dashboard/verification if not yet registered

- [ ] **Step 2: Write verification application page**

  Create `src/app/dashboard/verification/page.tsx`:
  - Form: character name input, screenshot upload, ID upload
  - Instructions: explain what to upload, what the fee is
  - Uploads files to Supabase Storage bucket `verifications/`
  - Submits to `verification_requests` table
  - Shows current status if already submitted

- [ ] **Step 3: Write verification file upload API**

  Create `src/app/api/verification/route.ts` — handles the POST, uploads files to
  Supabase Storage using the service role key (required for storage writes), creates
  the verification_requests row.

- [ ] **Step 4: Commit**
  ```bash
  git add .
  git commit -m "feat: add serviceiro dashboard and verification application"
  ```

---

## Task 11: Admin Panel

**Files:** `src/app/admin/` (all pages), `src/app/api/admin/` (all routes)

- [ ] **Step 1: Write admin auth middleware**

  Create `src/app/admin/layout.tsx` — server component that checks the user's
  `profiles.role == 'admin'`. If not admin, redirects to `/`. This protects all
  `/admin/*` routes at the layout level.

- [ ] **Step 2: Write admin home page**

  Create `src/app/admin/page.tsx` — dashboard with counts:
  - Pending verifications
  - Active bookings
  - Total users
  - Total reviews
  Each as a clickable card linking to the relevant section.

- [ ] **Step 3: Write verifications list + detail**

  Create `src/app/admin/verifications/page.tsx` — table of pending verification
  requests with name, character, submitted date, fee_paid toggle.

  Create `src/app/admin/verifications/[id]/page.tsx` — shows all submitted info,
  screenshot and ID document links (from Supabase Storage signed URLs), approve/reject
  buttons, admin notes textarea, fee_paid checkbox.

  Create `src/app/api/admin/verify/[id]/route.ts` — PATCH endpoint, checks admin
  role, updates verification_requests.status and if approved sets
  serviceiro_profiles.is_registered = true.

- [ ] **Step 4: Write users management page**

  Create `src/app/admin/users/page.tsx` — paginated table of all users with:
  - Display name, role, registered status, banned status, join date
  - Ban/Unban toggle button per row
  - Search by name

  Create `src/app/api/admin/ban/[id]/route.ts` — PATCH endpoint, admin only,
  toggles profiles.is_banned.

- [ ] **Step 5: Write reviews management page**

  Create `src/app/admin/reviews/page.tsx` — table of all visible reviews with:
  - Reviewer name, serviceiro name, rating, comment snippet, date
  - Delete button (sets is_visible = false)

  Create `src/app/api/admin/review/[id]/route.ts` — PATCH endpoint, admin only,
  sets reviews.is_visible = false.

- [ ] **Step 6: Commit**
  ```bash
  git add .
  git commit -m "feat: add admin panel (verifications, users, reviews)"
  ```

---

## Task 12: Documentation Files

**Files:** `docs/design-decisions.md`, `SETUP.md`, `HOW-TO-CHANGE.md`, `DONE.md`

- [ ] **Step 1: Write design-decisions.md**

  Create `docs/design-decisions.md` — document every significant technical decision:
  - Why Next.js App Router over Pages Router
  - Why Supabase over Firebase (SQL vs NoSQL, RLS, free tier)
  - Why no real-time messaging (polling is simpler, free tier safe)
  - Why contact reveal is server-side (security)
  - Why both parties must mark booking complete (dispute prevention)
  - Why TC only (no real money)
  - Why fixed vocation/gameplay lists (data consistency)
  - Why service role key is server-only (RLS bypass)
  - Why `is_visible` instead of delete for reviews (audit trail)
  - Every other decision made during implementation

- [ ] **Step 2: Write SETUP.md**

  Create `SETUP.md` — complete guide from zero:
  1. Prerequisites (Node.js, Supabase account, Vercel account)
  2. Clone/create the project
  3. Install dependencies
  4. Create .env.local from .env.local.example
  5. Create Supabase project + run schema.sql
  6. Configure Supabase Auth (disable email confirmation for dev)
  7. Create Supabase Storage bucket `verifications` (private)
  8. Run locally: `npm run dev`
  9. Create first admin user (SQL command in Supabase)
  10. Deploy to Vercel (step by step)

- [ ] **Step 3: Write HOW-TO-CHANGE.md**

  Create `HOW-TO-CHANGE.md` — guide for common modifications:
  - How to add a new vocation
  - How to add a new gameplay type
  - How to change the color theme
  - How to change TC increment or limits
  - How to add email notifications
  - How to make the contact visible without a booking
  - How to add a new admin user
  - How to change the site language to English

- [ ] **Step 4: Write DONE.md**

  Create `DONE.md` — final summary:
  - What was built (feature list)
  - What the user needs to do next (the prerequisites list)
  - How to run locally
  - How to deploy
  - Known limitations and future improvements

- [ ] **Step 5: Final commit**
  ```bash
  git add .
  git commit -m "docs: add design decisions, setup guide, how-to-change, and done summary"
  ```

---

## Task 13: Final Polish and Testing

- [ ] **Step 1: Add loading states** — every page that fetches data should show a
  skeleton/spinner while loading. Use Next.js `loading.tsx` files.

- [ ] **Step 2: Add error boundaries** — every page should handle fetch errors
  gracefully (show a friendly error card, not a blank page).

- [ ] **Step 3: Add responsive mobile layout** — test and fix Navbar (hamburger menu),
  Browse page (filters become collapsible), Card grid (1 column on mobile).

- [ ] **Step 4: Add `next.config.js` settings**

  Create/update `next.config.js`:
  ```javascript
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    images: {
      // Allow Supabase storage images
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '*.supabase.co',
        },
      ],
    },
  }
  module.exports = nextConfig
  ```

- [ ] **Step 5: Final commit**
  ```bash
  git add .
  git commit -m "feat: add loading states, error handling, mobile responsive layout"
  ```

---

## How to Run Locally (quick reference)

```bash
cd C:/Users/david/OneDrive/Desktop/Programas/tibia-services
npm install
# Make sure .env.local is filled in
npm run dev
# Open http://localhost:3000
```

## How to Build for Production

```bash
npm run build
npm start
```

If build succeeds, the project is ready to deploy to Vercel.
