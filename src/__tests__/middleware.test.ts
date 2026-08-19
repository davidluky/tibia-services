jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ kind: 'next', status: 200 })),
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      body,
      kind: 'json',
      status: init?.status ?? 200,
    })),
  },
}))

import { NextResponse } from 'next/server'
import { config, middleware } from '@/middleware'

function request(
  method: string,
  headers: Record<string, string> = {},
) {
  return {
    method,
    url: 'https://tibia.example/api/bookings',
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as never
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('API mutation middleware', () => {
  it('covers every API route', () => {
    expect(config.matcher).toBe('/api/:path*')
  })

  it('lets read-only methods continue without an origin', () => {
    expect(middleware(request('GET'))).toEqual({ kind: 'next', status: 200 })
    expect(NextResponse.next).toHaveBeenCalledTimes(1)
  })

  it('rejects a cross-origin mutation before the route handler', () => {
    expect(middleware(request('POST', {
      origin: 'https://attacker.example',
      'sec-fetch-site': 'cross-site',
    }))).toEqual({
      body: { error: 'cross_origin_request' },
      kind: 'json',
      status: 403,
    })
    expect(NextResponse.next).not.toHaveBeenCalled()
  })

  it('lets a same-origin mutation continue', () => {
    expect(middleware(request('PATCH', {
      origin: 'https://tibia.example',
      'sec-fetch-site': 'same-origin',
    }))).toEqual({ kind: 'next', status: 200 })
  })
})
