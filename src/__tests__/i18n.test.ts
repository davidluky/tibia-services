import { translations } from '@/lib/i18n'

describe('i18n locale symmetry', () => {
  const ptKeys = Object.keys(translations.pt)
  const enKeys = Object.keys(translations.en)
  const esKeys = Object.keys(translations.es)

  it('all locales have the same number of keys', () => {
    expect(enKeys.length).toBe(ptKeys.length)
    expect(esKeys.length).toBe(ptKeys.length)
  })

  it('EN has all PT keys', () => {
    const missingInEn = ptKeys.filter(k => !enKeys.includes(k))
    expect(missingInEn).toEqual([])
  })

  it('ES has all PT keys', () => {
    const missingInEs = ptKeys.filter(k => !esKeys.includes(k))
    expect(missingInEs).toEqual([])
  })

  it('PT has all EN keys', () => {
    const missingInPt = enKeys.filter(k => !ptKeys.includes(k))
    expect(missingInPt).toEqual([])
  })

  it('no empty translation values (excluding intentional blanks)', () => {
    // Some keys are intentionally empty in certain locales (e.g. EN combines
    // multi-line titles into one line, leaving _2 blank). We allow a value to
    // be an empty string only when it is explicitly set — but flag any key
    // whose value is undefined or missing entirely.
    const allowedEmpty = ['home_hero_title_2']

    const emptyPt = ptKeys.filter(
      k => !allowedEmpty.includes(k) && !translations.pt[k as keyof typeof translations.pt]
    )
    const emptyEn = enKeys.filter(
      k => !allowedEmpty.includes(k) && !translations.en[k as keyof typeof translations.en]
    )
    const emptyEs = esKeys.filter(
      k => !allowedEmpty.includes(k) && !translations.es[k as keyof typeof translations.es]
    )
    expect(emptyPt).toEqual([])
    expect(emptyEn).toEqual([])
    expect(emptyEs).toEqual([])
  })
})
