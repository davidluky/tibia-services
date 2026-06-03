# Build Commands

## Local Development

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the local Next.js dev server |
| `npm run build` | Build the production app |
| `npm run package` | Build and adapt the production app for Cloudflare Workers |
| `npm start` | Serve a completed production build |

## Quality Gates

| Command | Purpose |
|---------|---------|
| `npm run lint` | Run ESLint on source/config files with `--max-warnings=0` |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test -- --runInBand` | Run Jest tests serially |
| `npm run audit` | Run npm audit at moderate severity or higher |
| `npm run quality` | Run lint, typecheck, tests, build, and audit in sequence |

`npm run quality` is the pre-deploy gate and mirrors the GitHub Actions workflow in `.github/workflows/quality.yml`.
