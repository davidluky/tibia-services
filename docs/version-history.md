# Version History

## Initial Release

Core marketplace functionality:
- Supabase Auth (email + password, role selection at signup)
- Profile system (profiles + serviceiro_profiles with vocations, gameplay types)
- Browse page with filters (vocation, gameplay type, weekday, name search, registered-only)
- Booking system with status flow (pending/active/completed/declined/cancelled)
- In-booking chat with 30-second polling
- Price negotiation with dual confirmation
- Payment tracking (customer sent / serviceiro received)
- Dual completion confirmation
- Customer reviews (1-5 stars + comment, one per booking)
- Serviceiro dashboard (profile editing, availability settings)
- Admin panel (user management, review moderation)
- RLS policies on all tables
- Database trigger for auto-profile creation on signup

## Subproject A: Enhanced Profiles

- Availability grid component (weekdays x time slots)
- Serviceiro stats display (completion counts per gameplay type)
- Improved serviceiro card layout for browse page

## Language Switcher

- Full i18n system with 3 languages: Portuguese (default), English, Spanish
- ~400 translation keys covering all user-facing strings
- Language context + localStorage persistence
- LanguageSwitcher component in navbar
- Locale-aware date formatting and "time ago" helpers

## Subproject B: Email Notifications

- Resend API integration for transactional emails
- Email notifications on: booking created, accepted, declined, completed, cancelled
- HTML email template with Tibia Services branding
- Fire-and-forget send functions (never block the request)

## Subproject C: Character Verification

- TibiaData API v4 integration
- HMAC-based verification code generation (deterministic per user)
- Comment-based proof flow (user places code in Tibia.com character comment)
- Character name validation (letters + spaces, max 30 chars)
- Self-verification prevention
- Migration: `001-character-verification.sql` (added `tibia_character`, `tibia_char_verified` to serviceiro_profiles)

## Subproject D: Dispute System

- Customer can open dispute on active bookings
- Admin resolves disputes (refund/release/split options)
- Dispute status flow: open → resolved
- Admin dispute management page
- Migration: `002-disputes.sql`

## Subproject E: Availability Summary

- AvailabilitySummary component showing condensed availability info
- ServiceiroSummaryLine for compact display in lists
- Timezone-aware availability display

## Subproject F: Featured Listings

- TC-based featured listing system (tc_amount / 25 = days)
- Request, admin confirmation, expiration flow
- Featured serviceiros highlighted on landing page
- FeaturedListingCard component for serviceiro dashboard
- Admin featured listing confirmation page
- Migration: `003-featured-listings.sql`

## Service Requests

- Customer-posted service request board
- Serviceiros can browse and apply to requests
- Filters by service type
- Migration: `004-service-requests.sql`

## Notifications System

- In-app notification system with bell icon
- 30-second polling for new notifications
- Mark as read functionality
- Notifications for booking events
- Migration: `005-notifications.sql`

## Pre-Launch Hardening

- Security audit and hardening (migration: `006-security-hardening.sql`)
- Rate limiting on write endpoints (bookings, messages, service requests)
- Standardized API helpers (`api-helpers.ts`)
- Input sanitization (`sanitizeText` for XSS prevention)
- File upload MIME validation and size limits
- Ban system with RLS enforcement
- Error retry states for failed fetches
- Jest + React Testing Library regression coverage for helpers, constants, localization, sanitization, and validation logic
- Analytics dashboard for serviceiros (KPIs, monthly chart, type breakdown)

## Contact Column Lockdown

- Database-layer enforcement of contact info visibility (migration: `007-contact-column-lockdown.sql`)
- Revoked column-level SELECT on `whatsapp`/`discord` for anon + authenticated roles
- Added `my_contact_info()` SECURITY DEFINER function for dashboard self-read
- `/api/contact/[id]` endpoint (uses service_role) continues to work as intended

## Booking Field Lockdown

- BEFORE UPDATE trigger on bookings table (migration: `008-booking-field-lockdown.sql`)
- Participant ID immutability (`customer_id`, `serviceiro_id` cannot change after INSERT)
- Ownership-scoped confirmation flags (each party can only toggle their own booleans)
- Automatic price confirmation reset on renegotiation
- Closes column-level access gap for direct supabase-js calls

## Contract Hardening

- Database-layer contract enforcement (migration: `009-contract-hardening.sql`)
- Serviceiro profile policies require serviceiro role and non-banned profile
- Registration and character verification fields are protected from self-modification
- Booking INSERT/UPDATE trigger enforces initial state, self-booking prevention, service type validity/immutability, TC bounds, participant immutability, owned monotonic confirmation flags, price confirmation resets, final-state immutability, and status/`completed_at` transitions
- Review inserts must match the completed booking being reviewed
- Featured listings cannot be self-activated by public clients
- Added `api_rate_limits` ledger table and atomic RPC for API routes that need rate limiting without a natural write row
- Public dispute inserts are disabled; customer-only dispute creation goes through atomic open/resolve functions that keep dispute rows and booking statuses synchronized
- Cloudflare package builds are available through `npm run package`

## Multi-Lingual Admin Panel

- Admin server components now support PT/EN/ES via `getServerT()` helper
- Cookie-based locale sync between client LanguageContext and server components
- ~45 new `admin_*` i18n keys across all 3 languages
- All admin pages (dashboard, disputes, featured, reviews, users, verifications) translated

## Next.js 15 Upgrade

- Upgraded from Next.js 14 to Next.js 15
- Closed 4 high-severity DoS advisories

## Verification Upload Hardening

- Identity verification uploads now flow through `POST /api/verification`; the server uploads screenshot and ID files with the admin Supabase client
- Private Supabase Storage bucket is `verifications`
- Verification request rows store private storage paths, not public file URLs
- Admin verification detail creates short-lived signed URLs for review previews

## Deployment Documentation Audit

- Setup and deployment docs now define the canonical database state as `supabase/schema.sql` plus all numbered migrations
- Setup and deployment docs list all 7 required environment variables
- Production admin bootstrap docs require a confirmed Supabase Auth user ID
- Test documentation avoids hard-coded totals; run `npm test` for the current count
- Migration 009 is included in the canonical migration list

## Current State

Feature-complete marketplace ready for deployment. All core flows working:
- Auth, browsing, booking, chat, reviews, verification, disputes, featured listings, service requests, notifications, analytics, admin panel.
- 3-language i18n (including admin panel), email notifications, rate limiting, RLS security.
- Canonical database state is `supabase/schema.sql` plus 9 incremental migrations (001-009) hardening schema beyond initial RLS policies.
