'use client'
import Link from 'next/link'
import { ServiceiroCard } from '@/components/serviceiro/ServiceiroCard'
import { CoinIcon, QuestIcon, ShieldCheckIcon, VerifiedIcon } from '@/components/ui/icons'
import { Stars } from '@/components/ui/Stars'
import { useLanguage } from '@/lib/language-context'
import type { ServiceiroWithProfile } from '@/lib/types'

interface HomeClientProps {
  featured: ServiceiroWithProfile[]
}

const heroBackgroundStyle = {
  backgroundImage: [
    'radial-gradient(circle at 18% 18%, rgba(200, 168, 75, 0.18), transparent 28%)',
    'radial-gradient(circle at 78% 12%, rgba(96, 165, 250, 0.12), transparent 24%)',
    'linear-gradient(135deg, rgba(10, 10, 15, 0.98), rgba(28, 23, 18, 0.96) 48%, rgba(10, 10, 15, 1))',
    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'140\' height=\'140\' viewBox=\'0 0 140 140\'%3E%3Cg fill=\'none\' stroke=\'%23c8a84b\' stroke-opacity=\'.16\' stroke-width=\'1\'%3E%3Cpath d=\'M20 24h18M29 15v18M92 28l11 11M103 28 92 39M36 92h68M42 104h42\'/%3E%3Ccircle cx=\'72\' cy=\'70\' r=\'22\'/%3E%3Cpath d=\'M72 48v44M50 70h44\'/%3E%3C/g%3E%3C/svg%3E")',
  ].join(', '),
  backgroundSize: 'auto, auto, auto, 140px 140px',
  backgroundPosition: 'center, center, center, top left',
} as const

export function HomeClient({ featured }: HomeClientProps) {
  const { t } = useLanguage()

  const title2 = t('home_hero_title_2')

  const steps = [
    { step: '1', title: t('home_how_step1_title'), desc: t('home_how_step1_desc'), icon: QuestIcon },
    { step: '2', title: t('home_how_step2_title'), desc: t('home_how_step2_desc'), icon: CoinIcon },
    { step: '3', title: t('home_how_step3_title'), desc: t('home_how_step3_desc'), icon: VerifiedIcon },
  ]

  const trustItems = [
    {
      title: t('home_trust_verified_title'),
      desc: t('home_trust_verified_desc'),
      visual: <VerifiedIcon className="h-7 w-7 text-gold" />,
    },
    {
      title: t('home_trust_payment_title'),
      desc: t('home_trust_payment_desc'),
      visual: <ShieldCheckIcon className="h-7 w-7 text-gold" />,
    },
    {
      title: t('home_trust_reviews_title'),
      desc: t('home_trust_reviews_desc'),
      visual: <Stars rating={5} size="md" ariaLabel={t('home_trust_reviews_title')} />,
    },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-bg-primary" style={heroBackgroundStyle}>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 py-20 md:py-24 relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 text-gold text-xs px-3 py-1 rounded-full mb-6 font-medium">
              <ShieldCheckIcon className="h-4 w-4" />
              <span>{t('home_badge')}</span>
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
                className="bg-bg-card/80 border border-gold/30 text-text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:border-gold hover:bg-bg-hover transition-colors"
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
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-14 text-center">
            <div className="border-y border-gold/20 py-4">
              <div className="text-2xl font-bold text-gold">100%</div>
              <div className="text-xs text-text-muted">{t('home_stat_tc')}</div>
            </div>
            <div className="border-y border-gold/20 py-4">
              <div className="text-2xl font-bold text-gold">6</div>
              <div className="text-xs text-text-muted">{t('home_stat_services')}</div>
            </div>
            <div className="border-y border-gold/20 py-4">
              <div className="flex h-8 items-center justify-center text-gold">
                <VerifiedIcon className="h-7 w-7" />
              </div>
              <div className="text-xs text-text-muted">{t('home_stat_verified')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-12">{t('home_how_title')}</h2>
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="hidden md:block absolute left-[16%] right-[16%] top-12 h-px bg-gradient-to-r from-gold/10 via-gold/40 to-gold/10" />
          {steps.map(item => {
            const Icon = item.icon

            return (
              <div key={item.step} className="relative bg-bg-card border border-border rounded-xl p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-bg-primary border border-gold/30 text-gold font-bold text-lg flex items-center justify-center mx-auto mb-4 shadow-[0_0_18px_rgba(200,168,75,0.12)]">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mx-auto mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-gold/10 text-xs font-bold text-gold">
                  {item.step}
                </div>
                <h3 className="font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-text-muted text-sm">{item.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Trust band */}
      <section className="border-y border-border/80 bg-bg-card/40">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {trustItems.map(item => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="flex h-11 min-w-[2.75rem] shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-bg-primary px-2">
                {item.visual}
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-1 text-sm text-text-muted">{item.desc}</p>
              </div>
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
