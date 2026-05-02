import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Providers } from '@/components/providers/Providers'
import { Toaster } from 'react-hot-toast'
import { getServerLocale } from '@/lib/i18n-server'

const HTML_LANG_BY_LOCALE = {
  pt: 'pt-BR',
  en: 'en',
  es: 'es',
} as const

export const metadata: Metadata = {
  metadataBase: new URL((process.env.APP_URL ?? 'https://tibia.davidluky.com').replace(/\/$/, '')),
  title: 'Tibia Services — Encontre seu Serviceiro',
  description: 'Marketplace de serviceiros para Tibia. Encontre players confiáveis para hunts, quests, e mais.',
  openGraph: {
    title: 'Tibia Services — Encontre seu Serviceiro',
    description: 'Marketplace de serviceiros para Tibia. Encontre players confiáveis para hunts, quests, e mais.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Tibia Services — Encontre seu Serviceiro',
    description: 'Marketplace de serviceiros para Tibia. Encontre players confiáveis para hunts, quests, e mais.',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale()

  return (
    <html lang={HTML_LANG_BY_LOCALE[locale]}>
      <body className="min-h-screen flex flex-col">
        <Providers initialLang={locale}>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--color-bg-card, #1a1a2e)',
                color: 'var(--color-text-primary, #e2e8f0)',
                border: '1px solid var(--color-border, #2d2d44)',
              },
            }}
          />
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
