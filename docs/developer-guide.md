# Developer Guide

## How the App is Structured

### Pages (src/app/)

Next.js App Router. Each folder is a route. Server Components by default -- add `'use client'` when you need hooks, event handlers, or browser APIs.

Key pages:
- `/` -- Landing page (hero, how-it-works, featured serviceiros)
- `/browse` -- Browse serviceiros with filters
- `/serviceiro/[id]` -- Public serviceiro profile (reviews, availability, contact)
- `/bookings` -- User's booking list
- `/bookings/[id]` -- Booking detail with chat, status actions, price negotiation
- `/dashboard` -- Serviceiro dashboard (profile edit, analytics, character verification)
- `/servicos` -- Service request board
- `/admin` -- Admin panel (users, verifications, reviews, disputes, featured)

### API Routes (src/app/api/)

REST endpoints. All routes use helpers from `api-helpers.ts`:
- `getAuthUser()` -- get authenticated user + supabase client
- `requireAdmin()` -- verify admin role, return admin client
- `checkRateLimit()` -- in-memory per-user rate limiting
- `apiError()`, `unauthorized()`, `forbidden()`, etc. -- standardized error responses

### Lib (src/lib/)

- `constants.ts` -- Fixed lists (vocations, gameplay types, weekdays, TC limits)
- `types.ts` -- TypeScript interfaces matching DB schema
- `utils.ts` -- TC validation, date formatting, sanitization
- `i18n.ts` -- Translation strings (PT/EN/ES)
- `email.ts` -- Resend email functions
- `supabase/` -- Three client types (see Tech Notes)

### Components (src/components/)

Organized by domain: `booking/`, `serviceiro/`, `review/`, `servicerequest/`, `layout/`, `ui/`, `providers/`.

## Auth Flow

1. User visits `/auth` and chooses Login or Register
2. Register: picks role (customer or serviceiro), enters email + password + display name
3. Supabase Auth creates the user with `raw_user_meta_data` containing role and display_name
4. Database trigger `handle_new_user()` fires:
   - Creates `profiles` row with role and display_name
   - If role is `serviceiro`, also creates `serviceiro_profiles` row
5. Session persists via Supabase SSR cookies
6. Server components read session via `createClient()` (server)
7. Client components read session via `createClient()` (browser)

Roles: `customer`, `serviceiro`, `admin`. Admin is set manually via SQL.

## Booking Lifecycle

```
Customer creates booking
        |
        v
    [pending] ──── serviceiro declines ──► [declined]
        |
  serviceiro accepts
        |
        v
    [active] ──── either cancels ──► [cancelled]
        |          customer disputes ──► [disputed] ──► admin resolves ──► [resolved]
        |
  both mark complete
        |
        v
    [completed] ──── customer can leave review
```

While active:
- **Price negotiation:** one party proposes TC amount, both must confirm
- **Payment tracking:** customer marks TC sent, serviceiro marks TC received
- **Chat:** messages between the two parties (30-second polling)
- **Completion:** both must mark complete for status to change

## Database Overview

10 tables + 1 view. All tables have RLS enabled. See CLAUDE.md for the full schema table.

**RLS policies pattern:**
- Public read for non-sensitive data (profiles, serviceiro_profiles, visible reviews)
- Owner-only write (profiles, serviceiro_profiles)
- Participant-only access (bookings, messages -- both customer and serviceiro)
- Admin operations bypass RLS via service_role key

**Trigger:** `on_auth_user_created` -- auto-creates profile row on signup.

**View:** `serviceiro_completion_counts` -- aggregates completed bookings per serviceiro per gameplay type.

## Adding a New API Route

1. Create `src/app/api/<domain>/route.ts`
2. Import helpers:
   ```typescript
   import { getAuthUser, unauthorized, badRequest, serverError } from '@/lib/api-helpers'
   ```
3. Authenticate:
   ```typescript
   const { user, supabase } = await getAuthUser()
   if (!user) return unauthorized()
   ```
4. For admin routes, use `requireAdmin()` instead
5. Query via `supabase` (respects RLS) or `createAdminClient()` (bypasses RLS)
6. Add rate limiting on write endpoints:
   ```typescript
   const limited = await checkRateLimit(supabase, 'table_name', 'user_id', user.id, 60000, 3)
   if (limited) return tooManyRequests()
   ```

## Adding a New Page

1. Create `src/app/<route>/page.tsx`
2. Server Component by default -- fetch data directly
3. For interactive parts, extract a Client Component with `'use client'`
4. Use `useLanguage()` for translations in client components
5. Server components cannot use i18n (no hooks) -- hardcode Portuguese or pass lang as prop

## i18n System

3 languages: `pt` (default), `en`, `es`.

Translation keys in `src/lib/i18n.ts` (~400 keys per language). Usage:

```typescript
// Client component
const { t } = useLanguage()
return <h1>{t('nav_browse')}</h1>

// Adding a new key: add to ALL 3 language blocks in i18n.ts
```

Language is stored in React context (`language-context.tsx`) and persisted in `localStorage`. The `LanguageSwitcher` component toggles between languages.

Admin panel is Portuguese-only (server components).

## Common Pitfalls

- **RLS policies block your query?** Check that the authenticated user matches the policy conditions. Use the admin client only for admin operations.
- **Admin client in client component?** Never. The service_role key must never reach the browser. Only use `createAdminClient()` in API routes.
- **Rate limiting false positives?** `checkRateLimit()` queries the table for recent rows. If the table has no `created_at` column, it won't work.
- **TC validation errors?** TC amounts must be multiples of 25, min 25, max 100,000. Use `isValidTC()` before storing.
- **Missing i18n key?** Add the key to all 3 language blocks in `i18n.ts`. The `t()` function returns the key itself if not found.
- **Booking status not changing?** Dual confirmation is required for price, payment, and completion. Both parties must confirm.
- **Contact info not showing?** `/api/contact/[id]` only returns data if the requester has an active booking with that serviceiro.
