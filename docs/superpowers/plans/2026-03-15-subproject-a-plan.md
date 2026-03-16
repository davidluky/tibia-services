# Sub-project A Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers post service requests via a form at `/servicos/novo`, and show rich stats on serviceiro profile pages.

**Architecture:** Three independent areas: (1) i18n + util foundation, (2) service request form + API, (3) two new stats components wired into the serviceiro profile page. No new database tables or migrations needed — `service_requests` table and `serviceiro_completion_counts` view already exist.

**Tech Stack:** Next.js 14 App Router, Supabase (existing clients in `src/lib/supabase/`), TypeScript, TailwindCSS. No test framework — use `npx tsc --noEmit` to verify TypeScript after each task.

**Verification command:** `npx tsc --noEmit` — must exit with no output (zero errors).

---

## Chunk 1: Foundation

### Task 1: Add i18n keys

**Files:**
- Modify: `src/lib/i18n.ts`

The file has three locale objects: `pt` (lines 4–252), `en` (lines 254–477), `es` (lines 479–702). Each ends with `requests_result_count` before the closing `},`. Add new keys **inside each locale object**, after `requests_result_count`.

- [ ] **Step 1: Add keys to the `pt` locale**

In `src/lib/i18n.ts`, find this line in the `pt` section:
```
    requests_result_count: 'pedido(s) aberto(s)',
```
Add the following immediately after it (before the closing `},`):
```ts
    // Post a service request
    requests_post_btn: 'Publicar pedido',
    requests_novo_title: 'Novo pedido de serviço',
    requests_novo_subtitle: 'Descreva o que você precisa e aguarde um serviceiro entrar em contato.',
    requests_field_type: 'Tipo de serviço',
    requests_field_title: 'Título',
    requests_field_desc: 'Descrição (opcional)',
    requests_field_time: 'Disponibilidade',
    requests_field_flexible: 'Horário flexível',
    requests_field_scheduled: 'Data e hora específicas',
    requests_field_date: 'Data preferida',
    requests_field_time_input: 'Hora preferida',
    requests_field_budget: 'Orçamento em TC (opcional)',
    requests_submit: 'Publicar pedido',
    requests_submitting: 'Publicando...',
    requests_error_type: 'Selecione um tipo de serviço',
    requests_error_title: 'Título: entre 5 e 100 caracteres',
    requests_error_desc: 'Descrição: máximo 500 caracteres',
    requests_error_role: 'Apenas clientes podem publicar pedidos',
    requests_error_date_required: 'Selecione uma data',
    requests_error_date_past: 'Selecione uma data de hoje em diante',
    requests_error_budget: 'Orçamento inválido (mín. 25, múltiplo de 25)',
    requests_error_session: 'Sua sessão expirou. Faça login novamente.',
    requests_error_generic: 'Erro ao publicar. Tente novamente.',
    // Serviceiro stats
    stats_title: 'Estatísticas',
    stats_completed: 'serviços concluídos',
    stats_avg_rating: 'Média de avaliação',
    stats_reviews: 'Avaliações recebidas',
    stats_member_since: 'Membro desde',
    stats_member_for: 'membro há',
    stats_by_type: 'Por tipo de serviço',
    stats_completed_each: 'concluídos',
```

- [ ] **Step 2: Add keys to the `en` locale**

Find this line in the `en` section:
```
    requests_result_count: 'open request(s)',
```
Add the following immediately after it:
```ts
    // Post a service request
    requests_post_btn: 'Post a request',
    requests_novo_title: 'New service request',
    requests_novo_subtitle: 'Describe what you need and wait for a serviceiro to reach out.',
    requests_field_type: 'Service type',
    requests_field_title: 'Title',
    requests_field_desc: 'Description (optional)',
    requests_field_time: 'Availability',
    requests_field_flexible: 'Flexible schedule',
    requests_field_scheduled: 'Specific date & time',
    requests_field_date: 'Preferred date',
    requests_field_time_input: 'Preferred time',
    requests_field_budget: 'Budget in TC (optional)',
    requests_submit: 'Post request',
    requests_submitting: 'Posting...',
    requests_error_type: 'Select a service type',
    requests_error_title: 'Title: 5 to 100 characters',
    requests_error_desc: 'Description: max 500 characters',
    requests_error_role: 'Only customers can post requests',
    requests_error_date_required: 'Select a date',
    requests_error_date_past: 'Select today or a future date',
    requests_error_budget: 'Invalid budget (min 25, multiple of 25)',
    requests_error_session: 'Your session expired. Please log in again.',
    requests_error_generic: 'Failed to post. Please try again.',
    // Serviceiro stats
    stats_title: 'Stats',
    stats_completed: 'services completed',
    stats_avg_rating: 'Avg. rating',
    stats_reviews: 'Reviews received',
    stats_member_since: 'Member since',
    stats_member_for: 'member for',
    stats_by_type: 'By service type',
    stats_completed_each: 'completed',
```

