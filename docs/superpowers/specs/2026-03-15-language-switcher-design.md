# Language Switcher — Design Spec
Date: 2026-03-15

## Overview
Add a 3-language switcher (Portuguese 🇧🇷, English 🇺🇸, Spanish 🇪🇸) to the site. All UI text in client components changes instantly when the user picks a language. Choice is persisted in localStorage.

## Architecture

### Translation file — `src/lib/i18n.ts`
A single typed object with all translation keys for all 3 locales:
```ts
type Locale = 'pt' | 'en' | 'es'
type Translations = { [key: string]: string }
const translations: Record<Locale, Translations> = { pt: {...}, en: {...}, es: {...} }
export function getTranslation(locale: Locale, key: string): string {
  return translations[locale][key] ?? translations['pt'][key] ?? key
}
```
All keys are in English snake_case (e.g. `nav_browse`, `register_title`). Portuguese is the canonical/default language. If a key is missing in a locale, fall back to Portuguese, then to the key itself.

### Language Provider wrapper
The `LanguageProvider` component lives in `src/lib/language-context.tsx` (same file as the context). A thin wrapper `src/components/providers/Providers.tsx` imports it and is used in `layout.tsx` to keep the server layout file clean.

### Language Context — `src/lib/language-context.tsx`
- `'use client'` directive required
- Provides `lang` (current locale) and `t(key: string): string` to client components
- Uses a `mounted` guard to prevent hydration mismatch:
  ```tsx
  const [mounted, setMounted] = useState(false)
  const [lang, setLang] = useState<Locale>('pt')
  useEffect(() => {
    const saved = localStorage.getItem('tibia_lang') as Locale | null
    if (saved) setLang(saved)
    setMounted(true)
  }, [])
  // Until mounted, t() returns Portuguese strings (matches server render)
  const effectiveLang = mounted ? lang : 'pt'
  ```
- On language change: updates state + saves to `localStorage` key `'tibia_lang'`
- If `localStorage` is unavailable (private browsing), silently defaults to `'pt'`
- Wrapped around the app in `src/app/layout.tsx` using a `LanguageProvider` client wrapper component

### Flag Switcher Component — `src/components/ui/LanguageSwitcher.tsx`
- `'use client'` directive
- Three flag+label buttons: 🇧🇷 PT · 🇺🇸 EN · 🇪🇸 ES
- Active language: gold text + gold underline
- Inactive: muted text, hover highlight
- Placed in the Navbar right side, separated from other links by a vertical divider
- Also rendered inside the mobile hamburger menu (below the other links)

## Scope of Translation

### Rule: only client components can use `t()`
Server components (files without `'use client'`) cannot call `useContext` or any hook. They render once on the server and cannot access the language context. Therefore:

- **Client components** → replace all hardcoded strings with `t('key')`
- **Server components** → strings remain in Portuguese (the default language). This is acceptable because Portuguese is the default and server-rendered text is replaced immediately on the client after hydration when a different language is selected.

Server pages that contain significant translateable text (e.g. `bookings/page.tsx`, `serviceiro/[id]/page.tsx`) pass string props or render child client components that can use `t()`. Static strings that only appear in server components (page titles used for layout) stay in Portuguese permanently.

### Client components to translate

| File | Notes |
|------|-------|
| `Navbar.tsx` | Nav links, auth buttons |
| `BrowseClient.tsx` | Filters, empty state, labels |
| `ServiceiroCard.tsx` | Card labels |
| `ServiceiroFilters.tsx` | Filter labels |
| `auth/login/page.tsx` | Already client (`'use client'`) |
| `auth/register/page.tsx` | Already client |
| `dashboard/DashboardClient.tsx` | Dashboard form labels |
| `dashboard/verification/VerificationClient.tsx` | Verification form |
| `BookingThread.tsx` | Booking status, messages. Note: the local `STATUS_LABELS` map (lines 16-22) contains Portuguese strings ("Pendente", "Ativa", etc.) — these must also be replaced with `t()` calls, not just the inline JSX strings. |
| `serviceiro/[id]/BookNowForm.tsx` | Booking form |
| `ReviewForm.tsx` | Review form labels |
| `ReviewCard.tsx` | Review display labels |
| `admin/verifications/[id]/VerificationActions.tsx` | Admin action buttons |
| `admin/users/UserActions.tsx` | Admin user actions |
| `admin/reviews/HideReviewButton.tsx` | Admin hide button |

### Explicitly excluded from translation
- `app/page.tsx` — server component; hero text stays in Portuguese
- `app/browse/page.tsx` — server wrapper; client child `BrowseClient.tsx` is translated
- `app/bookings/page.tsx` — server component; status labels stay in Portuguese
- `app/bookings/[id]/page.tsx` — server wrapper
- `app/serviceiro/[id]/page.tsx` — server wrapper
- `app/admin/**` page files — server components; action client components are translated
- `loading.tsx` — Next.js special file, cannot safely use context; stays in Portuguese
- `not-found.tsx` — Next.js special file; stays in Portuguese
- `error.tsx` — Next.js special file; stays in Portuguese

### Tibia game terminology (constants.ts)
Labels in `VOCATIONS`, `GAMEPLAY_TYPES`, and `WEEKDAYS` (e.g. "Knight", "Hunt x1", "Mon") are intentionally **not translated**. Tibia game terminology is internationally consistent — players across all regions use the same English terms. These labels remain as-is in all languages.

## Data Flow
```
App loads → LanguageProvider reads localStorage → sets lang after mount
User clicks flag → setLang(locale) → saves to localStorage → all t() calls re-render
```

## Error Handling
- Missing translation key → fall back to Portuguese string → fall back to the key string itself
- localStorage unavailable → default to `'pt'` silently (no crash)
- Hydration mismatch → prevented by `mounted` guard (server and initial client render both use `'pt'`)
