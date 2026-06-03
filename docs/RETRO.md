# Retro - 2026-04-30 Full Mode Hardening

## Outcome

The session moved the project from "API-validated happy path" toward contract-enforced production posture. The biggest shift was putting marketplace invariants in the database so direct Supabase clients cannot bypass money-adjacent or reputation-adjacent rules.

## What Went Well

- Parallel audits found different classes of risk quickly: RLS bypasses, non-atomic dispute writes, stale setup docs, dependency advisories, lint drift, and accessibility gaps.
- A follow-up review caught incomplete booking-trigger coverage, service-role revalidation drift, and fail-open action throttling before the hardening batch was committed.
- The database migration became the structural fix for the largest bug class instead of scattering more checks across routes.
- `npm run quality` now gives one local and CI-ready gate for lint, typecheck, tests, build, and audit.
- `npm run package` now gives a repeatable Cloudflare Workers artifact build instead of relying on an implicit adapter command.
- Docs were updated alongside the code, including setup, deployment, technical notes, design decisions, build commands, and session handoff.
- Accessibility fixes were made in shared UI primitives where they improve many screens at once.

## What Was Risky

- The hardening batch is broad and still uncommitted, so review should happen before deployment.
- The Supabase migration is not applied externally from this workspace yet. Production safety depends on applying `schema.sql` plus migrations `001` through `009` in order.
- No live Supabase E2E run was performed against a real hosted project in this session.
- Cloudflare OpenNext packaging passes locally but warns that Windows is not its preferred runtime; use WSL/Linux for deployment confidence if Windows-specific runtime issues appear.
- Generated Supabase `Database` types remain a worthwhile next structural improvement to prevent schema/type drift.
- CSP nonce/hash hardening was identified but not completed in this batch; current security gains are strongest at the data/API contract layer.

## Lessons

- If a public Supabase client can write a table, API route validation is not the security boundary. RLS policies, triggers, constraints, and RPCs must own the invariant.
- Multi-row state changes such as opening or resolving disputes should live in a single database transaction, not split route writes with best-effort rollback.
- Service-role writes must re-check the actor and row eligibility that RLS would otherwise enforce.
- Rate limits used for abuse control should be atomic and fail closed.
- Documentation drift can become a security issue when setup guides point new deploys at an unsafe or incomplete database state.
- Quality gates need to fail on warnings and audit findings, otherwise "known warnings" become permanent background noise.

## Follow-Up Candidates

1. Apply and verify migration `009` on the target Supabase project.
2. Generate and wire Supabase `Database` types through every client.
3. Add live smoke/E2E checks for booking creation, dispute open/resolve, review insertion, and featured listing activation.
4. Tighten CSP with nonce/hash-based script policy and reporting.
5. Move public browse/request filtering and pagination to server-side queries.

# Retro - 2026-05-11 Conservative Maintenance Pass

## Outcome

This pass reconciled the GitHub source with the promoted snapshot, kept the change set offline-only, and focused on two low-risk maintenance fixes: Next.js server cookie compatibility for the Supabase SSR client and non-force lockfile audit repairs for Next/OpenNext dependencies.

## What Went Well

- The promoted snapshot already contained a small async-cookie fix, so the canonical repository could be brought forward without changing data contracts or production settings.
- The dependency repair was lockfile-only, moved Next within the existing `^15.5.15` range, and kept the package manifest stable.
- No production deployment, Supabase mutation, service-role probe, Resend send, or RLS change was needed.

## What Stayed Out Of Scope

- The local-only Resend smoke script was not promoted because email sends require an explicit manual owner action.
- Live Supabase and hosted API validation remain manual boundaries.
- Generated artifacts such as `node_modules`, `.next`, `.swc`, TypeScript build info, and local env files remain excluded from the promoted source snapshot.

## Follow-Up Candidates

1. Run a manual owner-approved Resend smoke only after a real sender and recipient are selected.
2. Re-run hosted read-only checks after the next deployment, without printing row data or secrets.
3. Consider generated Supabase `Database` types before adding new table-heavy features.

# Retro — 2026-06-02 Portfolio Quality Pass

## What it is

