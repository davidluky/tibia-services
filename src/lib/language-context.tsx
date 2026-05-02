'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { type Locale, type TranslationKey, getTranslation } from './i18n'

interface LanguageContextValue {
  lang: Locale
  setLang: (l: Locale) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'pt',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children, initialLang = 'pt' }: { children: ReactNode; initialLang?: Locale }) {
  const [lang, setLangState] = useState<Locale>(initialLang)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tibia_lang') as Locale | null
      if (saved && ['pt', 'en', 'es'].includes(saved)) {
        setLangState(saved)
        // Ensure cookie stays in sync on page load (needed for server components)
        try { document.cookie = `tibia_lang=${saved}; path=/; max-age=31536000; SameSite=Lax` } catch { /* ignore */ }
      }
    } catch {
      // localStorage unavailable; keep the server-provided locale.
    }
    setMounted(true)
  }, [])

  const effectiveLang = mounted ? lang : initialLang

  const setLang = (l: Locale) => {
    setLangState(l)
    try { localStorage.setItem('tibia_lang', l) } catch { /* ignore */ }
    // Mirror to cookie so server components (e.g. admin panel) can read it.
    // 1 year, Lax — this is a UI preference, not a security-sensitive value.
    try { document.cookie = `tibia_lang=${l}; path=/; max-age=31536000; SameSite=Lax` } catch { /* ignore */ }
  }

  const t = (key: string) => getTranslation(effectiveLang, key as TranslationKey)

  return (
    <LanguageContext.Provider value={{ lang: effectiveLang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