- [ ] **Step 3: Add keys to the `es` locale**

Find this line in the `es` section:
```
    requests_result_count: 'pedido(s) abierto(s)',
```
Add the following immediately after it:
```ts
    // Post a service request
    requests_post_btn: 'Publicar pedido',
    requests_novo_title: 'Nueva solicitud de servicio',
    requests_novo_subtitle: 'Describe lo que necesitas y espera que un serviceiro te contacte.',
    requests_field_type: 'Tipo de servicio',
    requests_field_title: 'Título',
    requests_field_desc: 'Descripción (opcional)',
    requests_field_time: 'Disponibilidad',
    requests_field_flexible: 'Horario flexible',
    requests_field_scheduled: 'Fecha y hora específicas',
    requests_field_date: 'Fecha preferida',
    requests_field_time_input: 'Hora preferida',
    requests_field_budget: 'Presupuesto en TC (opcional)',
    requests_submit: 'Publicar pedido',
    requests_submitting: 'Publicando...',
    requests_error_type: 'Seleccione un tipo de servicio',
    requests_error_title: 'Título: entre 5 y 100 caracteres',
    requests_error_desc: 'Descripción: máximo 500 caracteres',
    requests_error_role: 'Solo clientes pueden publicar pedidos',
    requests_error_date_required: 'Seleccione una fecha',
    requests_error_date_past: 'Seleccione una fecha futura',
    requests_error_budget: 'Presupuesto inválido (mín. 25, múltiplo de 25)',
    requests_error_session: 'Tu sesión expiró. Inicia sesión de nuevo.',
    requests_error_generic: 'Error al publicar. Intenta de nuevo.',
    // Serviceiro stats
    stats_title: 'Estadísticas',
    stats_completed: 'servicios completados',
    stats_avg_rating: 'Calificación media',
    stats_reviews: 'Reseñas recibidas',
    stats_member_since: 'Miembro desde',
    stats_member_for: 'miembro hace',
    stats_by_type: 'Por tipo de servicio',
    stats_completed_each: 'completados',
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output (zero errors).

---

### Task 2: Add `memberSince` utility

**Files:**
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Add the function**

Open `src/lib/utils.ts` and append this function at the end of the file:

```ts
// How long a user has been a member, locale-aware
export function memberSince(isoString: string, lang: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))

  if (lang === 'en') {
    if (diffMonths < 1) return 'less than 1 month'
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`
    const years = Math.floor(diffMonths / 12)
    const months = diffMonths % 12
    const yearStr = `${years} ${years === 1 ? 'year' : 'years'}`
    return months === 0 ? yearStr : `${yearStr} and ${months} ${months === 1 ? 'month' : 'months'}`
  }

  if (lang === 'es') {
    if (diffMonths < 1) return 'menos de 1 mes'
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`
    const years = Math.floor(diffMonths / 12)
    const months = diffMonths % 12
    const yearStr = `${years} ${years === 1 ? 'año' : 'años'}`
    return months === 0 ? yearStr : `${yearStr} y ${months} ${months === 1 ? 'mes' : 'meses'}`
  }

  // Default: pt
  if (diffMonths < 1) return 'menos de 1 mês'
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(diffMonths / 12)
  const months = diffMonths % 12
  const yearStr = `${years} ${years === 1 ? 'ano' : 'anos'}`
  return months === 0 ? yearStr : `${yearStr} e ${months} ${months === 1 ? 'mês' : 'meses'}`
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output (zero errors).

---

## Chunk 2: Feature 1 — Service request form

### Task 3: Create the POST API route

**Files:**
- Create: `src/app/api/service-requests/route.ts`

Note: The directory `src/app/api/service-requests/` already exists (contains `[id]/apply/route.ts`). Just create the new file in it.

