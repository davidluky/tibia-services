# Flight Recorder

This file captures root-cause bug classes, the guard installed, and what should prevent regression.

## 2026-04-30 - Direct Supabase Bypass Of API Contracts

- **Class:** Public clients could bypass API validation by writing directly to Supabase tables.
- **Impact:** Forged bookings, review integrity gaps, self-activated featured listings, and serviceiro profile abuse.
- **Root cause:** Business invariants lived mostly in Next.js route handlers while RLS policies allowed broad direct writes.
- **Guard installed:** `supabase/migrations/009-contract-hardening.sql` adds RLS tightening, contract triggers, protected fields, atomic dispute RPCs, and a static migration invariant test in `src/__tests__/migration-contracts.test.ts`.
- **Regression prevention:** Keep marketplace state invariants in database policies, triggers, constraints, or RPCs before exposing any public client write path.

## 2026-04-30 - Non-Atomic Dispute State Changes

- **Class:** Dispute rows and booking status could diverge because route handlers performed split writes.
- **Impact:** A dispute could exist without the matching booking status, or a booking could be updated after a failed dispute transition.
- **Root cause:** Cross-table state changes were modeled as route-level sequences instead of one transactional database operation.
- **Guard installed:** Public dispute inserts were disabled, and dispute open/resolve now use `open_booking_dispute` and `resolve_booking_dispute` RPCs.
- **Regression prevention:** Any future multi-table state transition should be implemented as an RPC or equivalent transaction-backed service.

## 2026-04-30 - Unsafe Request Parsing And Abuse Controls

- **Class:** API routes parsed JSON or multipart bodies before consistent malformed-body, size, timeout, or rate-limit handling.
- **Impact:** Avoidable 500s, upload memory pressure, and unbounded external verification calls.
- **Root cause:** Each route parsed requests independently instead of using one boundary helper.
- **Guard installed:** `parseJsonBody()`, `rejectOversizedRequest()`, and `checkActionRateLimit()` were added and routes were updated to use them. Verification upload and TibiaData calls now have stronger guards.
- **Regression prevention:** New API routes should use shared request helpers and route-specific rate limits before parsing large or external-call payloads.

## 2026-04-30 - Service Role Boundary Drift

- **Class:** Server-only Supabase clients depended on convention and comments.
- **Impact:** A future import could accidentally expose privileged behavior to the client bundle.
- **Root cause:** Missing compile/build-time server-only guard and centralized env validation.
- **Guard installed:** Added `server-only` imports and `requireServerEnv()` for required server environment variables.
- **Regression prevention:** Privileged clients and helpers must live in server-only modules and validate env at construction time.

## 2026-04-30 - Quality Gate Drift

- **Class:** Lint warnings, stale scripts, dependency audit findings, and missing CI could accumulate.
- **Impact:** Known warnings and advisories could become invisible release risk.
- **Root cause:** Quality checks were available but not represented as one strict gate.
- **Guard installed:** Added `lint` with `--max-warnings=0`, `typecheck`, `audit`, `quality`, dependency updates/overrides, and `.github/workflows/quality.yml`.
- **Regression prevention:** Treat `npm run quality` as the pre-commit and pre-deploy gate.

## 2026-04-30 - Setup And Deployment Documentation Drift

- **Class:** Fresh setup docs could point deployers at an incomplete or unsafe database state.
- **Impact:** New environments could miss security migrations even when the source code was fixed.
- **Root cause:** `schema.sql` and numbered migrations were not described as one canonical sequence everywhere.
- **Guard installed:** Setup, migration, deployment, technical, and build docs were updated to state that canonical DB state is `schema.sql` plus migrations `001` through `009`.
- **Regression prevention:** Every migration must update setup/deploy docs in the same batch.

## 2026-05-02 - Partial Booking Contract Enforcement

