# Sub-project E: Availability Summary

## Goal

Add a human-readable text summary of a serviceiro's availability above the existing heatmap grid on the public profile page. The grid (existing, unchanged) shows exact hour blocks; the summary provides an at-a-glance description.

## Context

The existing `AvailabilityGrid` component renders a 7×24 pixel heatmap. It's information-dense but requires effort to read. Adding a text summary makes the most common case ("is this person available weekday evenings?") immediately readable.

No backend changes. No new DB columns. Pure UI + i18n.

---

## Chunk 1: i18n Keys

### New translation keys in `src/lib/i18n.ts`

Add to all three locales (`pt`, `en`, `es`):

```
avail_summary_days_all      pt: "Todos os dias"           en: "Every day"              es: "Todos los días"
avail_summary_days_none     pt: "Sem disponibilidade"     en: "No availability set"    es: "Sin disponibilidad"
avail_summary_hours_any     pt: "horário flexível"        en: "flexible hours"         es: "horario flexible"
avail_summary_hours_range   pt: "das {from} às {to}"     en: "{from} to {to}"         es: "de {from} a {to}"
avail_summary_timezone      pt: "UTC{offset}"            en: "UTC{offset}"            es: "UTC{offset}"
```

Day name abbreviations (reuse existing keys already in i18n): `avail_mon`, `avail_tue`, `avail_wed`, `avail_thu`, `avail_fri`, `avail_sat`, `avail_sun` — these already exist.

---

## Chunk 2: AvailabilitySummary Component

### New file: `src/components/serviceiro/AvailabilitySummary.tsx`

`'use client'` (uses `useLanguage()`).

**Props** (same shape as AvailabilityGrid):
```typescript
interface Props {
  availableWeekdays: string[]   // e.g. ['mon', 'wed', 'fri']
  availableFrom: string | null  // "HH:MM" or null
  availableTo: string | null    // "HH:MM" or null
  timezoneOffset: number        // e.g. -3
}
```

**Output examples:**
- `Todos os dias · das 18:00 às 02:00 · UTC-3`
- `Seg, Qua, Sex · horário flexível · UTC-3`
- `Ter, Qui · das 14:00 às 22:00 · UTC-3`
- `Sem disponibilidade` (when `availableWeekdays` is empty)

**Day name logic:**

Use the existing `avail_mon`, `avail_tue`, etc. translation keys for day abbreviations.

When all 7 days are selected, render `t('avail_summary_days_all')` instead of listing them.

When 0 days are selected, render `t('avail_summary_days_none')` and stop (no hours needed).

**Hours logic:**

When both `availableFrom` and `availableTo` are set: render `avail_summary_hours_range` with `{from}` = availableFrom (e.g. "18:00") and `{to}` = availableTo (e.g. "02:00").

When either is null: render `t('avail_summary_hours_any')`.

**Timezone:**

Always render the UTC offset suffix. Format: `UTC{offset >= 0 ? '+' + offset : offset}`.

**Full component:**

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

  const daysText = availableWeekdays.length === 7
    ? t('avail_summary_days_all')
    : availableWeekdays
        .sort((a, b) => DAY_KEYS.indexOf(a as typeof DAY_KEYS[number]) - DAY_KEYS.indexOf(b as typeof DAY_KEYS[number]))
        .map(d => t(`avail_${d}` as Parameters<typeof t>[0]))
        .join(', ')

  const hoursText = availableFrom && availableTo
    ? t('avail_summary_hours_range').replace('{from}', availableFrom).replace('{to}', availableTo)
    : t('avail_summary_hours_any')

  const tzText = `UTC${timezoneOffset >= 0 ? '+' + timezoneOffset : timezoneOffset}`

  return (
    <p className="text-sm text-text-muted mb-3">
      {daysText} · {hoursText} · {tzText}
    </p>
  )
}
```

---

## Chunk 3: Profile Page Integration

### `src/app/serviceiro/[id]/page.tsx`

In the Availability card section (currently around lines 143–150):

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

Change to:

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

Add the import at the bottom of the file alongside the existing imports:
```typescript
import { AvailabilitySummary } from '@/components/serviceiro/AvailabilitySummary'
```

---

## What is NOT in scope

- Interactive calendar (click to book a time slot)
- Editing availability from the profile page
- "Next available" date calculation
- Timezone conversion to visitor's local time
