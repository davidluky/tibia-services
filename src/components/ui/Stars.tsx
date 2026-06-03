// Display a 1-5 star rating. Shows filled/empty stars.

interface StarsProps {
  rating: number      // can be decimal (e.g. 4.3)
  max?: number        // default 5
  size?: 'sm' | 'md'
  ariaLabel?: string
}

export function Stars({ rating, max = 5, size = 'sm', ariaLabel }: StarsProps) {
  const sizeClass = size === 'sm' ? 'text-sm' : 'text-lg'
  const ratingText = `${rating.toFixed(1)} / ${max}`

  return (
    <span
      role="img"
      aria-label={ariaLabel ?? ratingText}
      className={`${sizeClass} inline-flex gap-0.5`}
      title={`${rating.toFixed(1)} / ${max}`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} aria-hidden="true" className={i < Math.round(rating) ? 'text-gold' : 'text-text-muted/30'}>
          ★
        </span>
      ))}
    </span>
  )
}
