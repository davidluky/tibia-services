# Contributing to Tibia Services

## Prerequisites

- Node.js 18+ ([download](https://nodejs.org))
- A Supabase project ([supabase.com](https://supabase.com))
- A Resend API key ([resend.com](https://resend.com)) -- for email notifications

## Quick Start

See [SETUP.md](SETUP.md) for the full 10-step guide covering Supabase setup, database schema, storage buckets, and admin account creation.

```bash
npm install
cp .env.local.example .env.local   # Fill in your keys
npm run dev                         # http://localhost:3000
```

## Dev Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run all tests (Jest) |
| `npm run test:watch` | Jest in watch mode |

## Project Structure

The codebase is organized in 4 layers:

1. **Pages** (`src/app/`) -- Next.js App Router pages and layouts. Server Components by default, Client Components where interactivity is needed.
2. **API Routes** (`src/app/api/`) -- REST endpoints. Each route uses `api-helpers.ts` for auth, error responses, and rate limiting.
3. **Components** (`src/components/`) -- Reusable UI organized by domain (booking, serviceiro, review, ui).
4. **Lib** (`src/lib/`) -- Shared utilities, types, constants, i18n, Supabase clients, email.

## Extending the App

### Adding a new API route

1. Create `src/app/api/<domain>/route.ts`
2. Use `getAuthUser()` or `requireAdmin()` from `api-helpers.ts`
3. Use `createClient()` for RLS-respecting queries, `createAdminClient()` for admin operations
4. Return responses via `apiError()`, `unauthorized()`, etc.
5. Add rate limiting with `checkRateLimit()` if it's a write endpoint

### Adding a new component

1. Create in the appropriate `src/components/<domain>/` folder
2. Add `'use client'` directive if the component needs interactivity
3. Use `useLanguage()` hook and `t()` function for translated strings
4. Add translation keys to all 3 language blocks in `src/lib/i18n.ts`

### Database migrations

1. Write SQL in a new file: `supabase/migrations/NNN-description.sql`
2. Run in Supabase Dashboard SQL Editor
3. Update `src/lib/types.ts` to match schema changes
4. Update CLAUDE.md schema table

## Testing

7 test files in `src/__tests__/`:
- `api-helpers.test.ts` -- API helper functions
- `constants.test.ts` -- Constants validation
- `i18n.test.ts` -- Translation key completeness
- `sanitize.test.ts` -- Input sanitization
- `tc-validation.test.ts` -- TC amount validation
- `utils-locale.test.ts` -- Locale-aware utility functions
- `utils.test.ts` -- General utility functions

Run with `npm test`. Tests use Jest + React Testing Library.

## Deployment

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables (see CLAUDE.md for the full list)
4. Deploy

The `npm run build` command must succeed locally before deploying.
