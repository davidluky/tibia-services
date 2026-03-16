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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Locale>('pt')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tibia_lang') as Locale | null
      if (saved && ['pt', 'en', 'es'].includes(saved)) setLangState(saved)
    } catch {
      // localStorage unavailable (private browsing) — stay on 'pt'
    }
    setMounted(true)
  }, [])

  const effectiveLang = mounted ? lang : 'pt'

  const setLang = (l: Locale) => {
    setLangState(l)
    try { localStorage.setItem('tibia_lang', l) } catch { /* ignore */ }
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