Tibia Services is a Next.js 15 (App Router) + Supabase + TypeScript marketplace for Tibia game services: browse verified serviceiros, a dual-confirmation booking system (price/payment/completion), in-booking realtime chat, 1–5 star reviews, TibiaData-backed character verification, identity verification, featured listings, disputes, service requests, notifications, an admin panel, and PT/EN/ES i18n. Auth, storage, and data live in Supabase with RLS on every table plus a substantial DB-contract migration (`009`).

## Starting health

Excellent. Offline `npm install` clean. `typecheck`, `lint` (zero-warning gate), and the full Jest suite (63 tests / 8 suites) all passed on arrival, and the production build compiled cleanly. The codebase was already hardened: API routes validate input and authorization, user text is sanitized, write endpoints are rate-limited, and marketplace invariants are enforced at the database boundary (RLS policies + triggers + SECURITY DEFINER RPCs). This was a polish pass, not a rescue.

## Fixes & why

1. **Booking `set_price` re-proposal 500 bug** (`src/app/api/bookings/[id]/route.ts`). `set_price` unconditionally wrote `price_confirmed_by_<role>` for both parties (proposer `true`, other `false`). When a party re-proposed the *same* price after the counterparty had already confirmed it, the route tried to flip the counterparty's confirmation back to `false`. The migration-009 contract trigger forbids unsetting a confirmation when the price is unchanged, so the DB raised and the user got an opaque 500. Fixed by only clearing the counterparty's confirmation when the price actually changes; an unchanged re-proposal now just (re)confirms the proposer's side. Extracted the decision into a pure `priceConfirmationUpdate()` helper in `utils.ts` so it is unit-testable in the project's existing style (added `price-confirmation.test.ts`, 5 cases).
2. **Stale API docs** (`CLAUDE.md`). The endpoint table claimed `PATCH /api/featured/[id]` and `GET /api/bookings`; the actual routes export `DELETE` (the client already calls `DELETE`) and `POST`-only (the bookings list is read server-side in `bookings/page.tsx`). Corrected both rows so the technical reference matches the code.

## Deliberate non-changes & why

- **`mark_complete` dual-confirmation race.** The route reads a booking snapshot, then writes only the actor's completion flag and derives `willBothComplete` from that snapshot. If both parties click "complete" within the same narrow window, each can read the other's flag as `false` and the booking never flips to `completed`. The correct fix is atomic (an RPC like the dispute functions, or a re-read) and would require a new migration that cannot be applied/verified against a real DB from this offline workspace. Documented as P1 in RECOMMENDATIONS instead of shipping an unverifiable migration. The same read-then-write shape exists for `set_price`/`confirm_price` but is benign there (re-clicks re-confirm idempotently).
- **No DB uniqueness on `serviceiro_profiles.tibia_character`.** CLAUDE.md's "self-verification prevention" is satisfied (codes are HMAC of the user id), but two accounts can still verify the same character name. Behavior-changing; documented as P2.
- **`bookings/page.tsx` is hardcoded Portuguese** while the rest of the app is i18n'd. Pre-existing and internally consistent; cosmetic. Documented as P2, not touched.
- **5 moderate `npm audit` findings** (`wrangler`/`miniflare`/`ws`/`qs`) are all in the Cloudflare deploy toolchain, not the user-facing Next.js runtime. `npm audit fix` would bump `wrangler` across a major and risk breaking the OpenNext adapter. Left for a deliberate, verifiable dependency pass.

## Risks

- Changes are surgical and fully covered by the offline gate (typecheck + lint + 68 tests + build), but no change was exercised against a live Supabase project, per mission constraints.
- The `set_price` fix mirrors the DB trigger's semantics; if the trigger logic is later changed, the helper must be kept in sync (the comment and test call this out).

## Lessons

- When validation lives in both the API and the DB, the two must agree on edge cases. The 500 here came from the route and the trigger disagreeing about a no-op price re-proposal.
- Extracting a 10-line decision into a pure helper turned an untestable route branch into a 5-case regression test without any Supabase mocking — matching how this repo already tests its `lib/` functions.
- Doc/route verb drift is cheap to catch by diffing documented endpoints against the actual `export async function` verbs; worth doing whenever routes change.
