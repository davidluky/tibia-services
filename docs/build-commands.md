# Build Commands

Use Node.js 24 and npm 11, as pinned by `package.json` and `.nvmrc`. Start a
fresh checkout with `npm ci`.

## Local Development

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the local Next.js dev server |
| `npm run build` | Build the production app |
| `npm run package` | Optional: build and adapt the app for Cloudflare Workers |
| `npm start` | Serve a completed production build |

## Quality Gates

| Command | Purpose |
|---------|---------|
| `npm run lint` | Run ESLint on source/config files with `--max-warnings=0` |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test -- --runInBand` | Run Jest tests serially |
| `npm run audit` | Run npm audit at moderate severity or higher |
| `npm run quality` | Run lint, typecheck, tests, build, and audit in sequence |

`npm run quality` is the Vercel pre-deploy gate and mirrors the GitHub Actions
workflow in `.github/workflows/quality.yml`. `npm run package` is deliberately
separate because Cloudflare is not the live production host and packaging would
repeat the Next.js build during the normal gate.
