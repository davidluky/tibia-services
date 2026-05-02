'use client'
import { LanguageProvider } from '@/lib/language-context'
import { ReactNode } from 'react'
import type { Locale } from '@/lib/i18n'

export function Providers({ children, initialLang }: { children: ReactNode; initialLang: Locale }) {
  return <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
}
