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
  checkActionRateLimit: jest.fn(),
  rejectOversizedRequest: jest.fn(),
  unauthorized: jest.fn(() => ({ status: 401 })),
  forbidden: jest.fn((message: string) => ({ status: 403, message })),
  badRequest: jest.fn((message: string) => ({ status: 400, message })),
  apiError: jest.fn((message: string, status: number) => ({ status, message })),
  serverError: jest.fn((message: string) => ({ status: 500, message })),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

import { POST } from '@/app/api/verification/route'
import {
  getAuthUser,
  checkActionRateLimit,
  rejectOversizedRequest,
  badRequest,
} from '@/lib/api-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

const mockGetAuthUser = getAuthUser as jest.Mock
const mockCheckActionRateLimit = checkActionRateLimit as jest.Mock
const mockRejectOversizedRequest = rejectOversizedRequest as jest.Mock
const mockBadRequest = badRequest as jest.Mock
const mockCreateAdminClient = createAdminClient as jest.Mock

class TestFile {
  readonly size: number

  constructor(
    readonly bytes: number[],
    readonly type: string,
  ) {
    this.size = bytes.length
  }

  slice(start: number, end: number) {
    const bytes = Uint8Array.from(this.bytes.slice(start, end))
    return {
      arrayBuffer: async () => bytes.buffer,
    }
  }

  async arrayBuffer() {
    return Uint8Array.from(this.bytes).buffer
  }
}

function image(type = 'image/png') {
  const signatures: Record<string, number[]> = {
    'image/jpeg': [0xff, 0xd8, 0xff, 0xe0],
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'image/webp': [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
  }
  return new TestFile(signatures[type], type) as unknown as File
}

function makeRequest(options: { screenshot?: File; idDocument?: File; characterName?: string } = {}) {
  const fields = new Map<string, unknown>([
    ['character_name', options.characterName ?? '  Knight Sample  '],
    ['screenshot', options.screenshot ?? image()],
    ['id_document', options.idDocument ?? image()],
  ])

  return {
    headers: { get: jest.fn(() => '1024') },
    formData: jest.fn(async () => ({ get: (key: string) => fields.get(key) ?? null })),
  } as unknown as Request
}

function makeSupabase(insertResult: { error: null | { code?: string; message: string } } = { error: null }) {
  const profileQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn().mockResolvedValue({ data: { role: 'serviceiro' } }),
  }
  profileQuery.select.mockReturnValue(profileQuery)
  profileQuery.eq.mockReturnValue(profileQuery)

  const existingQuery = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    limit: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
  existingQuery.select.mockReturnValue(existingQuery)
  existingQuery.eq.mockReturnValue(existingQuery)
  existingQuery.in.mockReturnValue(existingQuery)
  existingQuery.limit.mockReturnValue(existingQuery)

  const insert = jest.fn().mockResolvedValue(insertResult)
  let verificationCalls = 0
  const from = jest.fn((table: string) => {
    if (table === 'profiles') return profileQuery
    if (table === 'verification_requests') {
      return verificationCalls++ === 0 ? existingQuery : { insert }
    }
    throw new Error(`Unexpected table: ${table}`)
  })

  return { from, insert }
}

function setUpAdmin(
  uploadResults: Array<{ error: null | { message: string } }>,
) {
  const upload = jest.fn()
  uploadResults.forEach(result => upload.mockResolvedValueOnce(result))
  const remove = jest.fn().mockResolvedValue({ error: null })
  const bucket = { upload, remove }
  mockCreateAdminClient.mockReturnValue({
    storage: { from: jest.fn(() => bucket) },
  })
  return bucket
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'File', {
    configurable: true,
    value: TestFile,
  })
})

beforeEach(() => {
  jest.clearAllMocks()
  mockRejectOversizedRequest.mockReturnValue(null)
  mockCheckActionRateLimit.mockResolvedValue(false)
})

describe('identity verification upload safety', () => {
  it('rejects a file whose bytes do not match its declared image type', async () => {
    const supabase = makeSupabase()
    mockGetAuthUser.mockResolvedValue({ user: { id: 'serviceiro-1' }, supabase })

    const response = await POST(makeRequest({
      screenshot: new TestFile([1, 2, 3], 'image/png') as unknown as File,
    }) as never)

    expect(response.status).toBe(400)
    expect(mockBadRequest).toHaveBeenCalledWith(expect.stringContaining('conteúdo do arquivo'))
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('removes the successful sibling when one parallel upload fails', async () => {
    const supabase = makeSupabase()
    mockGetAuthUser.mockResolvedValue({ user: { id: 'serviceiro-1' }, supabase })
    const bucket = setUpAdmin([{ error: null }, { error: { message: 'id upload failed' } }])

    const response = await POST(makeRequest() as never)

    expect(response.status).toBe(500)
    expect(bucket.remove).toHaveBeenCalledWith([
      expect.stringMatching(/^serviceiro-1\/screenshot-.*\.png$/),
    ])
    expect(supabase.insert).not.toHaveBeenCalled()
  })

  it('removes both private objects when the database insert fails', async () => {
    const supabase = makeSupabase({ error: { message: 'insert failed' } })
    mockGetAuthUser.mockResolvedValue({ user: { id: 'serviceiro-1' }, supabase })
    const bucket = setUpAdmin([{ error: null }, { error: null }])

    const response = await POST(makeRequest() as never)

    expect(response.status).toBe(500)
    expect(bucket.remove).toHaveBeenCalledWith(expect.arrayContaining([
      expect.stringMatching(/^serviceiro-1\/screenshot-.*\.png$/),
      expect.stringMatching(/^serviceiro-1\/id-.*\.png$/),
    ]))
  })

  it('stores a trimmed character name and keeps successful uploads', async () => {
    const supabase = makeSupabase()
    mockGetAuthUser.mockResolvedValue({ user: { id: 'serviceiro-1' }, supabase })
    const bucket = setUpAdmin([{ error: null }, { error: null }])

    const response = await POST(makeRequest() as never)

    expect(response.status).toBe(201)
    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
      character_name: 'Knight Sample',
    }))
    expect(bucket.remove).not.toHaveBeenCalled()
  })
})
