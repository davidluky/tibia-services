# Tibia Services

A marketplace for Tibia game services -- connect with verified serviceiros for hunting, quests, bestiary, and more.

## Features

- **Marketplace** -- Browse serviceiros with filters (vocation, gameplay type, weekday, name)
- **Booking System** -- Request, negotiate price, track payment, and confirm completion
- **In-Booking Chat** -- Real-time messaging between customer and serviceiro
- **Reviews** -- 1-5 star ratings with comments after completed bookings
- **Character Verification** -- Prove character ownership via TibiaData API
- **Identity Verification** -- Screenshot + ID document review by admin
- **Featured Listings** -- Pay TC to boost profile visibility
- **Dispute Resolution** -- Customer-opened disputes resolved by admin
- **Service Requests** -- Customers post requests, serviceiros apply
- **Admin Panel** -- User management, verification review, dispute resolution, review moderation
- **i18n** -- Portuguese, English, and Spanish (400+ keys)
- **Analytics** -- Serviceiro KPI dashboard with monthly charts
- **Email Notifications** -- Booking status change emails via Resend

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local from .env.local.example and fill in your Supabase + Resend keys

# 3. Start development server
npm run dev
```

See [SETUP.md](SETUP.md) for the full 10-step beginner guide.

## Documentation

| Document | Description |
|----------|-------------|
| [SETUP.md](SETUP.md) | 10-step beginner setup guide |
| [HOW-TO-CHANGE.md](HOW-TO-CHANGE.md) | How to modify the site |
| [DONE.md](DONE.md) | Feature list and next steps |
| [CLAUDE.md](CLAUDE.md) | Technical reference for AI coding sessions |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contributing guide |
| [docs/build-commands.md](docs/build-commands.md) | Build, test, audit, and quality gates |
| [docs/design-decisions.md](docs/design-decisions.md) | Architecture and data model decisions |
| [docs/developer-guide.md](docs/developer-guide.md) | Developer guide (auth, bookings, i18n, adding features) |
| [docs/tech-notes.md](docs/tech-notes.md) | Implementation details (rate limiting, verification, state machine) |
| [docs/version-history.md](docs/version-history.md) | Version history and changelog |

## Built With

- [Next.js 15](https://nextjs.org/) -- App Router, Server Components, API Routes
- [Supabase](https://supabase.com/) -- PostgreSQL, Auth, Storage, Row-Level Security
- [TypeScript](https://www.typescriptlang.org/) -- End-to-end type safety
- [Tailwind CSS](https://tailwindcss.com/) -- Utility-first styling with custom theme
- [Resend](https://resend.com/) -- Transactional email notifications
- [Jest](https://jestjs.io/) + [React Testing Library](https://testing-library.com/) -- Unit tests
