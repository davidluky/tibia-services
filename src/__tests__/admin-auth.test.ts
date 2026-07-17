jest.mock('server-only', () => ({}))
jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminPage } from '@/lib/admin-auth'

const mockRedirect = redirect as unknown as jest.Mock
const mockCreateClient = createClient as jest.Mock
const mockCreateAdminClient = createAdminClient as jest.Mock

function serverClient(user: { id: string } | null, profile?: { role: string; is_banned: boolean } | null) {
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    single: jest.fn().mockResolvedValue({ data: profile ?? null }),
  }
  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)

  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
    from: jest.fn(() => query),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('admin page authorization', () => {
  it('redirects an unauthenticated request before creating a service-role client', async () => {
    mockCreateClient.mockResolvedValue(serverClient(null))

    await expect(requireAdminPage()).rejects.toThrow('redirect:/auth/login')
    expect(mockRedirect).toHaveBeenCalledWith('/auth/login')
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it.each([
    { role: 'customer', is_banned: false },
    { role: 'admin', is_banned: true },
  ])('redirects an unauthorized profile before creating a service-role client', async profile => {
    mockCreateClient.mockResolvedValue(serverClient({ id: 'user-1' }, profile))

    await expect(requireAdminPage()).rejects.toThrow('redirect:/')
    expect(mockRedirect).toHaveBeenCalledWith('/')
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('returns the service-role client only for a non-banned admin', async () => {
    const adminClient = { marker: 'admin-client' }
    mockCreateClient.mockResolvedValue(serverClient(
      { id: 'admin-1' },
      { role: 'admin', is_banned: false },
    ))
    mockCreateAdminClient.mockReturnValue(adminClient)

    await expect(requireAdminPage()).resolves.toEqual({
      user: { id: 'admin-1' },
      adminClient,
    })
  })
})
