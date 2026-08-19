# Code and project review — 2026-08-07

## Outcome

The application is locally healthy: lint, strict type checking, 139 tests,
Next production build, and OpenNext packaging all pass. The in-progress API,
PII, admin, booking, notification, modal, and Supabase migration work was
reviewed and preserved. No migration was applied and no Supabase, Resend,
Cloudflare, or production boundary was touched.

A follow-up local pass closed the wildcard-projection recommendation, added a
same-origin mutation boundary and stricter declared-size JSON parsing, and
created one offline aggregate verification command. The updated gate passes 24
suites / 152 tests, production build, cached audit, and OpenNext packaging.

## Architecture assessment

- Next.js route handlers form a thin service boundary over Supabase.
- `src/lib/api-helpers.ts` centralizes authentication, ban checks, validation,
  rate limiting, and response behavior; database migrations enforce invariants
  that cannot safely live only in route code.
- OpenNext packages the application for Cloudflare. This layered design is
  suitable; database-role and provider integration tests remain essential
  because mocks cannot prove RLS, grants, Realtime, or mail behavior.

## Confirmed findings and file-specific recommendations

1. **P0 — hosted release proof:** apply and role-test the pending migrations in
   an authorized non-production environment, then smoke booking creation,
   renegotiation, Realtime messages, notifications, and email handoff. Local
   passing tests are not evidence that provider grants or publication state are
   correct.
2. **P1 — API query projections — implemented locally:** every Supabase read
   under `src/` now enumerates its returned columns. Public, booking, dashboard,
   and service-role admin readers use narrow result shapes, and the dashboard
   verification summary no longer serializes private storage paths it does not
   render. A source contract test rejects a reintroduced wildcard projection.
3. **P1 — generated database types:** regenerate and check Supabase types after
   migrations 012/013 are accepted. Route code and migration contract tests
   should compile against the deployed schema rather than parallel hand-written
   assumptions.
4. **P1 — concurrency integration:** add emulator/test-database cases that race
   price renegotiation, message creation, and rate-limit consumption. The unit
   suite validates call contracts but cannot prove transaction isolation.
5. **P2 — `src/components/ui/Modal.tsx`:** retain the new focus tests and add a
   browser smoke for focus return and nested scroll behavior on mobile.

## Additional safe local hardening

- `src/middleware.ts` covers every `/api/*` route and rejects mutating requests
  whose explicit `Origin` differs from the received request origin, as well as
  browser requests marked `Sec-Fetch-Site: cross-site`. Read-only methods and
  non-browser callers without origin metadata remain supported.
- JSON routes now require a valid, non-negative, safe-integer
  `Content-Length` at or below 64 KiB before parsing. This closes the
  missing/chunked-length path that otherwise bypassed the header size guard;
  verification multipart uploads retain their separate stricter limit.
- `npm run verify:offline` aggregates zero-warning lint, strict type checking,
  serial Jest, the production build, cached offline audit, and OpenNext
  packaging. Its package-script contract has regression coverage.
- No remote font loader or stylesheet import is present; the application uses
  its existing system/CSS font path, so no local-font migration was necessary.

## Verification evidence

- `npm run lint`: passed with zero warnings.
- `npm run typecheck`: passed.
- Jest: 20 suites, 139/139 tests passed.
- `npm run build`: passed; 36 static/dynamic routes produced.
- `npm run package`: passed; the Windows compatibility message is advisory.
- Live registry audit did not return in the review window; cached offline audit
  reported zero vulnerabilities. This is not a substitute for the live gate.
- `git diff --check`: clean; no conflict markers found.

Follow-up verification:

- `npm run verify:offline`: passed end to end using the existing dependency
  tree, with no registry install or deployment.
- ESLint: passed with `--max-warnings=0`.
- TypeScript: `tsc --noEmit --pretty false` passed.
- Jest: 24 suites, 152/152 tests passed.
- Next 15.5.20 production build: passed and generated 36 static/dynamic pages;
  the `/api/:path*` middleware bundle was included.
- `npm audit --offline --audit-level=moderate`: zero vulnerabilities in cached
  advisory data; this remains weaker evidence than the live release audit.
- OpenNext 1.20.1 packaging: passed and wrote `.open-next/worker.js`; its normal
  Windows compatibility warning remains advisory.
- `git diff --check`: passed with repository line-ending notices only.
- No live provider, migration, email, payment, account, deployment, or
  production action ran.

## Change ownership

The lane began with substantial unstaged owner WIP and no staged changes. The
follow-up deliberately edited some already-dirty readers and request helpers,
so the aggregate Git diff cannot attribute every line to this pass. Existing
API, booking, notification, modal, configuration, and pending migration work
was preserved rather than reset or reformatted; migrations 012/013 remain
unapplied owner WIP.
