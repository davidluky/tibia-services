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
