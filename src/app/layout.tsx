import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Providers } from '@/components/providers/Providers'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Tibia Services — Encontre seu Serviceiro',
  description: 'Marketplace de serviceiros para Tibia. Encontre players confiáveis para hunts, quests, e mais.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col">
        <Providers>
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
