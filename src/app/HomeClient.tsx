'use client'
import Link from 'next/link'
import { ServiceiroCard } from '@/components/serviceiro/ServiceiroCard'
import { useLanguage } from '@/lib/language-context'
import type { ServiceiroWithProfile } from '@/lib/types'

interface HomeClientProps {
  featured: ServiceiroWithProfile[]
}

export function HomeClient({ featured }: HomeClientProps) {
  const { t } = useLanguage()

  const title2 = t('home_hero_title_2')

  const steps = [
    { step: '1', title: t('home_how_step1_title'), desc: t('home_how_step1_desc') },
    { step: '2', title: t('home_how_step2_title'), desc: t('home_how_step2_desc') },
    { step: '3', title: t('home_how_step3_title'), desc: t('home_how_step3_desc') },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 py-24 text-center relative">
          <div className="inline-block bg-gold/10 border border-gold/20 text-gold text-xs px-3 py-1 rounded-full mb-6 font-medium">
            {t('home_badge')}
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-text-primary mb-6 leading-tight">
            {t('home_hero_title_1')}{' '}
            <span className="text-gold">Serviceiro</span>
            {title2 && <>{' '}{title2}</>}
          </h1>

          <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto mb-10">
            {t('home_hero_subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/browse"
              className="bg-gold text-bg-primary px-8 py-4 rounded-lg font-bold text-lg hover:bg-gold-bright transition-colors"
            >
              {t('home_cta_browse')}
            </Link>
            <Link
              href="/servicos"
              className="bg-bg-card border border-border text-text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:border-gold/50 transition-colors"
            >
              {t('home_cta_requests')}
            </Link>
          </div>
          <div className="mt-4">
            <Link
              href="/auth/register"
              className="text-text-muted hover:text-text-primary text-sm underline underline-offset-4 transition-colors"
            >
              {t('home_cta_register_secondary')}
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto mt-16">
            <div>
              <div className="text-2xl font-bold text-gold">100%</div>
              <div className="text-xs text-text-muted">{t('home_stat_tc')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gold">6</div>
              <div className="text-xs text-text-muted">{t('home_stat_services')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gold">✓</div>
              <div className="text-xs text-text-muted">{t('home_stat_verified')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-12">{t('home_how_title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(item => (
            <div key={item.step} className="bg-bg-card border border-border rounded-xl p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 text-gold font-bold text-lg flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-text-primary mb-2">{item.title}</h3>
              <p className="text-text-muted text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Serviceiros */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-text-primary">{t('home_featured_title')}</h2>
            <Link href="/browse" className="text-gold hover:text-gold-bright text-sm transition-colors">
              {t('home_featured_view_all')}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map(s => (
              <ServiceiroCard key={s.id} serviceiro={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
