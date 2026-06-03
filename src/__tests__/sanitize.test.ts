import { sanitizeText } from '@/lib/utils'

describe('sanitizeText security', () => {
  it('strips script tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")')
  })

  it('strips img tags with onerror', () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>')).toBe('')
  })

  it('strips nested tags', () => {
    expect(sanitizeText('<div><b>bold</b></div>')).toBe('bold')
  })

  it('strips javascript: protocol (case insensitive)', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)')
    expect(sanitizeText('JAVASCRIPT:alert(1)')).toBe('alert(1)')
    expect(sanitizeText('JaVaScRiPt:alert(1)')).toBe('alert(1)')
  })

  it('handles empty input', () => {
    expect(sanitizeText('')).toBe('')
  })

  it('handles input with only whitespace', () => {
    expect(sanitizeText('   ')).toBe('')
  })

  it('preserves normal text', () => {
    expect(sanitizeText('Hello, world! 123')).toBe('Hello, world! 123')
  })

  it('preserves special characters', () => {
    expect(sanitizeText('Price: 500 TC & more')).toBe('Price: 500 TC & more')
  })

  it('handles mixed content', () => {
    expect(sanitizeText('Hello <b>world</b> test')).toBe('Hello world test')
  })
})
