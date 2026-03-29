import { VOCATIONS, GAMEPLAY_TYPES, WEEKDAYS, TC_INCREMENT, TC_MIN, TC_MAX } from '@/lib/constants'

describe('constants', () => {
  it('has 5 vocations', () => {
    expect(VOCATIONS).toHaveLength(5)
  })

  it('has 6 gameplay types', () => {
    expect(GAMEPLAY_TYPES).toHaveLength(6)
  })

  it('has 7 weekdays', () => {
    expect(WEEKDAYS).toHaveLength(7)
  })

  it('TC constraints are valid', () => {
    expect(TC_INCREMENT).toBe(25)
    expect(TC_MIN).toBe(25)
    expect(TC_MAX).toBe(100000)
    expect(TC_MAX % TC_INCREMENT).toBe(0)
    expect(TC_MIN % TC_INCREMENT).toBe(0)
  })

  it('all vocations have key and label', () => {
    VOCATIONS.forEach(v => {
      expect(v.key).toBeTruthy()
      expect(v.label).toBeTruthy()
    })
  })

  it('all gameplay types have key, label, and description', () => {
    GAMEPLAY_TYPES.forEach(g => {
      expect(g.key).toBeTruthy()
      expect(g.label).toBeTruthy()
      expect(g.description).toBeTruthy()
    })
  })
})
