import { TC_INCREMENT, TC_MIN, TC_MAX } from './constants'

// ─── Tibia Coins validation ────────────────────────────────────────────────────
// TC must be in multiples of 25 (game denomination).
export function isValidTC(amount: number): boolean {
  return (
    Number.isInteger(amount) &&
    amount >= TC_MIN &&
    amount <= TC_MAX &&
    amount % TC_INCREMENT === 0
  )
}

// Round a TC amount to the nearest multiple of 25
export function snapToTC(amount: number): number {
  return Math.round(amount / TC_INCREMENT) * TC_INCREMENT
}

// Format TC for display: "1,250 TC"
export function formatTC(amount: number): string {
  return `${amount.toLocaleString('pt-BR')} TC`
}

// ─── Date/time helpers ────────────────────────────────────────────────────────
// Format a UTC timestamp to a readable local date
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// How long ago (e.g. "3 hours ago")
export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes} min atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  return `${days}d atrás`
}

// ─── String helpers ────────────────────────────────────────────────────────────
// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

// Capitalise first letter
export function capitalise(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// How long a user has been a member, locale-aware
export function memberSince(isoString: string, lang: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))

  if (lang === 'en') {
    if (diffMonths < 1) return 'less than 1 month'
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`
    const years = Math.floor(diffMonths / 12)
    const months = diffMonths % 12
    const yearStr = `${years} ${years === 1 ? 'year' : 'years'}`
    return months === 0 ? yearStr : `${yearStr} and ${months} ${months === 1 ? 'month' : 'months'}`
  }

  if (lang === 'es') {
    if (diffMonths < 1) return 'menos de 1 mes'
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`
    const years = Math.floor(diffMonths / 12)
    const months = diffMonths % 12
    const yearStr = `${years} ${years === 1 ? 'año' : 'años'}`
    return months === 0 ? yearStr : `${yearStr} y ${months} ${months === 1 ? 'mes' : 'meses'}`
  }

  // Default: pt
  if (diffMonths < 1) return 'menos de 1 mês'
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(diffMonths / 12)
  const months = diffMonths % 12
  const yearStr = `${years} ${years === 1 ? 'ano' : 'anos'}`
  return months === 0 ? yearStr : `${yearStr} e ${months} ${months === 1 ? 'mês' : 'meses'}`
}
