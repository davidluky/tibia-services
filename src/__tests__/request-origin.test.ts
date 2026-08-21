import { isAllowedMutationOrigin } from '@/lib/request-origin'

const REQUEST_URL = 'https://tibia.example/api/bookings'

describe('mutation request origin policy', () => {
  it('accepts an exact same-origin browser request', () => {
    expect(isAllowedMutationOrigin({
      requestUrl: REQUEST_URL,
      origin: 'https://tibia.example',
      fetchSite: 'same-origin',
    })).toBe(true)
  })

  it('rejects a different origin even when it is same-site', () => {
    expect(isAllowedMutationOrigin({
      requestUrl: REQUEST_URL,
      origin: 'https://admin.tibia.example',
      fetchSite: 'same-site',
    })).toBe(false)
  })

  it('rejects browser requests explicitly marked cross-site', () => {
    expect(isAllowedMutationOrigin({
      requestUrl: REQUEST_URL,
      origin: null,
      fetchSite: 'cross-site',
    })).toBe(false)
  })

  it('rejects malformed and opaque origins', () => {
    for (const origin of ['not a url', 'null']) {
      expect(isAllowedMutationOrigin({
        requestUrl: REQUEST_URL,
        origin,
        fetchSite: null,
      })).toBe(false)
    }
  })

  it('allows non-browser callers without origin metadata', () => {
    expect(isAllowedMutationOrigin({
      requestUrl: REQUEST_URL,
      origin: null,
      fetchSite: null,
    })).toBe(true)
  })
})
