'use client'
import { useLanguage } from '@/lib/language-context'
import type { Locale } from '@/lib/i18n'

const LANGUAGES: { locale: Locale; flag: string; label: string }[] = [
  { locale: 'pt', flag: '🇧🇷', label: 'PT' },
  { locale: 'en', flag: '🇺🇸', label: 'EN' },
  { locale: 'es', flag: '🇪🇸', label: 'ES' },
]

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex items-center gap-1">
      {LANGUAGES.map(({ locale, flag, label }) => (
        <button
          key={locale}
          onClick={() => setLang(locale)}
          aria-pressed={lang === locale}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            lang === locale
              ? 'text-gold underline underline-offset-2 font-semibold'
              : 'text-text-muted hover:text-text-primary'
          }`}
          title={label}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
