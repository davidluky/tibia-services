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
  checkActionRateLimit: jest.fn(),
  unauthorized: jest.fn(() => ({ status: 401 })),
  forbidden: jest.fn((message?: string) => ({ status: 403, message })),
  badRequest: jest.fn((message?: string) => ({ status: 400, message })),
  apiError: jest.fn((message: string, status: number) => ({ status, message })),
  notFound: jest.fn((message?: string) => ({ status: 404, message })),
  serverError: jest.fn((message?: string) => ({ status: 500, message })),
  tooManyRequests: jest.fn((message?: string) => ({ status: 429, message })),
}))

jest.mock('@/lib/email', () => ({
  sendBookingAccepted: jest.fn(),
  sendBookingDeclined: jest.fn(),
  sendBookingCompleted: jest.fn(),
  sendBookingCancelled: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import type { NextRequest } from 'next/server'
import { PATCH as reviewVerification } from '@/app/api/admin/verify/[id]/route'
import { PATCH as updateBooking } from '@/app/api/bookings/[id]/route'
import { POST as sendMessage } from '@/app/api/messages/route'
import {
  getAuthUser,
  requireAdmin,
  parseJsonBody,
  checkActionRateLimit,
} from '@/lib/api-helpers'

const mockGetAuthUser = getAuthUser as jest.Mock
const mockRequireAdmin = requireAdmin as jest.Mock
const mockParseJsonBody = parseJsonBody as jest.Mock
const mockCheckActionRateLimit = checkActionRateLimit as jest.Mock

function verificationAdmin(options: {
  rpcError?: { message: string } | null
  cleanupError?: { message: string } | null
} = {}) {
  const requestQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn().mockResolvedValue({
      data: {
        serviceiro_id: 'serviceiro-1',
        screenshot_url: 'serviceiro-1/screenshot.png',
        id_document_url: 'serviceiro-1/id.png',
      },
    }),
  }
  requestQuery.select.mockReturnValue(requestQuery)
  requestQuery.eq.mockReturnValue(requestQuery)

  const remove = jest.fn().mockResolvedValue({ error: options.cleanupError ?? null })
  const rpc = jest.fn().mockResolvedValue({ error: options.rpcError ?? null })
  const adminClient = {
    from: jest.fn((table: string) => {
      if (table === 'verification_requests') return requestQuery
      throw new Error(`Unexpected table: ${table}`)
    }),
    rpc,
    storage: {
      from: jest.fn(() => ({ remove })),
    },
  }

  mockRequireAdmin.mockResolvedValue({
    authorized: true,
    user: { id: 'admin-1' },
    adminClient,
  })
  mockParseJsonBody.mockResolvedValue({
    ok: true,
    data: { action: 'approve', admin_notes: 'checked', fee_paid: true },
  })

  return { adminClient, requestQuery, rpc, remove }
}

function bannedSupabase(userId: string) {
  const profileQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { id: userId, is_banned: true },
    }),
  }
  profileQuery.select.mockReturnValue(profileQuery)
  profileQuery.eq.mockReturnValue(profileQuery)

  const from = jest.fn((table: string) => {
    if (table === 'profiles') return profileQuery
    throw new Error(`Banned actor reached unexpected table: ${table}`)
  })

  return { from }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('transactional verification review', () => {
  it('commits through the RPC before deleting both private objects', async () => {
    const { rpc, remove, requestQuery } = verificationAdmin()

    const response = await reviewVerification(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'verification-1' }) },
    )

    expect(requestQuery.select).toHaveBeenCalledWith(
      'serviceiro_id, screenshot_url, id_document_url',
    )
    expect(rpc).toHaveBeenCalledWith('review_verification_request', {
      p_request_id: 'verification-1',
      p_reviewed_by: 'admin-1',
      p_action: 'approve',
      p_admin_notes: 'checked',
      p_fee_paid: true,
    })
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0])
    expect(remove).toHaveBeenCalledWith([
      'serviceiro-1/screenshot.png',
      'serviceiro-1/id.png',
    ])
    expect(response.status).toBe(200)
  })

  it('returns a conflict and keeps private objects when the request was already reviewed', async () => {
    const { remove } = verificationAdmin({
      rpcError: { message: 'verification_not_pending' },
    })

    const response = await reviewVerification(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'verification-1' }) },
    )

    expect(response.status).toBe(409)
    expect(remove).not.toHaveBeenCalled()
  })

  it('does not approve before the verification fee is confirmed', async () => {
    const { rpc, remove } = verificationAdmin()
    mockParseJsonBody.mockResolvedValue({
      ok: true,
      data: { action: 'approve', fee_paid: false },
    })

    const response = await reviewVerification(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'verification-1' }) },
    )

    expect(response.status).toBe(400)
    expect(rpc).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('logs cleanup failure without rolling back a committed review', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    verificationAdmin({ cleanupError: { message: 'storage unavailable' } })

    const response = await reviewVerification(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'verification-1' }) },
    )

    expect(response.status).toBe(200)
    expect(consoleError).toHaveBeenCalledWith(
      '[verification-review] Failed to remove reviewed private files:',
      { message: 'storage unavailable' },
    )
    consoleError.mockRestore()
  })
})

describe('banned actor write guards', () => {
  it('blocks a banned participant before a booking update is loaded', async () => {
    const supabase = bannedSupabase('customer-1')
    mockGetAuthUser.mockResolvedValue({ user: { id: 'customer-1' }, supabase })

    const response = await updateBooking(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'booking-1' }) },
    )

    expect(response.status).toBe(403)
    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(mockParseJsonBody).not.toHaveBeenCalled()
  })

  it('blocks a banned participant before rate limiting or inserting a message', async () => {
    const supabase = bannedSupabase('customer-1')
    mockGetAuthUser.mockResolvedValue({ user: { id: 'customer-1' }, supabase })

    const response = await sendMessage({} as NextRequest)

    expect(response.status).toBe(403)
    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(mockCheckActionRateLimit).not.toHaveBeenCalled()
    expect(mockParseJsonBody).not.toHaveBeenCalled()
  })
})
