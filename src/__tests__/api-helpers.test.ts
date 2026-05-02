// Mock next/server since NextResponse depends on Request global (unavailable in jsdom)
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) =>
      ({
        status: init?.status ?? 200,
        json: async () => body,
      }),
  },
}))

// Mock supabase modules to prevent side-effect imports
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

import { createAdminClient } from '@/lib/supabase/admin'
import {
  apiError,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  serverError,
  tooManyRequests,
  rejectOversizedRequest,
  checkActionRateLimit,
} from '@/lib/api-helpers'

afterEach(() => {
  jest.clearAllMocks()
})

describe('API error helpers', () => {
  it('apiError returns correct status and body', async () => {
    const res = apiError('test error', 400)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('test error')
  })

  it('unauthorized returns 401', () => {
    expect(unauthorized().status).toBe(401)
  })

  it('forbidden returns 403', () => {
    expect(forbidden().status).toBe(403)
  })

  it('notFound returns 404', () => {
    expect(notFound().status).toBe(404)
  })

  it('badRequest returns 400', () => {
    expect(badRequest('bad').status).toBe(400)
  })

  it('serverError returns 500', () => {
    expect(serverError().status).toBe(500)
  })

  it('tooManyRequests returns 429', () => {
    expect(tooManyRequests().status).toBe(429)
  })

  it('can require content-length before parsing large uploads', () => {
    const request = { headers: { get: jest.fn(() => null) } } as unknown as Request
    expect(rejectOversizedRequest(request, 100, { requireContentLength: true })?.status).toBe(400)
  })

  it('rejects content-length above the configured limit', () => {
    const request = { headers: { get: jest.fn(() => '101') } } as unknown as Request
    expect(rejectOversizedRequest(request, 100)?.status).toBe(413)
  })

  it('fails closed when action rate-limit recording errors', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(createAdminClient as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    })

    await expect(checkActionRateLimit('user-id', 'action', 1000, 1)).resolves.toBe(true)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('uses the atomic action rate-limit function result', async () => {
    ;(createAdminClient as jest.Mock).mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: false, error: null }),
    })

    await expect(checkActionRateLimit('user-id', 'action', 1000, 1)).resolves.toBe(false)
  })
})
