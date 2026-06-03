import { isValidTC, snapToTC, formatTC, sanitizeText, truncate, capitalise } from '@/lib/utils'

describe('isValidTC', () => {
  it('accepts valid TC amounts', () => {
    expect(isValidTC(25)).toBe(true)
    expect(isValidTC(100)).toBe(true)
    expect(isValidTC(1000)).toBe(true)
    expect(isValidTC(100000)).toBe(true)
  })

  it('rejects invalid TC amounts', () => {
    expect(isValidTC(0)).toBe(false)
    expect(isValidTC(10)).toBe(false)
    expect(isValidTC(26)).toBe(false)
    expect(isValidTC(-25)).toBe(false)
    expect(isValidTC(100001)).toBe(false)
    expect(isValidTC(1.5)).toBe(false)
  })
})

describe('snapToTC', () => {
  it('rounds to nearest 25', () => {
    expect(snapToTC(10)).toBe(0)
    expect(snapToTC(13)).toBe(25)
    expect(snapToTC(37)).toBe(25)
    expect(snapToTC(38)).toBe(50)
    expect(snapToTC(100)).toBe(100)
  })
})

describe('formatTC', () => {
  it('formats with TC suffix', () => {
    const result = formatTC(1250)
    expect(result).toContain('TC')
    expect(result).toContain('1')
  })
})

describe('sanitizeText', () => {
  it('strips HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")')
    expect(sanitizeText('<b>bold</b>')).toBe('bold')
  })

  it('strips javascript: protocol', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)')
  })

  it('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello')
  })

  it('handles clean input', () => {
    expect(sanitizeText('hello world')).toBe('hello world')
  })
})

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hi', 10)).toBe('hi')
  })

  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world!', 8)).toBe('hello...')
  })
})

describe('capitalise', () => {
  it('capitalises first letter', () => {
    expect(capitalise('hello')).toBe('Hello')
  })
})
