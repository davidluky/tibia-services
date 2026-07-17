jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/lib/api-helpers', () => ({
  getAuthUser: jest.fn(),
  parseJsonBody: jest.fn(),
  unauthorized: jest.fn(() => ({ status: 401 })),
  badRequest: jest.fn((message: string) => ({ status: 400, message })),
  serverError: jest.fn((message: string) => ({ status: 500, message })),
}))

import type { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/notifications/route'
import { getAuthUser, parseJsonBody } from '@/lib/api-helpers'

const mockGetAuthUser = getAuthUser as jest.Mock
const mockParseJsonBody = parseJsonBody as jest.Mock
const notificationId = '123e4567-e89b-42d3-a456-426614174000'

function getSupabase(result: { data: unknown; error: unknown }) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn().mockResolvedValue(result),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  return { from: jest.fn(() => query) }
}

function patchSupabase(result: { error: unknown }) {
  const finalEq = jest.fn().mockResolvedValue(result)
  const query = {
    update: jest.fn(),
    in: jest.fn(),
    eq: finalEq,
  }
  query.update.mockReturnValue(query)
  query.in.mockReturnValue(query)
  return { from: jest.fn(() => query), query }
}

afterEach(() => {
  jest.clearAllMocks()
})

describe('notifications API error handling', () => {
  it('returns a server error when loading notifications fails', async () => {
    const supabase = getSupabase({ data: null, error: { message: 'db down' } })
    mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1' }, supabase })
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const response = await GET()

    expect(response.status).toBe(500)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('rejects malformed notification identifiers before querying Supabase', async () => {
    const supabase = patchSupabase({ error: null })
    mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1' }, supabase })
    mockParseJsonBody.mockResolvedValue({ ok: true, data: { ids: ['not-a-uuid'] } })

    const response = await PATCH({} as NextRequest)

    expect(response.status).toBe(400)
    expect(supabase.query.update).not.toHaveBeenCalled()
  })

  it('does not report success when marking notifications read fails', async () => {
    const supabase = patchSupabase({ error: { message: 'write failed' } })
    mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1' }, supabase })
    mockParseJsonBody.mockResolvedValue({ ok: true, data: { ids: [notificationId] } })
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const response = await PATCH({} as NextRequest)

    expect(response.status).toBe(500)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('marks only the authenticated user notification ids as read', async () => {
    const supabase = patchSupabase({ error: null })
    mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1' }, supabase })
    mockParseJsonBody.mockResolvedValue({ ok: true, data: { ids: [notificationId] } })

    const response = await PATCH({} as NextRequest)

    expect(response.status).toBe(200)
    expect(supabase.query.update).toHaveBeenCalledWith({ is_read: true })
    expect(supabase.query.in).toHaveBeenCalledWith('id', [notificationId])
    expect(supabase.query.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })
})
