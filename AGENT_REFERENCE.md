# Project reference

Task-specific reference extracted from the former CLAUDE.md. AGENTS.md is the canonical entrypoint. Read relevant sections when needed; dates and version observations are historical until reverified. Paths remain relative to the repository root.

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
  __tests__/                     Jest + React Testing Library regression tests
supabase/
  schema.sql                     Base database schema (canonical state also requires migrations)
  migrations/                    Incremental migrations (001-010)
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

## Database Schema

Canonical database state is `supabase/schema.sql` followed by every timestamped file in `supabase/migrations/`, run in filename order. `schema.sql` alone is not complete for production because migrations carry post-schema features and hardening. Migration `20260430000900_contract-hardening.sql` adds database-level enforcement for booking transitions, serviceiro/review/featured policy hardening, verification-field protections, and the atomic action-rate ledger. Migration `20260712001000_audit-security-hardening.sql` replaces the ineffective contact-column revoke with an explicit public allow-list, blocks banned booking/message mutations, prevents concurrent active verification requests, and makes paid admin verification review transactional.

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
APP_URL=                          # Base URL for email links (production: https://tibia.davidluky.com)
CHAR_VERIFY_SECRET=               # HMAC secret for character verification codes
```
