# Recommendations — 2026-06-02

Prioritized findings from the portfolio quality pass. P0 = fix before relying on it; P1 = fix soon; P2 = nice to have. Items already fixed this session are in RETRO.md, not repeated here.

## P0 — none

No release-blocking defects found. Build, typecheck, lint, and the full test suite pass; the API and database layers are validated and RLS-hardened.

## P1 — should fix soon

### P1-1 Make `mark_complete` dual-confirmation atomic
- **What:** In `src/app/api/bookings/[id]/route.ts`, the `mark_complete` action reads a booking snapshot and then writes only the actor's completion flag, deriving `willBothComplete` (and the `completed`/`completed_at` transition) from that stale snapshot. Two simultaneous completes (one per party) can each see the other flag as `false`, so the booking can stay `active` with both individual flags eventually set but `status` never advancing to `completed`.
- **Why:** Completion gates reviews, analytics revenue, and the contact reveal. A stuck "both confirmed but not completed" booking is a confusing, hard-to-reproduce support issue.
- **Fix:** Move completion into a SECURITY DEFINER RPC that does `SELECT ... FOR UPDATE`, sets the actor's flag, and atomically promotes to `completed` when both are set (same pattern as `open_booking_dispute`/`resolve_booking_dispute` in migration 009). Call it from the route via the admin client.
- **Effort:** ~1–2 hrs (new migration + route change + test).
- **Risk:** Medium — requires a new migration applied and verified against the real Supabase project; cannot be validated from the offline workspace.

### P1-2 Generate and wire Supabase `Database` types
- **What:** Supabase client calls are effectively untyped (`from('bookings')` returns loose shapes; `src/lib/types.ts` is hand-maintained to "match the schema"). Generate `Database` types (`supabase gen types typescript`) and parameterize the clients.
- **Why:** Removes schema/type drift — the class of bug behind several historical fixes — and would have surfaced the `set_price` flag-shape issue at compile time.
- **Effort:** Half a day.
- **Risk:** Low-medium; touches every client call site but is mechanical and caught by `typecheck`. (Also a standing follow-up in prior retros.)

## P2 — nice to have

### P2-1 Enforce one verified Tibia character per account
- **What:** `serviceiro_profiles.tibia_character` has no uniqueness constraint, so two accounts can both verify the same character name via `/api/verify-character`. CLAUDE.md's "self-verification prevention" only covers code-per-user (HMAC), not cross-account duplicates.
- **Why:** Trust signal integrity — a "verified character" should map to one serviceiro.
- **Fix:** Partial unique index on `lower(tibia_character) WHERE tibia_char_verified` + a friendly 409 in the route. Decide the policy first (is a shared guild char allowed?).
- **Effort:** ~1 hr. **Risk:** Low, but behavior-changing — needs a product decision.

### P2-2 i18n the bookings list page
- **What:** `src/app/bookings/page.tsx` hardcodes Portuguese status labels/headings while the rest of the app uses the PT/EN/ES i18n system (`i18n.ts` + `getServerT()`).
- **Why:** Consistency for EN/ES users; the booking detail page is already localized.
- **Effort:** ~1 hr. **Risk:** Low (add keys to all three locale blocks; the i18n symmetry test enforces parity).

### P2-3 Resolve the 5 moderate dependency advisories deliberately
- **What:** `npm audit` reports 5 moderate issues, all transitive via the Cloudflare deploy toolchain (`wrangler` → `miniflare` → `ws`, plus `qs`). None are in the Next.js request path that serves users. `npm run audit` exits non-zero, which fails `npm run quality`.
- **Why:** Keep the `quality` gate green and the deploy toolchain current.
- **Fix:** Bump `@opennextjs/cloudflare`/`wrangler` to a version with patched transitive deps and re-verify `npm run package`. Avoid a blind `npm audit fix` (pulls a `wrangler` major).
- **Effort:** ~1 hr incl. a package build smoke. **Risk:** Medium — `wrangler` majors can break the OpenNext adapter; verify the Cloudflare build after.

### P2-4 Sanitize `character_name` in the identity-verification upload
- **What:** `src/app/api/verification/route.ts` stores the multipart `character_name` (length-checked, max 100) without `sanitizeText()`, unlike the other text-writing routes. It is only ever rendered in the admin panel, so impact is low, but it is inconsistent with the project's "sanitize all user text before storage" rule (CLAUDE.md security section).
- **Why:** Defense-in-depth and consistency.
- **Fix:** Apply `sanitizeText(characterName)` before insert. **Effort:** 5 min. **Risk:** Very low.

## Security & secrets note (no action coded — flagging per mission constraints)

- `tibia-services/.env.local` (lines 4–6) contains a **live** Supabase project URL, a `sb_publishable_...` anon key, and a `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_...`). The value was not printed beyond this reference and no live DB/API was contacted. The directory is **not** a git repo and `.gitignore` excludes `.env*`, so the secret is not committed — but a real service-role key sitting on disk should be rotated if this machine/workspace is shared, and production must source it from a secret manager, never a checked-in file.
- No secrets are committed to the source tree; `env.ts` correctly rejects placeholder values and `server-only` guards the admin client. Good posture overall.
