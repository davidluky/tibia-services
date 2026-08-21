# Flight Recorder

This file captures root-cause bug classes, the guard installed, and what should prevent regression.

## 2026-08-07 - Explicit Data And Request Boundaries

- **Class:** Wildcard Supabase projections and mutation requests without one
  origin boundary made future columns and cross-site browser calls depend on
  route-by-route discipline.
- **Impact:** A later schema column could become an unintended API/page payload,
  private verification paths could be serialized without being rendered, and
  cookie-authenticated mutation routes lacked a uniform CSRF-oriented check.
- **Root cause:** Readers inferred their response shape from the current table,
  while JSON size enforcement trusted an optional `Content-Length` and origin
  policy was not centralized.
- **Guard installed:** all `src/` Supabase readers enumerate columns; narrow
  query result types describe relationship shapes; `/api/:path*` middleware
  rejects cross-origin mutations; JSON parsing requires an integer declared
  length no greater than 64 KiB.
- **Regression prevention:** projection, origin-policy, middleware-wiring,
  body-limit, and offline-script contract tests are part of the 24-suite / 152
  test set. `npm run verify:offline` passed lint, typecheck, Jest, the 36-page
  Next build, cached audit with zero findings, and OpenNext packaging.
- **Scope:** no provider, migration, email, payment, account, deployment,
  commit, or staged-state action ran. Existing owner WIP was preserved, and
  aggregate diff ownership remains mixed where already-dirty readers/helpers
  were extended.
- **Review:** `docs/CODE_PROJECT_REVIEW_2026-08-07.md`.

## 2026-08-07 - Local Green Does Not Attest Provider State

- **Class:** A large route/migration hardening batch can be locally complete
  while Supabase grants, Realtime publication, SMTP, and deployed configuration
  remain unproven.
- **Evidence:** lint and typecheck passed, 20 suites / 139 tests passed, Next
  build passed, and OpenNext packaging passed. Live registry audit did not
  return; cached offline audit reported zero findings.
- **Guard:** keep migration-role/concurrency tests and an authorized hosted
  smoke as explicit release gates. Prefer explicit API query projections over
  `select('*')` to keep future columns from leaking.
- **Scope:** no migration, provider, mail, deploy, commit, or push was run.
- **Review:** `docs/CODE_PROJECT_REVIEW_2026-08-07.md`.

## 2026-07-16 - Provider Grants Survived A PUBLIC Revoke

- **Class:** Supabase API roles retained direct execution of server-only
  `SECURITY DEFINER` functions even though an earlier migration revoked the
  PostgreSQL `PUBLIC` grant.
- **Impact:** Untrusted clients could call rate-limit and dispute-transition
  functions with caller-supplied identities.
- **Root cause:** Provider-managed role grants can exist independently of the
  inherited `PUBLIC` privilege.
- **Guard installed:** Migration 011 explicitly revokes `PUBLIC`, `anon`, and
  `authenticated`, restores only `service_role`, converts the safe profile view
  to security-invoker, pins trigger search paths, and removes duplicate legacy
  policies.
- **Regression prevention:** Probe `has_function_privilege()` with the real
  hosted roles after every definer-function migration and rerun both database
  lint and the Security Advisor.

## 2026-07-16 - Security Capability Was Plan-Gated

- **Class:** A provider advisor recommendation was not available on the active
  Free plan.
- **Impact:** Leaked-password screening cannot be enabled without a billing
  change.
- **Guard installed:** The provider minimum password length now matches the
  app's eight-character validation, and the paid-only residual warning is
  recorded instead of being reported as fixed.
- **Regression prevention:** Separate code/database defects from plan-gated
  controls during release review; never silently upgrade billing or claim a
  provider control is active without dashboard evidence.

## 2026-07-12 - Table Grant Overrode Contact Column Revocation

- **Class:** A column-level revoke attempted to hide contact fields while the public roles still had table-level `SELECT`.
- **Impact:** Direct Supabase clients could potentially select WhatsApp/Discord without the booking-gated API.
- **Root cause:** PostgreSQL privileges are additive; removing a narrow column privilege does not override a broader table grant.
- **Guard installed:** Migration 010 revokes table-wide profile reads and grants only explicit safe columns; own contact remains behind `my_contact_info()`.
- **Regression prevention:** Test privileges with real `anon`/`authenticated` database roles, not only SQL substring tests.

## 2026-07-12 - Layout-Only Admin Authorization

