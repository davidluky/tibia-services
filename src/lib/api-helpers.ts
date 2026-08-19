import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Standardized error responses ─────────────────────────────────────────────

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function unauthorized() {
  return apiError('Unauthorized', 401)
}

export function forbidden(message = 'Forbidden') {
  return apiError(message, 403)
}

export function notFound(message = 'Not found') {
  return apiError(message, 404)
}

export function badRequest(message: string) {
  return apiError(message, 400)
}

export function serverError(message = 'Internal server error') {
  return apiError(message, 500)
}

export function tooManyRequests(message = 'Too many requests') {
  return apiError(message, 429)
}

export function payloadTooLarge(message = 'Payload too large') {
  return apiError(message, 413)
}

// No JSON route needs more than this: the largest field any handler accepts is
// a 1,000-character message or comment. Reject on the header so the runtime is
// never asked to buffer and parse a multi-megabyte document first.
export const MAX_JSON_BODY_SIZE = 64 * 1024

export async function parseJsonBody<T extends Record<string, unknown>>(
  request: Request,
  maxBytes = MAX_JSON_BODY_SIZE,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  // A declared length lets the runtime reject the request before buffering its
  // JSON body. Refuse chunked/ambiguous JSON rather than accepting an
  // effectively unbounded request that cannot be checked ahead of parsing.
  const oversized = rejectOversizedRequest(request, maxBytes, {
    requireContentLength: true,
  })
  if (oversized) return { ok: false, response: oversized }

  try {
    const data = await request.json()
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, response: badRequest('invalid_json') }
    }
    return { ok: true, data: data as T }
  } catch {
    return { ok: false, response: badRequest('invalid_json') }
  }
}

export function rejectOversizedRequest(
  request: Request,
  maxBytes: number,
  options: { requireContentLength?: boolean } = {},
) {
  const contentLength = request.headers.get('content-length')
  if (!contentLength) {
    return options.requireContentLength ? badRequest('content_length_required') : null
  }

  const bytes = Number(contentLength)
  if (!Number.isSafeInteger(bytes) || bytes < 0) {
    return badRequest('invalid_content_length')
  }

  if (bytes > maxBytes) {
    return payloadTooLarge('payload_too_large')
  }

  return null
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}

export async function getAuthUserWithProfile() {
  const { user, supabase } = await getAuthUser()
  if (!user) return { user: null, profile: null, supabase }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, display_name, bio, is_banned, created_at')
    .eq('id', user.id)
    .single()

  return { user, profile, supabase }
}

export async function requireAdmin() {
  const { user, supabase } = await getAuthUser()
  if (!user) return { authorized: false as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || profile.is_banned) {
    return { authorized: false as const }
  }

  const adminClient = createAdminClient()
  return { authorized: true as const, user, adminClient }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export async function checkActionRateLimit(
  userId: string,
  action: string,
  windowMs: number,
  maxRequests: number,
): Promise<boolean> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - windowMs).toISOString()

  const { data, error } = await admin.rpc('check_api_action_rate_limit', {
    p_user_id: userId,
    p_action: action,
    p_since: since,
    p_max_requests: maxRequests,
  })

  if (error) {
    console.error('[rate-limit] Failed to record action:', error)
    return true
  }

  return data !== false
}
