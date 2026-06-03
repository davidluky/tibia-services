# Sub-project A: Customer Service Requests + Serviceiro Stats

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

**Goal:** Let customers post service requests through a form, and display rich stats on serviceiro profile pages.

**Architecture:** New request form lives at `/servicos/novo` (server wrapper + client form). A new POST API endpoint inserts into the existing `service_requests` table (no schema changes needed). Stats are computed from already-fetched data and rendered in two new `'use client'` components inserted into the serviceiro profile page.

**Tech Stack:** Next.js 14 App Router, Supabase (existing client), TypeScript, TailwindCSS, React

---

## Feature 1: Customer posts service requests

### User flow
1. A logged-in customer visits `/servicos` and sees a **"Publicar pedido"** button in the page header (only when `isCustomer === true`)
2. Button links to `/servicos/novo`
3. `/servicos/novo` server page checks auth — redirects to `/auth/login` if not logged in, redirects to `/servicos` if user is a serviceiro or admin
4. Customer fills out the form and submits
5. `POST /api/service-requests` validates and inserts the row
6. On success: client receives `{ id }`, then calls `router.push('/servicos')` (client-side redirect — this is a `fetch` POST, not a form action)

### Form fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| service_type | select (GAMEPLAY_TYPES) | yes | must be non-empty valid key |
| title | text input | yes | 5–100 chars |
| description | textarea | no | max 500 chars |
| time_preference | radio: Flexible / Scheduled | yes | — |
| preferred_date | date input | if scheduled | client-side: `dateValue >= new Date().toISOString().slice(0,10)` (UTC comparison to match server) |
| preferred_time | time input | if scheduled | required if scheduled, no format validation |
| budget_tc | number input | no | use `isValidTC()` for validation; call `snapToTC()` on the value **before** including it in the POST body |

### Form error display
- **Inline per-field errors** shown below each input: `<p className="text-status-error text-xs mt-1">{errorMessage}</p>`
- **Top-of-form banner** for API-level errors (server page already redirects unauthenticated users on load, so a 401 from the API means the session expired *after* the page loaded — mid-session expiry only):
  - 401 session expired → show banner `t('requests_error_session')`, do NOT redirect
  - 403 role → show banner `t('requests_error_role')` (defensive; server page should have redirected)
  - 500 generic → show banner `t('requests_error_generic')`

### API: `POST /api/service-requests`
- **Note:** The directory `src/app/api/service-requests/` already exists (contains `[id]/apply/route.ts`). Create `route.ts` in that same directory.
- 401 if not authenticated
- Fetch profile from `profiles` table; check `role === 'customer'` → 403 if not
- Check `is_banned === false` → 403 `{ error: 'banned' }` if banned
- Server-side validation (return 400 `{ error: string }` for each failure):
  - `service_type` must be a non-empty string in the valid GAMEPLAY_TYPES key list
  - `title` must be 5–100 chars
  - `description` if present must be ≤ 500 chars
  - `budget_tc` if present must pass `isValidTC(budget_tc)` (already exists in `src/lib/utils.ts`)
  - if `flexible_time === false`: `preferred_date` must be present → 400 if missing; `preferred_date` must be >= today's UTC date string (`new Date().toISOString().slice(0,10)`) → 400 if in the past
- `flexible_time = true` when `time_preference === 'flexible'`; in that case set `preferred_date = null`, `preferred_time = null` regardless of what the client sent
- Multiple open requests per customer/service_type are **allowed** — deliberate design choice, no uniqueness constraint
- On success: insert row, return `{ id }`
- On unexpected DB error: return 500 `{ error: 'server_error' }`

### Props changes to existing files
**`src/app/servicos/page.tsx`** — already fetches `profile.role` once to derive `isServiceiro`. From the same fetch, also derive:
```ts
const isCustomer = profile?.role === 'customer'
```
No second DB query. Pass both `isServiceiro` and `isCustomer` to `ServiceRequestsClient`.

**`src/app/servicos/ServiceRequestsClient.tsx`** — add `isCustomer: boolean` to the `ServiceRequestsClientProps` interface AND the JSX call site in `page.tsx`. Render a `<Link href="/servicos/novo">` "Publicar pedido" button in the page header when `isCustomer === true`.

### Files
- **Create:** `src/app/servicos/novo/page.tsx` — server component: auth + role check with redirects, renders `<NewRequestForm />`
- **Create:** `src/app/servicos/novo/NewRequestForm.tsx` — `'use client'` form with all fields, inline field errors, top-of-form error banner, calls POST via `fetch`, then `router.push('/servicos')` on success
- **Create:** `src/app/api/service-requests/route.ts` — POST handler (directory already exists)
- **Modify:** `src/app/servicos/page.tsx` — derive `isCustomer` from existing profile fetch; add to props
- **Modify:** `src/app/servicos/ServiceRequestsClient.tsx` — add `isCustomer` to props interface; render button

