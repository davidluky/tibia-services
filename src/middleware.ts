import { NextRequest, NextResponse } from 'next/server'
import { isAllowedMutationOrigin } from '@/lib/request-origin'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function middleware(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next()

  const allowed = isAllowedMutationOrigin({
    requestUrl: request.url,
    origin: request.headers.get('origin'),
    fetchSite: request.headers.get('sec-fetch-site'),
  })

  if (!allowed) {
    return NextResponse.json({ error: 'cross_origin_request' }, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
