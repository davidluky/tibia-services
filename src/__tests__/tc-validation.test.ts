import { isValidTC, snapToTC, formatTC } from '@/lib/utils'
import { TC_INCREMENT, TC_MIN, TC_MAX } from '@/lib/constants'

describe('TC validation edge cases', () => {
  it('rejects NaN', () => {
    expect(isValidTC(NaN)).toBe(false)
  })

  it('rejects Infinity', () => {
    expect(isValidTC(Infinity)).toBe(false)
    expect(isValidTC(-Infinity)).toBe(false)
  })

  it('rejects float values', () => {
    expect(isValidTC(25.5)).toBe(false)
    expect(isValidTC(50.1)).toBe(false)
  })

  it('accepts exact boundaries', () => {
    expect(isValidTC(TC_MIN)).toBe(true)
    expect(isValidTC(TC_MAX)).toBe(true)
  })

  it('rejects just outside boundaries', () => {
    expect(isValidTC(TC_MIN - TC_INCREMENT)).toBe(false)
    expect(isValidTC(TC_MAX + TC_INCREMENT)).toBe(false)
  })

  it('rejects string coercion attempts', () => {
    // TypeScript prevents this, but testing runtime safety
    expect(isValidTC('25' as unknown as number)).toBe(false)
    expect(isValidTC('' as unknown as number)).toBe(false)
  })
})

describe('snapToTC edge cases', () => {
  it('snaps negative values to zero', () => {
    // Math.round(-10/25)*25 yields -0 in JS; we verify the value is zero
    // (both -0 and +0 satisfy == 0 and are valid snap results)
    expect(snapToTC(-10) == 0).toBe(true)
  })

  it('snaps 0 to 0', () => {
    expect(snapToTC(0)).toBe(0)
  })

  it('snaps midpoint values correctly', () => {
    // 12 rounds to 0 or 25 depending on implementation
    const result = snapToTC(12)
    expect(result % TC_INCREMENT).toBe(0)
  })
})
