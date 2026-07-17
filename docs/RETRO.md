# Retro - 2026-07-12 Portfolio Audit

## Outcome

The audit converted several convention-only safeguards into enforced local
contracts: profile contact grants, banned-user writes, atomic throttling,
verification review, private upload cleanup, and admin page authorization.
It also aligned the runtime/dependencies and strengthened frontend failure and
accessibility behavior. The follow-up applied and role-tested all 11 migrations,
configured verified Resend/Supabase SMTP and Vercel production variables, and
reduced the live Security Advisor to zero errors plus two explicit residual
warnings. Application deployment and hosted smoke remain the final release
proof.

## Lessons

- PostgreSQL grants are additive; RLS and a narrow revoke do not compensate for
  a broader table privilege. Test the real database role, not just SQL text.
- App Router layouts are useful navigation guards but authorization belongs at
  each privileged data access.
- Awaiting an email provider solves abandoned serverless work, not durable
  delivery. Durable guarantees require an outbox, idempotency, and retry owner.
- Upload workflows crossing storage and SQL need compensation on every partial
  failure and a defined retention/deletion point.
- A feature named "apply" needs an explicit domain state. Reusing a booking
  state whose acceptance belongs to the applicant creates a product/security
  contradiction that tests cannot paper over.
- Revoking `PUBLIC` is not proof that provider-managed API roles lost an
  explicit grant. Hosted role probes and provider advisors are part of the
  migration contract for `SECURITY DEFINER` functions.
- Plan-gated controls must be reported as residual risk, not silently upgraded
  or marked complete. Strengthen the controls available on the current plan and
  preserve the exact billing-dependent follow-up.

## Follow-up order

1. Push the verified release and complete Vercel hosted smoke checks.
2. Choose and implement the service-request application/customer-selection model.
3. Add transactional delivery outbox/retry processing.
4. Add DB behavior integration tests, generated Supabase types, and pagination/aggregates.
5. Revisit leaked-password screening only with an explicit Supabase plan decision.

---

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
- The Supabase migrations are not applied externally from this workspace yet. Production safety depends on applying `schema.sql` plus every timestamped migration in filename order.
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