- [ ] **Step 1: Create the file with full content**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidTC } from '@/lib/utils'

const VALID_SERVICE_TYPES = [
  'hunt_x1', 'hunt_x2', 'hunt_x3plus', 'quests', 'ks_pk', 'bestiary',
]

export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (profile.is_banned) {
    return NextResponse.json({ error: 'banned' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const {
    service_type,
    title,
    description,
    time_preference,
    preferred_date,
    preferred_time,
    budget_tc,
  } = body as Record<string, unknown>

  // Validate service_type
  if (typeof service_type !== 'string' || !VALID_SERVICE_TYPES.includes(service_type)) {
    return NextResponse.json({ error: 'invalid_service_type' }, { status: 400 })
  }

  // Validate title
  if (typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 100) {
    return NextResponse.json({ error: 'invalid_title' }, { status: 400 })
  }

  // Validate description
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > 500) {
      return NextResponse.json({ error: 'invalid_description' }, { status: 400 })
    }
  }

  // Validate budget_tc
  if (budget_tc !== undefined && budget_tc !== null) {
    if (typeof budget_tc !== 'number' || !isValidTC(budget_tc)) {
      return NextResponse.json({ error: 'invalid_budget' }, { status: 400 })
    }
  }

  const flexible_time = time_preference === 'flexible'

  // Validate date when scheduled
  if (!flexible_time) {
    if (!preferred_date || typeof preferred_date !== 'string') {
      return NextResponse.json({ error: 'date_required' }, { status: 400 })
    }
    const today = new Date().toISOString().slice(0, 10)
    if (preferred_date < today) {
      return NextResponse.json({ error: 'date_in_past' }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      customer_id: user.id,
      service_type,
      title: title.trim(),
      description: description && typeof description === 'string' ? description.trim() || null : null,
      flexible_time,
      preferred_date: flexible_time ? null : (preferred_date as string),
      preferred_time: flexible_time ? null : (preferred_time as string | null ?? null),
      budget_tc: budget_tc ?? null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('service_requests insert error:', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output.

---

### Task 4: Create the `/servicos/novo` server page

**Files:**
- Create: `src/app/servicos/novo/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewRequestForm } from './NewRequestForm'

export default async function NewServiceRequestPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') redirect('/servicos')

  return <NewRequestForm />
}
```

- [ ] **Step 2: Skip TypeScript verification for this task**

Do NOT run `npx tsc --noEmit` yet. The file imports `NewRequestForm` which doesn't exist until Task 5, which will produce a **hard TypeScript error** (not a warning). Verification for this task runs after Task 5 is complete.

---

### Task 5: Create `NewRequestForm` client component

**Files:**
- Create: `src/app/servicos/novo/NewRequestForm.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { isValidTC, snapToTC } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export function NewRequestForm() {
  const { t } = useLanguage()
  const router = useRouter()

  const [serviceType, setServiceType] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [timePreference, setTimePreference] = useState<'flexible' | 'scheduled'>('flexible')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [budgetRaw, setBudgetRaw] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!serviceType) newErrors.serviceType = t('requests_error_type')
    if (title.trim().length < 5 || title.trim().length > 100) newErrors.title = t('requests_error_title')
    if (description && description.length > 500) newErrors.description = t('requests_error_desc')

    if (timePreference === 'scheduled') {
      if (!preferredDate) {
        newErrors.date = t('requests_error_date_required')
      } else {
        const today = new Date().toISOString().slice(0, 10)
        if (preferredDate < today) newErrors.date = t('requests_error_date_past')
      }
    }

    if (budgetRaw) {
      const parsed = parseInt(budgetRaw, 10)
      if (isNaN(parsed) || !isValidTC(parsed)) newErrors.budget = t('requests_error_budget')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError('')
    if (!validate()) return

    setLoading(true)

    const budget_tc = budgetRaw ? snapToTC(parseInt(budgetRaw, 10)) : null

    const res = await fetch('/api/service-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_type: serviceType,
        title: title.trim(),
        description: description.trim() || null,
        time_preference: timePreference,
        preferred_date: timePreference === 'scheduled' ? preferredDate : null,
        preferred_time: timePreference === 'scheduled' ? preferredTime || null : null,
        budget_tc,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setLoading(false)
      if (res.status === 401) {
        setApiError(t('requests_error_session'))
      } else if (res.status === 403) {
        setApiError(t('requests_error_role'))
      } else {
        setApiError(t('requests_error_generic'))
      }
      return
    }

    router.push('/servicos')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">{t('requests_novo_title')}</h1>
        <p className="text-text-muted mt-2 text-sm">{t('requests_novo_subtitle')}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* API error banner */}
          {apiError && (
            <div className="bg-status-error/10 border border-status-error/30 rounded-md px-4 py-3">
              <p className="text-status-error text-sm">{apiError}</p>
            </div>
          )}

          {/* Service type */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('requests_field_type')} *
            </label>
            <select
              value={serviceType}
              onChange={e => setServiceType(e.target.value)}
              className="w-full bg-bg-card border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-gold/50"
            >
              <option value="">—</option>
              {GAMEPLAY_TYPES.map(g => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
            {errors.serviceType && (
              <p className="text-status-error text-xs mt-1">{errors.serviceType}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('requests_field_title')} *
            </label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder=""
              maxLength={100}
            />
            {errors.title && (
              <p className="text-status-error text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('requests_field_desc')}
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full bg-bg-card border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-gold/50 resize-none"
            />
            {errors.description && (
              <p className="text-status-error text-xs mt-1">{errors.description}</p>
            )}
            <p className="text-text-muted text-xs mt-1 text-right">{description.length}/500</p>
          </div>

          {/* Time preference */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('requests_field_time')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="time_preference"
                  checked={timePreference === 'flexible'}
                  onChange={() => setTimePreference('flexible')}
                  className="accent-gold"
                />
                <span className="text-sm text-text-primary">{t('requests_field_flexible')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="time_preference"
                  checked={timePreference === 'scheduled'}
                  onChange={() => setTimePreference('scheduled')}
                  className="accent-gold"
                />
                <span className="text-sm text-text-primary">{t('requests_field_scheduled')}</span>
              </label>
            </div>

            {timePreference === 'scheduled' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">{t('requests_field_date')}</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={e => setPreferredDate(e.target.value)}
                    className="w-full bg-bg-card border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-gold/50"
                  />
                  {errors.date && (
                    <p className="text-status-error text-xs mt-1">{errors.date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">{t('requests_field_time_input')}</label>
                  <input
                    type="time"
                    value={preferredTime}
                    onChange={e => setPreferredTime(e.target.value)}
                    className="w-full bg-bg-card border border-border rounded-md px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-gold/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              {t('requests_field_budget')}
            </label>
            <Input
              type="number"
              value={budgetRaw}
              onChange={e => setBudgetRaw(e.target.value)}
              placeholder="0"
              min={25}
              max={100000}
              step={25}
            />
            {errors.budget && (
              <p className="text-status-error text-xs mt-1">{errors.budget}</p>
            )}
          </div>

          {/* Submit */}
          <Button type="submit" loading={loading} className="w-full">
            {loading ? t('requests_submitting') : t('requests_submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output.

---

### Task 6: Wire `isCustomer` into the `/servicos` page and client

**Files:**
- Modify: `src/app/servicos/page.tsx`
- Modify: `src/app/servicos/ServiceRequestsClient.tsx`

- [ ] **Step 1: Update `page.tsx`**

Open `src/app/servicos/page.tsx`. The current file fetches `profile.role` and derives `isServiceiro`. Update it to also derive `isCustomer` and pass it to the client:

Replace the entire file content with:
```tsx
import { createClient } from '@/lib/supabase/server'
import { ServiceRequestsClient } from './ServiceRequestsClient'

export default async function ServiceRequestsPage() {
  const supabase = createClient()

  const [{ data: { user } }, { data: requests }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('service_requests')
      .select('*, customer:profiles!customer_id(display_name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false }),
  ])

  let isServiceiro = false
  let isCustomer = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isServiceiro = profile?.role === 'serviceiro'
    isCustomer = profile?.role === 'customer'
  }

  return (
    <ServiceRequestsClient
      requests={requests ?? []}
      isServiceiro={isServiceiro}
      isCustomer={isCustomer}
      isLoggedIn={!!user}
    />
  )
}
```

- [ ] **Step 2: Update `ServiceRequestsClient.tsx`**

Open `src/app/servicos/ServiceRequestsClient.tsx`. Add `isCustomer: boolean` to the props interface and render the "Publicar pedido" button when true.

**Note:** The result count display changes from the old singular/plural pattern (`browse_result_count_plural` / `browse_result_count_singular`) to the simpler `requests_result_count` key (value: `'pedido(s) aberto(s)'`). This is intentional — the existing key already covers both cases in a compact form suitable for the requests page.

Replace the entire file content with:
```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/language-context'
import { ServiceRequestCard, type ServiceRequest } from '@/components/servicerequest/ServiceRequestCard'
import { ServiceRequestFilters, DEFAULT_REQUEST_FILTERS, type RequestFilters } from '@/components/servicerequest/ServiceRequestFilters'

function applyRequestFilters(requests: ServiceRequest[], filters: RequestFilters): ServiceRequest[] {
  return requests.filter(r => {
    if (filters.service_types.length > 0 && !filters.service_types.includes(r.service_type)) {
      return false
    }

    if (filters.time_preference === 'anytime' && !r.flexible_time) return false
    if (filters.time_preference === 'scheduled' && r.flexible_time) return false

    if (filters.budget !== 'all') {
      const b = r.budget_tc ?? 0
      if (filters.budget === 'up500' && b > 500) return false
      if (filters.budget === 'up1000' && b > 1000) return false
      if (filters.budget === 'over1000' && b <= 1000) return false
    }

    return true
  })
}

interface ServiceRequestsClientProps {
  requests: ServiceRequest[]
  isServiceiro: boolean
  isCustomer: boolean
  isLoggedIn: boolean
}

export function ServiceRequestsClient({ requests, isServiceiro, isCustomer, isLoggedIn }: ServiceRequestsClientProps) {
  const { t } = useLanguage()
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_REQUEST_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filtered = applyRequestFilters(requests, filters)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t('requests_page_title')}</h1>
          <p className="text-text-muted mt-1 text-sm">
            {t('requests_page_subtitle')} · {filtered.length} {t('requests_result_count')}
          </p>
        </div>
        {isCustomer && (
          <Link
            href="/servicos/novo"
            className="shrink-0 bg-gold text-bg-primary px-4 py-2 rounded-md text-sm font-semibold hover:bg-gold-bright transition-colors"
          >
            {t('requests_post_btn')}
          </Link>
        )}
      </div>

      {/* Mobile filter toggle */}
      <button
        className="md:hidden mb-4 flex items-center gap-2 text-sm text-text-muted border border-border rounded-md px-4 py-2 hover:border-gold/50 transition-colors"
        onClick={() => setFiltersOpen(!filtersOpen)}
      >
        ⚙ {t('browse_filters_btn')} {filtersOpen ? '▲' : '▼'}
      </button>

      <div className="flex gap-8">
        {/* Filters sidebar */}
        <div className={`${filtersOpen ? 'block' : 'hidden'} md:block w-full md:w-64 shrink-0`}>
          <ServiceRequestFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Results */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <p className="text-text-muted text-sm py-8">{t('requests_empty')}</p>
          ) : (
            <div className="space-y-4">
              {filtered.map(r => (
                <ServiceRequestCard
                  key={r.id}
                  request={r}
                  isServiceiro={isServiceiro}
                  isLoggedIn={isLoggedIn}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output.

---

## Chunk 3: Feature 2 — Serviceiro stats

### Task 7: Create `ServiceiroSummaryLine` component

**Files:**
- Create: `src/components/serviceiro/ServiceiroSummaryLine.tsx`

**Prerequisites:** Task 1 (stats_* i18n keys) and Task 2 (memberSince utility) must be complete before this task.

- [ ] **Step 1: Create the file**

```tsx
'use client'
// 'use client' is required for useLanguage() hook access.
import { useLanguage } from '@/lib/language-context'
import { memberSince } from '@/lib/utils'

interface Props {
  totalCompleted: number
  memberSinceDate: string  // profile.created_at ISO string
}

export function ServiceiroSummaryLine({ totalCompleted, memberSinceDate }: Props) {
  const { t, lang } = useLanguage()

  return (
    <p className="text-text-muted text-xs mt-1">
      {totalCompleted} {t('stats_completed')} · {t('stats_member_for')} {memberSince(memberSinceDate, lang)}
    </p>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output.

---

### Task 8: Create `ServiceiroStats` component

**Files:**
- Create: `src/components/serviceiro/ServiceiroStats.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'
import { useLanguage } from '@/lib/language-context'
import { memberSince } from '@/lib/utils'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import { Card } from '@/components/ui/Card'

interface Props {
  completionCounts: Record<string, number>
  avgRating: number | null
  reviewCount: number
  totalCompleted: number
  memberSinceDate: string
}

export function ServiceiroStats({ completionCounts, avgRating, reviewCount, totalCompleted, memberSinceDate }: Props) {
  const { t, lang } = useLanguage()

  if (totalCompleted === 0 && reviewCount === 0) return null

  const activeTypes = GAMEPLAY_TYPES.filter(g => (completionCounts[g.key] ?? 0) > 0)

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
        {t('stats_title')}
      </h2>

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gold">{totalCompleted}</p>
          <p className="text-xs text-text-muted mt-0.5">{t('stats_completed')}</p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gold">
            {avgRating !== null ? `${avgRating.toFixed(1)} ★` : '—'}
          </p>
          <p className="text-xs text-text-muted mt-0.5">{t('stats_avg_rating')}</p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gold">{reviewCount}</p>
          <p className="text-xs text-text-muted mt-0.5">{t('stats_reviews')}</p>
        </div>
        <div className="bg-bg-primary rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-gold leading-tight">
            {memberSince(memberSinceDate, lang)}
          </p>
          <p className="text-xs text-text-muted mt-0.5">{t('stats_member_since')}</p>
        </div>
      </div>

      {/* Per-type breakdown */}
      {activeTypes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            {t('stats_by_type')}
          </p>
          <div className="space-y-1.5">
            {activeTypes.map(g => (
              <div key={g.key} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{g.label}</span>
                <span className="text-gold font-medium">
                  {completionCounts[g.key]} {t('stats_completed_each')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no output.

---

### Task 9: Wire stats into the serviceiro profile page

**Files:**
- Modify: `src/app/serviceiro/[id]/page.tsx`

- [ ] **Step 1: Add `totalCompleted` computation**

Open `src/app/serviceiro/[id]/page.tsx`. Find the block that builds `completion_counts`:
```ts
  const completion_counts: Record<string, number> = {}
  completions?.forEach(c => {
    completion_counts[c.service_type] = Number(c.count)
  })
```
Add the `totalCompleted` line **immediately after** that block, before the `avg_rating` calculation:
```ts
  const totalCompleted = Object.values(completion_counts).reduce((a, b) => a + b, 0)
```

- [ ] **Step 2: Add imports**

The file places some imports at the **bottom** (after the component's closing brace). Find these two lines near the bottom of the file:
```ts
import { BookNowForm } from './BookNowForm'
import { AvailabilityGrid } from '@/components/serviceiro/AvailabilityGrid'
```
Add the two new imports immediately after them:
```ts
import { ServiceiroStats } from '@/components/serviceiro/ServiceiroStats'
import { ServiceiroSummaryLine } from '@/components/serviceiro/ServiceiroSummaryLine'
```

- [ ] **Step 3: Add `ServiceiroSummaryLine` to the profile header**

In the header Card, find this exact block (with the className included):
```tsx
                <p className="text-text-muted text-xs mt-1">
                  Membro desde {formatDate(profile.created_at)}
                </p>
```

Replace it with:
```tsx
                <ServiceiroSummaryLine
                  totalCompleted={totalCompleted}
                  memberSinceDate={profile.created_at}
                />
```

- [ ] **Step 4: Add `ServiceiroStats` card**

Find this exact multi-line block (the Card wrapping AvailabilityGrid):
```tsx
          <Card className="p-6">
            <AvailabilityGrid
              availableWeekdays={sp.available_weekdays ?? []}
```

Replace it with:
```tsx
          {/* Stats */}
          <ServiceiroStats
            completionCounts={completion_counts}
            avgRating={avg_rating}
            reviewCount={reviews?.length ?? 0}
            totalCompleted={totalCompleted}
            memberSinceDate={profile.created_at}
          />

          <Card className="p-6">
            <AvailabilityGrid
              availableWeekdays={sp.available_weekdays ?? []}
```

- [ ] **Step 5: Final TypeScript verification**

```bash
npx tsc --noEmit
```
Expected: no output (zero errors). This is the final check for the entire feature set.
