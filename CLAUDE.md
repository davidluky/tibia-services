# Tibia Services Marketplace

Next.js 14 + Supabase + TypeScript marketplace for Tibia game services (hunting, quests, PK, bestiary). Pre-launch, feature-complete.

## Project Layout

```
src/
  app/
    page.tsx                     Landing page (hero, how-it-works, featured)
    HomeClient.tsx               Client-side landing page component
    layout.tsx                   Root layout (Navbar, Footer, Providers)
    error.tsx / loading.tsx      Global error/loading boundaries
    not-found.tsx                404 page
    sitemap.ts                   Dynamic sitemap generator
    auth/                        Login + Register pages
    browse/                      Browse serviceiros with filters
    bookings/                    Booking list + detail + chat
    dashboard/                   Serviceiro dashboard (edit profile, analytics)
    serviceiro/[id]/             Public serviceiro profile
    servicos/                    Service request board
    admin/                       Admin panel (users, verifications, reviews, disputes, featured)
      disputes/                  Dispute resolution
      featured/                  Featured listing confirmation
      reviews/                   Review moderation
      users/                     User management + ban
      verifications/             Verification review + approve/reject
    privacidade/                 Privacy policy page
    termos/                      Terms of service page
    api/                         API routes (see API Endpoints below)
  components/
    booking/                     BookingThread (chat + status + actions)
    layout/                      Navbar, Footer, NotificationBell
    providers/                   React context providers (language, auth)
    review/                      ReviewCard, ReviewForm
    serviceiro/                  ServiceiroCard, Filters, Stats, Availability, ContactReveal, CharVerification, FeaturedListing
    servicerequest/              ServiceRequestCard, ServiceRequestFilters
    ui/                          Badge, Button, Card, Input, Select, Modal, Stars, Skeleton, ErrorRetry, LanguageSwitcher
  lib/
    api-helpers.ts               Standardized API responses, auth helpers, rate limiting
    constants.ts                 Vocations, gameplay types, weekdays, TC limits, booking statuses
    email.ts                     Email notifications via Resend API
    i18n.ts                      Translations (PT/EN/ES, ~1000 lines, 400+ keys)
    language-context.tsx         React context for language switching
    types.ts                     TypeScript types matching DB schema
    utils.ts                     TC validation, date/time helpers, sanitization
    supabase/
      client.ts                  Browser-side client (anon key, safe for client components)
      server.ts                  Server-side client (anon key + cookies, respects RLS)
      admin.ts                   Admin client (service_role key, bypasses RLS — server only)
  __tests__/                     7 test files (Jest + React Testing Library)
supabase/
  schema.sql                     Full database schema (tables, RLS, triggers, indexes, views)
  migrations/                    Incremental migrations (001-006)
  seed_mock*.sql                 Mock data for development
```

## Architecture

```
Browser ──► Next.js Pages (Server Components)
              │
              ├──► API Routes (/api/*) ──► createClient() ──► Supabase (RLS)
              │                         ──► createAdminClient() ──► Supabase (bypass RLS)
              │
              └──► Client Components ──► createClient() (browser) ──► Supabase (RLS)

External:
  API Routes ──► TibiaData API v4 (character verification)
  API Routes ──► Resend API (email notifications)
```

## Dev Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Jest in watch mode |

## Database Schema

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | All users (extends auth.users via trigger) | role, display_name, whatsapp, discord, is_banned |
| `serviceiro_profiles` | Extra fields for serviceiros | vocations[], gameplay_types[], availability, tibia_character, tibia_char_verified |
| `bookings` | Service bookings between customer and serviceiro | status, agreed_price_tc, dual-confirm flags (price, payment, complete) |
| `messages` | In-booking chat messages | booking_id, sender_id, content |
| `reviews` | Customer reviews of serviceiros (1 per booking) | rating (1-5), comment, is_visible |
| `verification_requests` | Serviceiro identity verification (screenshot + ID) | status, fee_paid, admin_notes |
| `featured_listings` | Paid boost for serviceiro visibility | tc_amount, days_requested (generated: tc_amount/25), status, expires_at |
| `disputes` | Customer-opened disputes on bookings | reason, status (open/resolved), resolution |
| `notifications` | In-app notifications (bell icon) | type, title, body, link, is_read |
| `service_requests` | Customer-posted service requests | service_type, title, budget_tc, status |

**View:** `serviceiro_completion_counts` — completed bookings per serviceiro per gameplay type.

