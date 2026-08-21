// The contact route is the marketplace's PII boundary and the /api/admin/*
// mutations write other users' rows through the service-role client. Neither had
// a route-level test, so a regression in either had nothing standing in front of
// it. These cover the refusal paths only — the paths that must never regress.
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
  requireAdmin: jest.fn(),
  parseJsonBody: jest.fn(),
  unauthorized: jest.fn(() => ({ status: 401 })),
  forbidden: jest.fn((message?: string) => ({ status: 403, message })),
  badRequest: jest.fn((message?: string) => ({ status: 400, message })),
  notFound: jest.fn((message?: string) => ({ status: 404, message })),
  serverError: jest.fn((message?: string) => ({ status: 500, message })),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import type { NextRequest } from 'next/server'
import { GET as getContact } from '@/app/api/contact/[id]/route'
import { PATCH as banUser } from '@/app/api/admin/ban/[id]/route'
import { PATCH as hideReview } from '@/app/api/admin/review/[id]/route'
import { getAuthUser, requireAdmin, parseJsonBody } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

const mockGetAuthUser = getAuthUser as jest.Mock
const mockRequireAdmin = requireAdmin as jest.Mock
const mockParseJsonBody = parseJsonBody as jest.Mock
const mockCreateAdminClient = createAdminClient as jest.Mock

function bookingLookupSupabase(booking: { id: string } | null) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    limit: jest.fn(),
    single: jest.fn().mockResolvedValue({ data: booking }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.in.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  return { from: jest.fn(() => query), query }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('contact PII gate', () => {
  it('refuses contact details when no active or completed booking matches', async () => {
    const supabase = bookingLookupSupabase(null)
    mockGetAuthUser.mockResolvedValue({ user: { id: 'customer-1' }, supabase })

    const response = await getContact(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'serviceiro-1' }) },
    )

    expect(response.status).toBe(403)
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('only counts the caller own active or completed bookings', async () => {
    const supabase = bookingLookupSupabase({ id: 'booking-1' })
    mockGetAuthUser.mockResolvedValue({ user: { id: 'customer-1' }, supabase })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn(() => {
        const query = {
          select: jest.fn(),
          eq: jest.fn(),
          single: jest.fn().mockResolvedValue({
            data: { whatsapp: '+5511999999999', discord: 'alice#1' },
          }),
        }
        query.select.mockReturnValue(query)
        query.eq.mockReturnValue(query)
        return query
      }),
    })

    const response = await getContact(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'serviceiro-1' }) },
    )

    expect(response.status).toBe(200)
    expect(supabase.query.eq).toHaveBeenCalledWith('serviceiro_id', 'serviceiro-1')
    expect(supabase.query.eq).toHaveBeenCalledWith('customer_id', 'customer-1')
    expect(supabase.query.in).toHaveBeenCalledWith('status', ['active', 'completed'])
  })

  it('refuses an unauthenticated caller', async () => {
    mockGetAuthUser.mockResolvedValue({ user: null, supabase: bookingLookupSupabase(null) })

    const response = await getContact(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'serviceiro-1' }) },
    )

    expect(response.status).toBe(401)
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })
})

describe('admin mutation authorization', () => {
  it('refuses a ban from a non-admin session before parsing the body', async () => {
    mockRequireAdmin.mockResolvedValue({ authorized: false })

    const response = await banUser(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'user-1' }) },
    )

    expect(response.status).toBe(401)
    expect(mockParseJsonBody).not.toHaveBeenCalled()
  })

  it('refuses hiding a review from a non-admin session', async () => {
    mockRequireAdmin.mockResolvedValue({ authorized: false })

    const response = await hideReview(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'review-1' }) },
    )

    expect(response.status).toBe(401)
  })

  it('rejects a non-boolean ban value without writing', async () => {
    const update = jest.fn()
    mockRequireAdmin.mockResolvedValue({
      authorized: true,
      user: { id: 'admin-1' },
      adminClient: { from: jest.fn(() => ({ update })) },
    })
    mockParseJsonBody.mockResolvedValue({ ok: true, data: { ban: 'yes' } })

    const response = await banUser(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'user-1' }) },
    )

    expect(response.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })
})
