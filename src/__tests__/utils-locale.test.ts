import { timeAgo, formatDate } from '@/lib/utils'

describe('timeAgo with locale', () => {
  const now = new Date().toISOString()
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  it('defaults to Portuguese', () => {
    expect(timeAgo(now)).toBe('agora')
    expect(timeAgo(fiveMinAgo)).toContain('min')
    expect(timeAgo(fiveMinAgo)).toContain('atrás')
  })

  it('supports English', () => {
    expect(timeAgo(now, 'en')).toBe('now')
    expect(timeAgo(fiveMinAgo, 'en')).toContain('ago')
    expect(timeAgo(twoHoursAgo, 'en')).toContain('h ago')
    expect(timeAgo(threeDaysAgo, 'en')).toContain('d ago')
  })

  it('supports Spanish', () => {
    expect(timeAgo(now, 'es')).toBe('ahora')
    expect(timeAgo(fiveMinAgo, 'es')).toContain('hace')
    expect(timeAgo(twoHoursAgo, 'es')).toContain('hace')
  })
})

describe('formatDate with locale', () => {
  const testDate = '2026-03-15T12:00:00Z'

  it('defaults to pt-BR format', () => {
    const result = formatDate(testDate)
    expect(result).toContain('15')
    expect(result).toContain('03')
    expect(result).toContain('2026')
  })

  it('supports English locale', () => {
    const result = formatDate(testDate, 'en')
    expect(result).toContain('15') // day
    expect(result).toContain('2026') // year
  })

  it('supports Spanish locale', () => {
    const result = formatDate(testDate, 'es')
    expect(result).toContain('15')
    expect(result).toContain('2026')
  })
})
