import { render, screen } from '@testing-library/react'
import type { NextRequest } from 'next/server'
import { POST as applyToServiceRequest } from '@/app/api/service-requests/[id]/apply/route'
import { ServiceRequestCard } from '@/components/servicerequest/ServiceRequestCard'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthUser } from '@/lib/api-helpers'
import { SERVICE_REQUEST_APPLICATIONS_UNAVAILABLE_ERROR } from '@/lib/feature-availability'
import type { ServiceRequest } from '@/lib/types'

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/lib/language-context', () => ({
  useLanguage: () => ({
    lang: 'en',
    t: (key: string) => key,
  }),
}))

jest.mock('@/lib/api-helpers', () => ({
  getAuthUser: jest.fn(),
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
  notFound: jest.fn(),
  badRequest: jest.fn(),
  apiError: jest.fn(),
  serverError: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

const request: ServiceRequest = {
  id: 'request-1',
  service_type: 'quests',
  title: 'Quest help',
  description: null,
  flexible_time: true,
  preferred_date: null,
  preferred_time: null,
  budget_tc: null,
  status: 'open',
  created_at: '2026-07-16T00:00:00.000Z',
  customer: { display_name: 'Customer' },
}

const mockBookingInsert = jest.fn()
const mockAdminFrom = jest.fn(() => ({ insert: mockBookingInsert }))

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn()
  ;(createAdminClient as jest.Mock).mockReturnValue({ from: mockAdminFrom })
})

it('returns the stable hold response before auth, admin, or booking creation', async () => {
  const response = await applyToServiceRequest(
    {} as NextRequest,
    { params: Promise.resolve({ id: request.id }) },
  )

  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({
    error: SERVICE_REQUEST_APPLICATIONS_UNAVAILABLE_ERROR,
  })
  expect(getAuthUser).not.toHaveBeenCalled()
  expect(createAdminClient).not.toHaveBeenCalled()
  expect(mockAdminFrom).not.toHaveBeenCalled()
  expect(mockBookingInsert).not.toHaveBeenCalled()
})

it('shows serviceiros an unavailable notice without an enabled apply action', () => {
  render(
    <ServiceRequestCard
      request={request}
      isServiceiro
      isLoggedIn
    />,
  )

  expect(screen.getByRole('status')).toHaveTextContent('requests_offer_unavailable')
  expect(screen.queryByRole('button', { name: 'requests_offer_btn' })).not.toBeInTheDocument()
  expect(global.fetch).not.toHaveBeenCalled()
})