## API Endpoints

### Bookings
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/bookings` | List user's bookings / Create booking |
| GET/PATCH | `/api/bookings/[id]` | Get booking detail / Update status, price, flags |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/messages` | Get messages for booking / Send message |

### Reviews
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/reviews` | Get reviews for serviceiro / Submit review |

### Contact
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/contact/[id]` | Get contact info (gated behind active booking) |

### Verification
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/verification` | Submit verification request (screenshot + ID upload) |
| GET/POST | `/api/verify-character` | Get verification code / Verify character via TibiaData API |

### Featured Listings
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/featured` | List own featured listings / Request new listing |
| PATCH | `/api/featured/[id]` | Cancel a pending listing |

### Disputes
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/disputes` | Open a dispute on an active booking |

### Service Requests
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/service-requests` | List requests / Create request |
| POST | `/api/service-requests/[id]/apply` | Serviceiro applies to a request |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET/PATCH | `/api/notifications` | Get unread notifications / Mark as read |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics` | Serviceiro analytics (KPIs, monthly data, type breakdown) |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/ban/[id]` | Ban/unban user |
| PATCH | `/api/admin/disputes/[id]` | Resolve dispute |
| PATCH | `/api/admin/featured/[id]` | Confirm featured listing |
| PATCH | `/api/admin/review/[id]` | Hide/unhide review |
| PATCH | `/api/admin/verify/[id]` | Approve/reject verification |

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon (public) key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role key (server-only, bypasses RLS)
RESEND_API_KEY=                   # Resend email API key
RESEND_FROM_EMAIL=                # Sender email address
APP_URL=                          # Base URL for email links (e.g. https://tibia-services.com)
CHAR_VERIFY_SECRET=               # HMAC secret for character verification codes
```

## Critical Implementation Details

- **RLS everywhere.** Every table has Row-Level Security enabled. The browser and server clients respect RLS. Only the admin client (service_role key) bypasses it.
- **Rate limiting.** `api-helpers.ts` provides `checkRateLimit()` — queries the target table for recent rows by user within a time window. Bookings: 3/min, messages: 10/min, service requests: 3/min.
- **Character verification.** Uses TibiaData API v4. Server generates HMAC-based code (`TIBS-XXXXXXXX`), user places it in their Tibia.com character comment, server verifies via API.
- **Admin client bypasses RLS.** `createAdminClient()` uses the service_role key. Never import in client components.
- **TC validation.** Amounts must be multiples of 25 (game denomination), min 25, max 100,000. Use `isValidTC()` from `utils.ts`.
- **Contact info gated.** WhatsApp/Discord only returned by `/api/contact/[id]` after verifying the requester has an active booking with that serviceiro.
- **Dual confirmation pattern.** Price, payment, and completion all require both parties to confirm before the action takes effect.
- **Input sanitization.** `sanitizeText()` strips HTML tags and `javascript:` protocols before database storage.
- **File uploads.** Verification screenshots/IDs go to Supabase Storage `verifications` bucket. MIME validation + 5MB limit enforced.
- **Ban system.** Banned users' profiles are hidden by RLS (`NOT is_banned` on SELECT policy).

## i18n

3 languages: PT (default), EN, ES. ~400 keys in `src/lib/i18n.ts` (1000+ lines). Language context in `language-context.tsx`, switcher component in `ui/LanguageSwitcher.tsx`.

Admin panel is Portuguese-only (server components, no i18n).

## Security

- RLS policies on all 10 tables
- Input sanitization (`sanitizeText`) on user-provided text
- File upload MIME validation + size limits
- Rate limiting on write endpoints
- Admin role verification via profile lookup
- Service role key server-only (never in `NEXT_PUBLIC_*`)
- Self-verification prevention (cannot verify own character as another user)

## Documentation Maintenance

| Change Type | Update These Docs |
|-------------|-------------------|
| New API endpoint | CLAUDE.md API section |
| New database table or column | CLAUDE.md schema + `docs/developer-guide.md` |
| New page or feature | CLAUDE.md layout + `docs/developer-guide.md` + DONE.md |
| New i18n keys | All 3 language blocks in `i18n.ts` |
| New design decision | `docs/design-decisions.md` |
| New implementation pattern | `docs/tech-notes.md` |
| Version or release milestone | `docs/version-history.md` |
| Security or RLS change | CLAUDE.md security section |
| Environment variable change | CLAUDE.md env section + SETUP.md |
