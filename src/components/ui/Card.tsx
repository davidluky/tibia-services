interface CardProps {
  children: React.ReactNode
  className?: string
  gold?: boolean   // gold border variant (used for featured/registered cards)
}

export function Card({ children, className = '', gold = false }: CardProps) {
  return (
    <div className={`
      bg-bg-card rounded-xl border transition-all duration-150
      ${gold
        ? 'border-gold/40 hover:border-gold shadow-[0_0_20px_rgba(200,168,75,0.1)]'
        : 'border-border hover:border-gold/30'
      }
      ${className}
    `}>
      {children}
    </div>
  )
}