### i18n keys (add to all 3 locales in `src/lib/i18n.ts`)
```
requests_post_btn             pt: "Publicar pedido"                            en: "Post a request"                          es: "Publicar pedido"
requests_novo_title           pt: "Novo pedido de serviço"                     en: "New service request"                     es: "Nueva solicitud de servicio"
requests_novo_subtitle        pt: "Descreva o que você precisa e aguarde um serviceiro entrar em contato."
                              en: "Describe what you need and wait for a serviceiro to reach out."
                              es: "Describe lo que necesitas y espera que un serviceiro te contacte."
requests_field_type           pt: "Tipo de serviço"                            en: "Service type"                            es: "Tipo de servicio"
requests_field_title          pt: "Título"                                     en: "Title"                                   es: "Título"
requests_field_desc           pt: "Descrição (opcional)"                       en: "Description (optional)"                  es: "Descripción (opcional)"
requests_field_time           pt: "Disponibilidade"                            en: "Availability"                            es: "Disponibilidad"
requests_field_flexible       pt: "Horário flexível"                           en: "Flexible schedule"                       es: "Horario flexible"
requests_field_scheduled      pt: "Data e hora específicas"                    en: "Specific date & time"                    es: "Fecha y hora específicas"
requests_field_date           pt: "Data preferida"                             en: "Preferred date"                          es: "Fecha preferida"
requests_field_time_input     pt: "Hora preferida"                             en: "Preferred time"                          es: "Hora preferida"
requests_field_budget         pt: "Orçamento em TC (opcional)"                 en: "Budget in TC (optional)"                 es: "Presupuesto en TC (opcional)"
requests_submit               pt: "Publicar pedido"                            en: "Post request"                            es: "Publicar pedido"
requests_submitting           pt: "Publicando..."                              en: "Posting..."                              es: "Publicando..."
requests_error_type           pt: "Selecione um tipo de serviço"               en: "Select a service type"                   es: "Seleccione un tipo de servicio"
requests_error_title          pt: "Título: entre 5 e 100 caracteres"           en: "Title: 5 to 100 characters"              es: "Título: entre 5 y 100 caracteres"
requests_error_desc           pt: "Descrição: máximo 500 caracteres"           en: "Description: max 500 characters"         es: "Descripción: máximo 500 caracteres"
requests_error_role           pt: "Apenas clientes podem publicar pedidos"     en: "Only customers can post requests"        es: "Solo clientes pueden publicar pedidos"
requests_error_date_required  pt: "Selecione uma data"                         en: "Select a date"                           es: "Seleccione una fecha"
requests_error_date_past      pt: "Selecione uma data de hoje em diante"       en: "Select today or a future date"           es: "Seleccione una fecha futura"
requests_error_budget         pt: "Orçamento inválido (mín. 25, múltiplo de 25)" en: "Invalid budget (min 25, multiple of 25)" es: "Presupuesto inválido (mín. 25, múltiplo de 25)"
requests_error_session        pt: "Sua sessão expirou. Faça login novamente."  en: "Your session expired. Please log in again." es: "Tu sesión expiró. Inicia sesión de nuevo."
requests_error_generic        pt: "Erro ao publicar. Tente novamente."         en: "Failed to post. Please try again."       es: "Error al publicar. Intenta de nuevo."
```

---

## Feature 2: Serviceiro stats

### Data computation — in `src/app/serviceiro/[id]/page.tsx` (server-side)
The page already fetches `completions` from the `serviceiro_completion_counts` view and builds `completion_counts: Record<string, number>`. Add one line after that:
```ts
const totalCompleted = Object.values(completion_counts).reduce((a, b) => a + b, 0)
```
Pass `totalCompleted` as a prop to **both** `ServiceiroSummaryLine` and `ServiceiroStats` — computed once, no duplication.

### `memberSince(isoString, lang)` utility
Add to `src/lib/utils.ts`. Pure function, no hooks, callable from server or client. Uses hardcoded locale strings (justified: purely numeric unit formatting for 3 fixed languages — simpler than adding i18n keys for math-derived strings).

```ts
export function memberSince(isoString: string, lang: string): string
```

Logic: `diffMonths = Math.floor((Date.now() - new Date(isoString).getTime()) / (1000*60*60*24*30.44))`

| diffMonths | pt | en | es |
|------------|----|----|-----|
| < 1 | "menos de 1 mês" | "less than 1 month" | "menos de 1 mes" |
| 1–11 | "{n} meses" (1 → "1 mês") | "{n} months" (1 → "1 month") | "{n} meses" (1 → "1 mes") |
| 12+ (whole years, 0 remaining months) | "1 ano" / "{y} anos" | "1 year" / "{y} years" | "1 año" / "{y} años" |
| 12+ (years + remaining months) | "{y} ano(s) e {m} mês/meses" | "{y} year(s) and {m} month(s)" | "{y} año(s) y {m} mes(es)" |

