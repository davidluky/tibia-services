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
  checkActionRateLimit: jest.fn(),
  unauthorized: jest.fn(),
  notFound: jest.fn(),
  forbidden: jest.fn(),
  badRequest: jest.fn(),
  apiError: jest.fn((message: string, status: number) => ({ status, message })),
  tooManyRequests: jest.fn(),
  serverError: jest.fn(),
}))

jest.mock('@/lib/email', () => ({
  sendBookingCreated: jest.fn(),
  sendBookingAccepted: jest.fn(),
  sendBookingDeclined: jest.fn(),
  sendBookingCompleted: jest.fn(),
  sendBookingCancelled: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import type { NextRequest } from 'next/server'
import { POST } from '@/app/api/bookings/route'
import { PATCH } from '@/app/api/bookings/[id]/route'
import { getAuthUser, parseJsonBody, checkActionRateLimit, apiError } from '@/lib/api-helpers'
import { sendBookingCreated, sendBookingAccepted } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'

const mockGetAuthUser = getAuthUser as jest.Mock
const mockParseJsonBody = parseJsonBody as jest.Mock
const mockCheckActionRateLimit = checkActionRateLimit as jest.Mock
const mockApiError = apiError as jest.Mock
const mockSendBookingCreated = sendBookingCreated as jest.Mock
const mockSendBookingAccepted = sendBookingAccepted as jest.Mock
const mockCreateAdminClient = createAdminClient as jest.Mock

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => {
    resolve = done
  })
  return { promise, resolve }
}

function singleQuery(result: unknown) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return query
}

