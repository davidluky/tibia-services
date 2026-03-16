import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { Stars } from '@/components/ui/Stars'
import { Card } from '@/components/ui/Card'
import { ContactReveal } from '@/components/serviceiro/ContactReveal'
import { VOCATIONS, GAMEPLAY_TYPES } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Review } from '@/lib/types'
import type { GameplayTypeKey } from '@/lib/constants'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio')
    .eq('id', params.id)
    .eq('role', 'serviceiro')
    .single()

  if (!profile) return {}

  const title = `${profile.display_name} — Tibia Services`
  const description = profile.bio
    ? profile.bio.slice(0, 155)
    : `Contrate ${profile.display_name} para hunts, quests e mais no Tibia.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  }
}

export default async function ServiceiroProfilePage({ params }: PageProps) {
  const supabase = createClient()

  // Get current user session
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, bio, is_banned, created_at, role')
    .eq('id', params.id)
    .eq('role', 'serviceiro')
    .single()

  if (!profile || profile.is_banned) notFound()

  // Fetch serviceiro_profiles
  const { data: sp } = await supabase
    .from('serviceiro_profiles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!sp) notFound()

  // Fetch reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviewer_id(display_name)')
    .eq('serviceiro_id', params.id)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })

  // Fetch completion counts
  const { data: completions } = await supabase
    .from('serviceiro_completion_counts')
    .select('service_type, count')
    .eq('serviceiro_id', params.id)

  const completion_counts: Record<string, number> = {}
  completions?.forEach(c => {
    completion_counts[c.service_type] = Number(c.count)
  })
  const totalCompleted = Object.values(completion_counts).reduce((a, b) => a + b, 0)

  const avg_rating = reviews && reviews.length > 0
    ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length
    : null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: profile info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-text-primary">{profile.display_name}</h1>
                {avg_rating !== null && (
                  <div className="flex items-center gap-2 mt-2">
                    <Stars rating={avg_rating} size="md" />
                    <span className="text-text-muted text-sm">
                      {avg_rating.toFixed(1)} ({reviews?.length ?? 0} avaliações)
                    </span>
                  </div>
                )}
                <ServiceiroSummaryLine
                  totalCompleted={totalCompleted}
                  memberSinceDate={profile.created_at}
                />
              </div>
              {sp.is_registered && (
                <Badge label="✓ Registrado" variant="registered" />
              )}
            </div>

            {profile.bio && (
              <p className="text-text-muted text-sm leading-relaxed">{profile.bio}</p>
            )}
            {sp.tibia_char_verified && sp.tibia_character && (
              <p className="text-sm text-text-muted mt-2">
                Personagem:{' '}
                <span className="text-text-primary font-medium">{sp.tibia_character}</span>{' '}
                <span className="text-status-success text-xs">✓ verificado</span>
              </p>
            )}
          </Card>

          {/* Vocations */}
          {sp.vocations && sp.vocations.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Vocações</h2>
              <div className="flex flex-wrap gap-2">
                {sp.vocations.map((v: string) => {
                  const voc = VOCATIONS.find(x => x.key === v)
                  return voc ? <Badge key={v} label={voc.label} variant="vocation" /> : null
                })}
              </div>
            </Card>
          )}

          {/* Gameplay types */}
          {sp.gameplay_types && sp.gameplay_types.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Serviços oferecidos</h2>
              <div className="flex flex-wrap gap-2">
                {sp.gameplay_types.map((g: string) => {
                  const gp = GAMEPLAY_TYPES.find(x => x.key === g)
                  const count = completion_counts[g] ?? 0
                  return gp ? (
                    <div key={g} className="flex items-center gap-2">
                      <Badge label={gp.label} variant="gameplay" />
                      {count > 0 && (
                        <span className="text-xs text-text-muted">{count} completos</span>
                      )}
                    </div>
                  ) : null
                })}
              </div>
            </Card>
          )}

          {/* Stats */}
          <ServiceiroStats
            completionCounts={completion_counts}
            avgRating={avg_rating}
            reviewCount={reviews?.length ?? 0}
            totalCompleted={totalCompleted}
            memberSinceDate={profile.created_at}
          />

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

          {/* Reviews */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Avaliações {reviews && reviews.length > 0 && `(${reviews.length})`}
            </h2>
            {reviews && reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review: Review & { reviewer: { display_name: string } | null }) => (
                  <Card key={review.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-text-primary">
                          {review.reviewer?.display_name ?? 'Usuário'}
                        </span>
                        <span className="text-text-muted text-xs ml-2">{formatDate(review.created_at)}</span>
                      </div>
                      <Stars rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="text-text-muted text-sm">{review.comment}</p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-sm">Ainda sem avaliações.</p>
            )}
          </div>
        </div>

        {/* Right column: actions */}
        <div className="space-y-4">
          {/* Book now */}
          {user && user.id !== params.id ? (
            <BookNowSection serviceiroId={params.id} serviceiroName={profile.display_name} gameplayTypes={sp.gameplay_types ?? []} />
          ) : !user ? (
            <Card className="p-5 text-center">
              <p className="text-text-muted text-sm mb-4">Entre para contratar este serviceiro</p>
              <Link
                href="/auth/login"
                className="block bg-gold text-bg-primary px-4 py-2 rounded-md text-sm font-semibold hover:bg-gold-bright transition-colors text-center"
              >
                Entrar
              </Link>
            </Card>
          ) : null}

          {/* Contact reveal */}
          <ContactReveal serviceiroId={params.id} isLoggedIn={!!user} />
        </div>
      </div>
    </div>
  )
}

// Client component for booking creation
function BookNowSection({ serviceiroId, serviceiroName, gameplayTypes }: {
  serviceiroId: string
  serviceiroName: string
  gameplayTypes: string[]
}) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-text-primary mb-4">Contratar {serviceiroName}</h3>
      <BookNowForm serviceiroId={serviceiroId} gameplayTypes={gameplayTypes} />
    </Card>
  )
}

// Separate client component
import { BookNowForm } from './BookNowForm'
import { AvailabilitySummary } from '@/components/serviceiro/AvailabilitySummary'
import { AvailabilityGrid } from '@/components/serviceiro/AvailabilityGrid'
import { ServiceiroStats } from '@/components/serviceiro/ServiceiroStats'
import { ServiceiroSummaryLine } from '@/components/serviceiro/ServiceiroSummaryLine'