### `ServiceiroSummaryLine` component
**File:** `src/components/serviceiro/ServiceiroSummaryLine.tsx`
**Type:** `'use client'` — needs `useLanguage()` hook for `t()` and `lang`; no interactivity.

Props:
```ts
interface Props {
  totalCompleted: number
  memberSinceDate: string  // profile.created_at ISO string
}
```

Renders (inserted in the profile header Card, directly below the existing Stars/rating block):
```tsx
<p className="text-text-muted text-xs mt-1">
  {totalCompleted} {t('stats_completed')} · {t('stats_member_for')} {memberSince(memberSinceDate, lang)}
</p>
```

### `ServiceiroStats` component
**File:** `src/components/serviceiro/ServiceiroStats.tsx`
**Type:** `'use client'` — needs `useLanguage()`.

Props:
```ts
interface Props {
  completionCounts: Record<string, number>   // from serviceiro_completion_counts view
  avgRating: number | null
  reviewCount: number
  totalCompleted: number                     // pre-computed by page, passed in
  memberSinceDate: string                    // profile.created_at ISO string
}
```

Render condition: `if (totalCompleted === 0 && reviewCount === 0) return null` — hides the section entirely for brand-new serviceiros.

**Placement:** Inserted in `src/app/serviceiro/[id]/page.tsx` in the left column (`lg:col-span-2`) between the "Serviços oferecidos" Card (gameplay_types section) and the "Disponibilidade" Card (AvailabilityGrid). Insert after the `</Card>` that closes the gameplay_types section and before the `<Card className="p-6">` that wraps `<AvailabilityGrid`.

Contents:
1. Section heading: `<h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">{t('stats_title')}</h2>`
2. 2×2 stat tile grid (each tile: large number + small label below):
   - `totalCompleted` + `t('stats_completed')`
   - `avgRating ? avgRating.toFixed(1) + ' ★' : '—'` + `t('stats_avg_rating')`
   - `reviewCount` + `t('stats_reviews')`
   - `memberSince(memberSinceDate, lang)` + `t('stats_member_since')`
3. If any `Object.entries(completionCounts).filter(([,v]) => v > 0)` exist: sub-heading `t('stats_by_type')` + a list of `{GAMEPLAY_TYPES label}: {count} {t('stats_completed_each')}` per type with count > 0

### Files
- **Create:** `src/components/serviceiro/ServiceiroStats.tsx`
- **Create:** `src/components/serviceiro/ServiceiroSummaryLine.tsx`
- **Modify:** `src/app/serviceiro/[id]/page.tsx` — add `totalCompleted` computation; import and place both new components
- **Modify:** `src/lib/utils.ts` — add `memberSince(isoString, lang)` function

### i18n keys (add to all 3 locales in `src/lib/i18n.ts`)
```
stats_title           pt: "Estatísticas"            en: "Stats"                    es: "Estadísticas"
stats_completed       pt: "serviços concluídos"      en: "services completed"       es: "servicios completados"
stats_avg_rating      pt: "Média de avaliação"       en: "Avg. rating"              es: "Calificación media"
stats_reviews         pt: "Avaliações recebidas"     en: "Reviews received"         es: "Reseñas recibidas"
stats_member_since    pt: "Membro desde"             en: "Member since"             es: "Miembro desde"
stats_member_for      pt: "membro há"                en: "member for"               es: "miembro hace"
stats_by_type         pt: "Por tipo de serviço"      en: "By service type"          es: "Por tipo de servicio"
stats_completed_each  pt: "concluídos"               en: "completed"                es: "completados"
```

---

## No new Supabase SQL required

The `service_requests` table was created by `supabase/seed_mock_service_requests.sql` (already run by the user). Its exact schema is:

```sql
CREATE TABLE IF NOT EXISTS service_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type   TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  flexible_time  BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_date DATE,               -- stored as DATE, not TIMESTAMPTZ
  preferred_time TEXT,               -- stored as "HH:MM" string
  budget_tc      INTEGER,
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'taken', 'closed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

RLS policies already in place (from the same file):
- `Anyone can read open requests` — SELECT WHERE status = 'open'
- `Customers can insert own requests` — INSERT WITH CHECK (auth.uid() = customer_id)
- `Customers can update own requests` — UPDATE USING (auth.uid() = customer_id)

The POST route must set `customer_id = user.id` (Supabase auth UID) in the INSERT — the RLS policy enforces this server-side as well.

Other pre-existing dependencies:
- `serviceiro_completion_counts` view already exists
- `isValidTC()` and `snapToTC()` already exist in `src/lib/utils.ts`
- No schema migrations needed
