# Design Decisions — Tibia Services Marketplace

## Architecture

### Next.js App Router over Pages Router
App Router supports React Server Components, which lets us fetch data on the server (no loading flicker, better SEO) while still using client components for interactive parts. The colocation of API routes (`/app/api/`) also keeps the codebase organized.

### Supabase over Firebase
- PostgreSQL gives us proper relational data and JOIN queries
- Row Level Security (RLS) enforces access control at the database level — no need for custom middleware on every endpoint
- Supabase Auth is built-in, no need for a separate auth service
- Generous free tier (500MB storage, 500MB database)
- SQL is more familiar to most developers than Firestore's document model

### TypeScript throughout
Prevents type mismatches between database types and UI components, especially for the `VocationKey`, `GameplayTypeKey`, and `WeekdayKey` union types.

### Tailwind CSS for styling
Utility-first CSS avoids naming collisions and keeps styles co-located with components. The custom `bg-bg-primary`, `text-gold`, etc. tokens are defined in `tailwind.config.ts` and reused throughout — changing the theme requires editing one file.

---

## Data Model Decisions

### Fixed vocation/gameplay type lists (constants.ts)
Storing vocations and gameplay types as arrays of string keys (e.g. `['knight', 'paladin']`) referencing a fixed list in `constants.ts` prevents inconsistent entries (e.g. "Knight" vs "knight" vs "EK"). Adding a new vocation requires updating `constants.ts` only.

### Both parties must mark booking complete
Prevents disputes: the serviceiro cannot mark a service complete before delivering it, and the customer cannot dispute delivery after marking it complete. Both must agree.

### TC-only pricing (no real money)
Tibia Coins are the in-game currency. Avoiding real money:
- No payment processor integration (no Stripe, no PCI compliance)
- No legal liability for marketplace payments
- Consistent with how the Tibia community already transacts

### TC multiples of 25
The smallest denomination in Tibia is 25 TC. Enforced by `isValidTC()` in `utils.ts` and the `TC_INCREMENT` constant.

### Contact info gated behind active/completed booking
WhatsApp and Discord are sensitive. Exposing them only after a booking is accepted prevents scraping and spam. The check is server-side (`/api/contact/[id]`) so it cannot be bypassed by the client.

---

## Security Decisions

### Service role key is server-only
The `createAdminClient()` function is only imported in API routes and server components. It bypasses RLS and should never be bundled into the client. The `SUPABASE_SERVICE_ROLE_KEY` env var is not prefixed with `NEXT_PUBLIC_` for this reason.

### RLS on all tables
Even with server-side validation, RLS is the last line of defense. If a bug allows an unauthenticated request through, RLS prevents data leakage.

### `is_visible` instead of delete for reviews
Deleting reviews loses the audit trail. Setting `is_visible = false` hides the review from the public while preserving it for moderation history.

### Admin role checked at layout level
`src/app/admin/layout.tsx` is a server component that redirects non-admins. This protects all `/admin/*` routes without needing per-page checks.

---

## UI/UX Decisions

### No real-time messaging (polling every 30s)
Real-time requires WebSockets or Supabase Realtime, which has a connection limit on the free tier. 30-second polling is simpler, free-tier safe, and sufficient for this use case (negotiations are not time-critical).

### Portuguese UI
Target audience is Brazilian Tibia players. All UI copy is in Portuguese (pt-BR). Dates and numbers use `pt-BR` locale.

### Dark gold theme
Inspired by Tibia's visual language (brown/gold medieval aesthetic). Dark backgrounds reduce eye strain for players who game at night.

### Mobile-first responsive design
Navbar collapses to hamburger on mobile. Browse page hides filter sidebar on mobile (toggle button to show). Card grid is 1 column on mobile, 2-3 on desktop.

---

## Future Improvements (not built)

- Real-time messaging via Supabase Realtime (upgrade from polling)
- Email notifications on booking status changes
- Dispute resolution flow (currently handled off-platform)
- Tibia character verification via TibiaData API (instead of manual screenshot review)
- Search by server/world name
- Serviceiro portfolio/images section