- **Class:** Broad participant booking updates still allowed direct clients to mutate non-status fields outside the intended workflow.
- **Impact:** A participant could change service type, mutate price after completion, or unset their own confirmations after the API would no longer expose that action.
- **Root cause:** The database trigger enforced ownership of some booleans and status transitions, but did not model final-state immutability, monotonic confirmations, or unrelated-field checks on transitions.
- **Guard installed:** Migration `009-contract-hardening.sql` now keeps service type/creation time immutable, restricts price changes to active bookings, makes final states immutable to public clients, makes confirmation flags monotonic, and blocks status transitions that include unrelated field changes. Static migration tests assert these guards.
- **Regression prevention:** When adding a booking field or action, update the trigger and migration-contract test first, then expose the route/UI action.

## 2026-05-02 - Admin Bypass Without Revalidation

- **Class:** A server route switched to the service-role client to perform a legitimate cross-user insert, but did not revalidate the row invariants normally enforced by RLS.
- **Impact:** A stale or forged open service request for a banned/non-customer profile could be converted into a booking.
- **Root cause:** Service-role writes bypass public RLS by design, so route-level revalidation must mirror the bypassed eligibility checks.
- **Guard installed:** `/api/service-requests/[id]/apply` now verifies the request customer is still a non-banned customer immediately before the admin booking insert.
- **Regression prevention:** Every service-role write that stands in for another actor must explicitly re-check the actor eligibility that public RLS would have enforced.

## 2026-05-02 - Fail-Open Action Rate Limiting

- **Class:** The action rate-limit helper used count-then-insert in application code and ignored persistence errors.
- **Impact:** Concurrent verification requests could pass the limit, and database/RPC failures silently disabled throttling.
- **Root cause:** Rate limiting was not one transactional database operation and did not fail closed at the API boundary.
- **Guard installed:** Migration `009-contract-hardening.sql` adds `check_api_action_rate_limit()` with a transaction advisory lock; `checkActionRateLimit()` now calls that RPC and treats any error as limited.
- **Regression prevention:** Abuse controls must be atomic at the persistence boundary and fail closed unless the route is explicitly non-security-sensitive.

## 2026-05-02 - CI-Only Jest Config Loader Failure

- **Class:** CI depended on a TypeScript Jest config loader that was available locally but not installed after a clean `npm ci`.
- **Impact:** GitHub Actions failed at `npm test -- --runInBand` before running tests.
- **Root cause:** `jest.config.ts` requires `ts-node` for Jest config parsing, but `ts-node` was not a project dependency and should not be required just to read test config.
- **Guard installed:** Replaced `jest.config.ts` with `jest.config.js`, added that JS config to the lint target, and moved the workflow to Node 24-compatible `actions/checkout@v6` / `actions/setup-node@v6`.
- **Regression prevention:** Keep tool configs that run before TypeScript compilation in JavaScript unless the required config loader is an explicit dependency and CI validates a clean install.

## 2026-05-11 - Next Server Cookie API Drift

- **Class:** Server Components used a synchronous Supabase SSR cookie adapter after the Next.js server cookie API became async.
- **Impact:** Server-rendered authenticated pages could fail typecheck/build or read sessions through an outdated adapter shape.
- **Root cause:** `src/lib/supabase/server.ts` still treated `cookies()` as synchronous and exposed `createClient()` as a synchronous helper.
- **Guard installed:** `createClient()` now awaits `cookies()` and uses the `getAll`/`setAll` adapter form; all server callers await it. `getAuthUser()` and rate-limit helper types were updated to the async return type.
- **Regression prevention:** When upgrading Next.js or `@supabase/ssr`, run `npm run typecheck` and keep the server Supabase adapter aligned with the current SSR cookie contract.

## 2026-05-11 - Dependency Audit Lock Drift

- **Class:** Locked dependency versions carried moderate-or-higher audit findings.
- **Impact:** `npm run quality` could fail at the audit step even when source tests passed.
- **Root cause:** The lockfile pinned `next@15.5.15` and `fast-xml-builder@1.1.5`.
- **Guard installed:** A non-force `npm audit fix` moved the lockfile to `next@15.5.18` and `fast-xml-builder@1.2.0`, adding the required `xml-naming` dependency.
- **Regression prevention:** Keep `npm run audit` in the quality gate and prefer non-force lockfile repairs for transitive advisories.
