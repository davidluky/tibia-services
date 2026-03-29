# Sub-project E: Availability Summary — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a human-readable text summary of a serviceiro's availability above the existing AvailabilityGrid heatmap on the public profile page.

**Architecture:** Five new i18n keys added to all three locales. A new `AvailabilitySummary` client component renders the text summary. The public profile page is updated to render `AvailabilitySummary` above the existing `AvailabilityGrid` — no backend changes.

**Tech Stack:** Next.js 14 App Router, TypeScript, `useLanguage()` hook from `@/lib/language-context`.

---

## Chunk 1: i18n Keys

### Task 1: Add new translation keys to `src/lib/i18n.ts`

**Files:**
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Add 5 keys to the `pt` locale**

In the `pt` object, after `avail_legend_off: 'Folga'`, add:

```typescript
    avail_summary_days_all: 'Todos os dias',
    avail_summary_days_none: 'Sem disponibilidade',
    avail_summary_hours_any: 'horário flexível',
    avail_summary_hours_range: 'das {from} às {to}',
    avail_summary_timezone: 'UTC{offset}',
```

- [ ] **Step 2: Add 5 keys to the `en` locale**

In the `en` object, after `avail_legend_off: 'Day off'`, add:

```typescript
    avail_summary_days_all: 'Every day',
    avail_summary_days_none: 'No availability set',
    avail_summary_hours_any: 'flexible hours',
    avail_summary_hours_range: '{from} to {to}',
    avail_summary_timezone: 'UTC{offset}',
```

- [ ] **Step 3: Add 5 keys to the `es` locale**

In the `es` object, after `avail_legend_off` (the es equivalent — search for it), add:

```typescript
    avail_summary_days_all: 'Todos los días',
    avail_summary_days_none: 'Sin disponibilidad',
    avail_summary_hours_any: 'horario flexible',
    avail_summary_hours_range: 'de {from} a {to}',
    avail_summary_timezone: 'UTC{offset}',
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/lib/i18n.ts && git commit -m "feat(avail-summary): add i18n keys for availability summary"
```

---

## Chunk 2: AvailabilitySummary Component

### Task 2: Create `src/components/serviceiro/AvailabilitySummary.tsx`

**Files:**
- Create: `src/components/serviceiro/AvailabilitySummary.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'
import { useLanguage } from '@/lib/language-context'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

interface Props {
  availableWeekdays: string[]
  availableFrom: string | null
  availableTo: string | null
  timezoneOffset: number
}

export function AvailabilitySummary({ availableWeekdays, availableFrom, availableTo, timezoneOffset }: Props) {
  const { t } = useLanguage()

  if (availableWeekdays.length === 0) {
    return (
      <p className="text-sm text-text-muted mb-3">{t('avail_summary_days_none')}</p>
    )
  }

  const daysAllSet = new Set(availableWeekdays).size === 7

  const daysText = daysAllSet
    ? t('avail_summary_days_all')
    : availableWeekdays
        .sort((a, b) => DAY_KEYS.indexOf(a as typeof DAY_KEYS[number]) - DAY_KEYS.indexOf(b as typeof DAY_KEYS[number]))
        .map(d => t(`avail_${d}` as Parameters<typeof t>[0]))
        .join(', ')

  const hoursText = availableFrom && availableTo
    ? t('avail_summary_hours_range').replace('{from}', availableFrom).replace('{to}', availableTo)
    : t('avail_summary_hours_any')

  const tzOffset = timezoneOffset >= 0 ? `+${timezoneOffset}` : String(timezoneOffset)
  const tzText = t('avail_summary_timezone').replace('{offset}', tzOffset)

  return (
    <p className="text-sm text-text-muted mb-3">
      {daysText} · {hoursText} · {tzText}
    </p>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add src/components/serviceiro/AvailabilitySummary.tsx && git commit -m "feat(avail-summary): add AvailabilitySummary component"
```

---

## Chunk 3: Profile Page Integration

### Task 3: Add AvailabilitySummary to profile page

**Files:**
- Modify: `src/app/serviceiro/[id]/page.tsx`

- [ ] **Step 1: Add import**

At the bottom of the imports in `src/app/serviceiro/[id]/page.tsx`, add:

```typescript
import { AvailabilitySummary } from '@/components/serviceiro/AvailabilitySummary'
```

- [ ] **Step 2: Add AvailabilitySummary above AvailabilityGrid**

Find the `{/* Availability */}` card block (around line 149-157):

```tsx
          {/* Availability */}
          <Card className="p-6">
            <AvailabilityGrid
              availableWeekdays={sp.available_weekdays ?? []}
              availableFrom={sp.available_from}
              availableTo={sp.available_to}
              timezoneOffset={sp.timezone_offset ?? -3}
            />
          </Card>
```

Replace with:

```tsx
          {/* Availability */}
          <Card className="p-6">
            <AvailabilitySummary
              availableWeekdays={sp.available_weekdays ?? []}
              availableFrom={sp.available_from}
              availableTo={sp.available_to}
              timezoneOffset={sp.timezone_offset ?? -3}
            />
            <AvailabilityGrid
              availableWeekdays={sp.available_weekdays ?? []}
              availableFrom={sp.available_from}
              availableTo={sp.available_to}
              timezoneOffset={sp.timezone_offset ?? -3}
            />
          </Card>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/david/OneDrive/Desktop/Programas/tibia-services" && git add "src/app/serviceiro/[id]/page.tsx" && git commit -m "feat(avail-summary): add AvailabilitySummary to serviceiro profile page"
```
