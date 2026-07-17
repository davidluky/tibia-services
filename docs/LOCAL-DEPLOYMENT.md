# Automated Production Deployment and Local Fallback

GitHub stores the source, but Actions is disabled repository-wide. Vercel's
native Git integration is the normal deployment path for
`tibia.davidluky.com`: after all release blockers are cleared, a push to
`master` builds and publishes production on Vercel. The guarded local script
remains the fallback path.

## Deployment ownership

- GitHub Actions is disabled repository-wide; `npm run quality` is a local
  release gate.
- The Vercel project is connected to `davidluky/tibia-services`, with `master`
  as its production branch. `vercel.json` explicitly keeps Git deployments
  enabled.
- Vercel's native build is the normal production path; the authenticated
  Vercel CLI is the manual fallback.
- Cloudflare/OpenNext remains a portability build only. It is not the public
  production host.

## Current release blockers

Do not use `-ApproveProduction` until all of these are complete:

1. Review and commit the active security, admin, email, and migration batch.
   The release script intentionally refuses a dirty checkout.
2. Apply and verify the canonical Supabase schema and timestamped migrations
   through `20260712001000_audit-security-hardening.sql` against the production project.
3. Confirm all seven production environment variables are present in the
   linked Vercel project without printing their values.
4. Complete the documented Supabase, Resend, and email-domain setup and the
   owner-approved live workflow checks.

## One-time setup

Use the repository's required Node 24 and npm 11 toolchain. Authenticate Vercel
if needed:

```powershell
npx.cmd --yes vercel@56.3.0 login
```

Link this checkout to the existing `tibia-services` project:

```powershell
npx.cmd --yes vercel@56.3.0 link --yes --project tibia-services
npx.cmd --yes vercel@56.3.0 git connect https://github.com/davidluky/tibia-services.git --yes
```

The command creates `.vercel/project.json`. The `.vercel` directory is ignored
by Git and must never be committed. Confirm in the Vercel project settings that
the production environment contains the variables documented in `CLAUDE.md`.

## Automated release

After every blocker above is cleared, use Node.js 24.x to run `npm ci`,
`npm run quality`, and `npm run package` from a clean checkout. Push the reviewed
commit to `master`. Vercel then builds and publishes that production branch on
its own infrastructure; no GitHub Actions runner is involved. Monitor the
Vercel deployment and smoke `https://tibia.davidluky.com`.

## Verify without deploying

From the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-production.ps1 -CheckOnly
```

The check-only path requires `master`, a clean worktree, exact equality between
`HEAD` and `origin/master`, and Node.js 24.x. It then runs:

1. an explicit Node.js 24.x check;
2. `npm ci`;
3. `npm run quality`;
4. `npm run package`;
5. Vercel authentication verification;
6. a second clean-tree and remote-head check; and
7. a retrying read-only smoke check of `https://tibia.davidluky.com`.

The OpenNext package build is deliberately retained as a portability check,
not as a Cloudflare deployment.

## Manual fallback deployment

After migrations, environment setup, check-only verification, and explicit
production approval:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-production.ps1 -ApproveProduction
```

The approved path repeats every local gate and then runs exactly:

```powershell
npx.cmd --yes vercel@56.3.0 deploy --prod --yes
```

Vercel builds the exact linked local checkout and assigns the successful
deployment to the production domain. The script then retries the public smoke
check and fails visibly if production does not become healthy.

## Recovery

Use the Vercel dashboard or authenticated CLI to inspect prior production
deployments. Promote a known-good deployment if rollback is required, then run
the public smoke check again. Keep the Git integration connected; rollback is a
deployment operation, not a reason to change automation ownership.