function createBookingSupabase() {
  const customerProfile = singleQuery({
    data: { role: 'customer', display_name: 'Alice' },
  })
  const serviceiroProfile = singleQuery({
    data: { id: 'serviceiro-1', role: 'serviceiro', is_banned: false },
  })
  const pendingCheck = {
    select: jest.fn(),
    eq: jest.fn(),
    limit: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null }),
  }
  pendingCheck.select.mockReturnValue(pendingCheck)
  pendingCheck.eq.mockReturnValue(pendingCheck)
  pendingCheck.limit.mockReturnValue(pendingCheck)

  const bookingInsert = {
    insert: jest.fn(),
    select: jest.fn(),
    single: jest.fn().mockResolvedValue({
      data: { id: 'booking-1' },
      error: null,
    }),
  }
  bookingInsert.insert.mockReturnValue(bookingInsert)
  bookingInsert.select.mockReturnValue(bookingInsert)

  let profileCalls = 0
  let bookingCalls = 0
  const from = jest.fn((table: string) => {
    if (table === 'profiles') {
      return profileCalls++ === 0 ? customerProfile : serviceiroProfile
    }
    if (table === 'bookings') {
      return bookingCalls++ === 0 ? pendingCheck : bookingInsert
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return { from, pendingCheck, bookingInsert }
}

function updateBookingSupabase() {
  const actorProfile = singleQuery({
    data: { id: 'serviceiro-1', is_banned: false },
  })
  const bookingFetch = singleQuery({
    data: {
      id: 'booking-1',
      customer_id: 'customer-1',
      serviceiro_id: 'serviceiro-1',
      service_type: 'hunt_x1',
      status: 'pending',
    },
  })
  const participantProfiles = {
    select: jest.fn(),
    in: jest.fn().mockResolvedValue({
      data: [
        { id: 'customer-1', display_name: 'Alice' },
        { id: 'serviceiro-1', display_name: 'Bob' },
      ],
    }),
  }
  participantProfiles.select.mockReturnValue(participantProfiles)

  const updateEq = jest.fn().mockResolvedValue({ error: null })
  const bookingUpdate = {
    update: jest.fn().mockReturnValue({ eq: updateEq }),
  }

  let profileCalls = 0
  let bookingCalls = 0
  const from = jest.fn((table: string) => {
    if (table === 'profiles') {
      return profileCalls++ === 0 ? actorProfile : participantProfiles
    }
    if (table === 'bookings') {
      return bookingCalls++ === 0 ? bookingFetch : bookingUpdate
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return { from, bookingUpdate, updateEq }
}

afterEach(() => {
  jest.resetAllMocks()
})

describe('booking email handoff', () => {
  it('waits for the booking-created email before returning success', async () => {
    const supabase = createBookingSupabase()
    mockGetAuthUser.mockResolvedValue({
      user: { id: 'customer-1' },
      supabase,
    })
    mockParseJsonBody.mockResolvedValue({
      ok: true,
      data: { serviceiro_id: 'serviceiro-1', service_type: 'hunt_x1' },
    })
    mockCheckActionRateLimit.mockResolvedValue(false)

    const email = deferred()
    let emailStartedResolve!: () => void
    const emailStarted = new Promise<void>(resolve => {
      emailStartedResolve = resolve
    })
    mockSendBookingCreated.mockImplementation(() => {
      emailStartedResolve()
      return email.promise
    })

    let settled = false
    const responsePromise = POST({} as NextRequest)
    void responsePromise.then(
      () => { settled = true },
      () => { settled = true },
    )

    await emailStarted
    await Promise.resolve()

    expect(settled).toBe(false)
    expect(mockSendBookingCreated).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      serviceiroId: 'serviceiro-1',
      customerName: 'Alice',
      serviceType: 'hunt_x1',
    })

    email.resolve()
    const response = await responsePromise

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ id: 'booking-1' })
  })

  it('keeps a successful response when the email helper handles a delivery failure', async () => {
    const supabase = createBookingSupabase()
    mockGetAuthUser.mockResolvedValue({
      user: { id: 'customer-1' },
      supabase,
    })
    mockParseJsonBody.mockResolvedValue({
      ok: true,
      data: { serviceiro_id: 'serviceiro-1', service_type: 'hunt_x1' },
    })
    mockCheckActionRateLimit.mockResolvedValue(false)
    mockSendBookingCreated.mockImplementation(async () => {
      await Promise.reject(new Error('delivery failed')).catch(() => undefined)
    })

    const response = await POST({} as NextRequest)

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ id: 'booking-1' })
  })

  it('does not start an email when the booking insert fails', async () => {
    const supabase = createBookingSupabase()
    supabase.bookingInsert.single.mockResolvedValue({
      data: null,
      error: { message: 'insert failed' },
    })
    mockGetAuthUser.mockResolvedValue({
      user: { id: 'customer-1' },
      supabase,
    })
    mockParseJsonBody.mockResolvedValue({
      ok: true,
      data: { serviceiro_id: 'serviceiro-1', service_type: 'hunt_x1' },
    })
    mockCheckActionRateLimit.mockResolvedValue(false)

    await POST({} as NextRequest)

    expect(mockSendBookingCreated).not.toHaveBeenCalled()
  })

  it('refuses a duplicate pending request for the same pair and service type', async () => {
    const supabase = createBookingSupabase()
    supabase.pendingCheck.maybeSingle.mockResolvedValue({
      data: { id: 'booking-existing' },
    })
    mockGetAuthUser.mockResolvedValue({
      user: { id: 'customer-1' },
      supabase,
    })
    mockParseJsonBody.mockResolvedValue({
      ok: true,
      data: { serviceiro_id: 'serviceiro-1', service_type: 'hunt_x1' },
    })
    mockCheckActionRateLimit.mockResolvedValue(false)

    await POST({} as NextRequest)

    expect(mockApiError).toHaveBeenCalledWith(expect.any(String), 409)
    expect(supabase.bookingInsert.insert).not.toHaveBeenCalled()
    expect(mockSendBookingCreated).not.toHaveBeenCalled()
  })

  it('waits for the correct status email when a booking is accepted', async () => {
    const supabase = updateBookingSupabase()
    mockGetAuthUser.mockResolvedValue({
      user: { id: 'serviceiro-1' },
      supabase,
    })
    mockParseJsonBody.mockResolvedValue({
      ok: true,
      data: { action: 'accept' },
    })

    const notificationInsert = jest.fn().mockResolvedValue({ error: null })
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ insert: notificationInsert }),
    })

    const email = deferred()
    let emailStartedResolve!: () => void
    const emailStarted = new Promise<void>(resolve => {
      emailStartedResolve = resolve
    })
    mockSendBookingAccepted.mockImplementation(() => {
      emailStartedResolve()
      return email.promise
    })

    let settled = false
    const responsePromise = PATCH(
      {} as NextRequest,
      { params: Promise.resolve({ id: 'booking-1' }) },
    )
    void responsePromise.then(
      () => { settled = true },
      () => { settled = true },
    )

    await emailStarted
    await Promise.resolve()

    expect(settled).toBe(false)
    expect(mockSendBookingAccepted).toHaveBeenCalledWith({
      bookingId: 'booking-1',
      customerId: 'customer-1',
      serviceiroName: 'Bob',
      serviceType: 'hunt_x1',
    })

    email.resolve()
    const response = await responsePromise

    expect(supabase.bookingUpdate.update).toHaveBeenCalledWith({ status: 'active' })
    expect(supabase.updateEq).toHaveBeenCalledWith('id', 'booking-1')
    expect(notificationInsert).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
  })
})
