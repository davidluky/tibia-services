// The verification code is an HMAC of the acting user's id, so a code found in
// someone else's character comment must never verify the caller. Nothing tested
// that binding, and it is the only thing stopping a serviceiro from claiming a
// character another account already proved ownership of.
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
  unauthorized: jest.fn(() => ({ status: 401 })),
  forbidden: jest.fn((message?: string) => ({ status: 403, message })),
  badRequest: jest.fn((message?: string) => ({ status: 400, message })),
  notFound: jest.fn((message?: string) => ({ status: 404, message })),
  apiError: jest.fn((message: string, status: number) => ({ status, message })),
  serverError: jest.fn((message?: string) => ({ status: 500, message })),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import { createHmac } from 'crypto'
import { POST as verifyCharacter } from '@/app/api/verify-character/route'
import { getAuthUser, parseJsonBody, checkActionRateLimit } from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

const mockGetAuthUser = getAuthUser as jest.Mock
const mockParseJsonBody = parseJsonBody as jest.Mock
const mockCheckActionRateLimit = checkActionRateLimit as jest.Mock
const mockCreateAdminClient = createAdminClient as jest.Mock

const SECRET = 'test-char-verify-secret'

function codeFor(userId: string) {
  const hmac = createHmac('sha256', SECRET).update(userId).digest('hex')
  return `TIBS-${hmac.slice(0, 8).toUpperCase()}`
}

function serviceiroSupabase() {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn().mockResolvedValue({ data: { role: 'serviceiro' } }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  return { from: jest.fn(() => query) }
}

function tibiaDataReturns(comment: string | null) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      character: { character: { name: 'Bubble', comment } },
    }),
  }) as unknown as typeof fetch
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CHAR_VERIFY_SECRET = SECRET
  mockGetAuthUser.mockResolvedValue({
    user: { id: 'serviceiro-a' },
    supabase: serviceiroSupabase(),
  })
  mockParseJsonBody.mockResolvedValue({ ok: true, data: { character_name: 'Bubble' } })
  mockCheckActionRateLimit.mockResolvedValue(false)
})

describe('character verification code binding', () => {
  it('refuses a code minted for a different user id', async () => {
    tibiaDataReturns(`for sale — ${codeFor('serviceiro-b')}`)

    const response = await verifyCharacter({} as Request)

    expect(response.status).toBe(400)
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('refuses a character with no comment at all', async () => {
    tibiaDataReturns(null)

    const response = await verifyCharacter({} as Request)

    expect(response.status).toBe(400)
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('accepts the caller own code before touching the service-role client', async () => {
    tibiaDataReturns(`hello ${codeFor('serviceiro-a').toLowerCase()}`)
    mockCreateAdminClient.mockReturnValue({
      from: jest.fn(() => {
        const query = {
          select: jest.fn(),
          eq: jest.fn(),
          single: jest.fn().mockResolvedValue({ data: null }),
        }
        query.select.mockReturnValue(query)
        query.eq.mockReturnValue(query)
        return query
      }),
    })

    await verifyCharacter({} as Request)

    expect(mockCreateAdminClient).toHaveBeenCalled()
  })
})