- **Class:** Sensitive Server Components created service-role clients while authorization lived only in a parent layout.
- **Impact:** App Router partial rendering/reused layouts made the authorization check too far from the privileged data source.
- **Root cause:** The layout was treated as a security boundary rather than a navigation guard.
- **Guard installed:** Every admin page calls `requireAdminPage()` before creating or using a service-role client; the helper rejects banned/non-admin users.
- **Regression prevention:** Authorize at each privileged page, route, server action, or data-access function.

## 2026-07-12 - Verification Privacy And Split Review Writes

- **Class:** Partial uploads and failed inserts orphaned government-ID objects; approval changed request/profile rows separately.
- **Impact:** Sensitive files could persist without a valid request and approval could become approved-but-unregistered.
- **Root cause:** Storage compensation and cross-table review transaction were missing.
- **Guard installed:** Upload magic-byte validation plus compensating deletion; migration 010 partial uniqueness and locked review RPC; post-review private-object deletion.
- **Regression prevention:** Every multi-resource workflow needs failure cleanup, transaction boundaries where available, and retry-visible errors.

## 2026-07-12 - Raceable Write Limits And Ban Gaps

- **Class:** Booking/message/request throttles counted rows before inserting, and banned participants retained mutation paths.
- **Impact:** Parallel requests could exceed limits; a suspended account could continue changing bookings or sending messages.
- **Root cause:** Atomic action RPC existed but was not used by all writes; RLS/trigger rules did not include current ban state.
- **Guard installed:** All protected write routes use the atomic ledger; migration 010 adds banned-user policies/triggers and APIs fail early with 403.
- **Regression prevention:** Abuse and suspension controls must be enforced at both API and database boundaries under concurrency.

## 2026-07-16 - Contained Service-Request Offer Model

- **Class:** A serviceiro application is represented as a normal customer-created pending booking.
- **Impact:** The applicant can accept their own unsolicited offer and repeated applications can create duplicate bookings.
- **Root cause:** The schema has no application/source identity or customer acceptance state.
- **Guard installed:** A centralized hard-off availability flag now makes the apply API return a stable 503 before auth or database access, and the serviceiro UI renders an unavailable notice instead of an actionable Apply control.
- **Decision still required:** Choose multi-applicant customer selection or first-match behavior, then implement the transactional schema/API/UI migration with explicit customer acceptance.
- **Regression prevention:** Tests prove the hold cannot reach booking creation and the UI has no enabled apply action. Do not re-enable or advertise the flow until customer-controlled acceptance and duplicate/concurrency tests exist.

## 2026-04-30 - Direct Supabase Bypass Of API Contracts

- **Class:** Public clients could bypass API validation by writing directly to Supabase tables.
- **Impact:** Forged bookings, review integrity gaps, self-activated featured listings, and serviceiro profile abuse.
- **Root cause:** Business invariants lived mostly in Next.js route handlers while RLS policies allowed broad direct writes.
- **Guard installed:** `supabase/migrations/20260430000900_contract-hardening.sql` adds RLS tightening, contract triggers, protected fields, atomic dispute RPCs, and a static migration invariant test in `src/__tests__/migration-contracts.test.ts`.
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
- **Root cause:** `schema.sql` and timestamped migrations were not described as one canonical sequence everywhere.
- **Guard installed:** Setup, migration, deployment, technical, and build docs were updated to state that canonical DB state is `schema.sql` plus every migration in timestamp order.
- **Regression prevention:** Every migration must update setup/deploy docs in the same batch.

## 2026-05-02 - Partial Booking Contract Enforcement

- **Class:** Broad participant booking updates still allowed direct clients to mutate non-status fields outside the intended workflow.
- **Impact:** A participant could change service type, mutate price after completion, or unset their own confirmations after the API would no longer expose that action.
- **Root cause:** The database trigger enforced ownership of some booleans and status transitions, but did not model final-state immutability, monotonic confirmations, or unrelated-field checks on transitions.
- **Guard installed:** Migration `20260430000900_contract-hardening.sql` now keeps service type/creation time immutable, restricts price changes to active bookings, makes final states immutable to public clients, makes confirmation flags monotonic, and blocks status transitions that include unrelated field changes. Static migration tests assert these guards.
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
- **Guard installed:** Migration `20260430000900_contract-hardening.sql` adds `check_api_action_rate_limit()` with a transaction advisory lock; `checkActionRateLimit()` now calls that RPC and treats any error as limited.
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
