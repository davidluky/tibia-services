# Project agent guide

Next.js 15 + Supabase + TypeScript marketplace for Tibia game services (hunting, quests, PK, bestiary). The canonical production host is live on Vercel; local changes and database migrations still require explicit deployment/application.

## Reading and completion

Use the rules below for this project. For a small isolated edit, read the affected source and applicable rules. For substantive resumes, read the current canonical position; historical status is not live evidence. Preserve unrelated work and existing release, security, data and physical-action boundaries.

Detailed reference: [AGENT_REFERENCE.md](AGENT_REFERENCE.md). Before changing a subsystem or running an operation covered by a section below, read that section; do not read the whole reference by default. Maps and historical entries are lookup aids.

- [Project Layout](AGENT_REFERENCE.md#project-layout)
- [Architecture](AGENT_REFERENCE.md#architecture)
- [Database Schema](AGENT_REFERENCE.md#database-schema)
- [API Endpoints](AGENT_REFERENCE.md#api-endpoints)
- [Environment Variables](AGENT_REFERENCE.md#environment-variables)

## Dev Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run package` | Optional Cloudflare Workers portability build |
| `npm run lint` | ESLint CLI with zero-warning gate |
| `npm run typecheck` | TypeScript check without emit |
| `npm run audit` | npm dependency audit (moderate+) |
| `npm run audit:offline` | Cached dependency audit with network disabled |
| `npm run quality` | Lint, typecheck, tests, build, and audit |
| `npm run quality:offline` | Local quality gate with cached offline audit |
| `npm run verify` | Quality gate plus OpenNext packaging |
| `npm run verify:offline` | Offline quality gate plus OpenNext packaging |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Jest in watch mode |

## Critical Implementation Details

- **RLS everywhere.** Every table has Row-Level Security enabled. The browser and server clients respect RLS. Only the admin client (service_role key) bypasses it.
- **Rate limiting.** `checkActionRateLimit()` and the migration 009 `api_rate_limits` RPC give concurrent requests one atomic decision. Covered routes, per user: `POST /api/bookings` 3/min, `PATCH /api/bookings/[id]` 20/min, `POST /api/messages` 10/min, `POST /api/reviews` 3/min, `POST /api/disputes` 3/min, `POST /api/featured` 3/min, `PATCH /api/notifications` 30/min, `POST /api/service-requests` 3/min, identity uploads 3/hour, character verification 5/10min. Not covered: the `/api/admin/*` mutations (admin-only) and `POST /api/service-requests/[id]/apply` (feature-flagged off). Enumerate a route here when you add the check — do not restate this as a universal.
- **Booking amplification cap.** `POST /api/bookings` refuses a second `pending` booking for the same (customer, serviceiro, service_type), because each creation emails the serviceiro from the shared Resend quota. That slot frees on cancel/decline, so the send is additionally capped recipient-side (`booking_created_email`, 10/hour keyed on the serviceiro). Past the cap the booking is still created — only the email is dropped, and the in-app notification is unaffected.
- **Character verification.** Uses TibiaData API v4. Server generates HMAC-based code (`TIBS-XXXXXXXX`), user places it in their Tibia.com character comment, server verifies via API.
- **Admin client bypasses RLS.** `createAdminClient()` uses the service_role key. Never import in client components.
- **TC validation.** Amounts must be multiples of 25 (game denomination), min 25, max 100,000. Use `isValidTC()` from `utils.ts`.
- **Contact info gated.** WhatsApp/Discord only returned by `/api/contact/[id]` after verifying the requester has an active booking with that serviceiro.
- **Dual confirmation pattern.** Price, payment, and completion all require both parties to confirm before the action takes effect.
- **Input sanitization.** `sanitizeText()` strips HTML tags and `javascript:` protocols before database storage.
- **Request boundary.** Middleware rejects cross-origin mutating `/api/*` requests. JSON routes require a valid declared length no greater than 64 KiB before parsing; multipart verification uploads retain their stricter route-specific limit.
- **Explicit projections.** Supabase readers under `src/` enumerate returned columns. The projection contract test rejects a reintroduced response-facing `select('*')`.
- **File uploads.** Verification screenshots/IDs are submitted to `/api/verification`, then uploaded server-side with the admin Supabase client to the private `verifications` bucket. MIME, file-signature, request-size, and 5MB/file limits are enforced. Partial uploads and failed row inserts are cleaned up; approved/rejected reviews delete both private objects after the transactional DB review.
- **Production admin bootstrap.** Keep email confirmations enabled in production. Promote the first admin by verified `auth.users.id`, not by email-only SQL.
- **Production host.** `https://tibia.davidluky.com` is served by Vercel. Cloudflare/OpenNext packaging is optional and inactive unless a task explicitly reopens that deployment path.
- **Ban system.** Banned users' profiles are hidden by RLS (`NOT is_banned` on SELECT policy).

## i18n

3 languages: PT (default), EN, ES. ~400 keys in `src/lib/i18n.ts` (1000+ lines). Language context in `language-context.tsx`, switcher component in `ui/LanguageSwitcher.tsx`.

Admin panel supports PT/EN/ES via `getServerT()` (server-side i18n from cookie).

## Security

- RLS policies on all 10 tables
- Input sanitization (`sanitizeText`) on user-provided text
- Same-origin enforcement for mutating API requests and declared request-body limits
- Explicit Supabase response projections guarded by a source contract test
- File upload MIME validation + size limits
- Rate limiting on write endpoints
- Admin role verification via profile lookup
- Admin pages authorize at each service-role data access via `requireAdminPage()`; the parent layout is only a navigation/UX guard
- Public profile reads use an explicit safe-column grant from migration 010; contact fields remain behind own-contact RPC and `/api/contact/[id]`
- Service role key server-only (never in `NEXT_PUBLIC_*`)
- Self-verification prevention (cannot verify own character as another user)

## Documentation Maintenance

| Change Type | Update These Docs |
|-------------|-------------------|
| New API endpoint | AGENT_REFERENCE.md API section |
| New database table or column | AGENT_REFERENCE.md schema + `docs/developer-guide.md` |
| New page or feature | AGENT_REFERENCE.md layout + `docs/developer-guide.md` + DONE.md |
| New i18n keys | All 3 language blocks in `i18n.ts` |
| New design decision | `docs/design-decisions.md` |
| New implementation pattern | `docs/tech-notes.md` |
| Version or release milestone | `docs/version-history.md` |
| Security or RLS change | AGENTS.md security section |
| Environment variable change | AGENT_REFERENCE.md env section + SETUP.md |
