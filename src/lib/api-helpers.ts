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

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function getAuthUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { user, supabase }
}

export async function getAuthUserWithProfile() {
  const { user, supabase } = await getAuthUser()
  if (!user) return { user: null, profile: null, supabase }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { user, profile, supabase }
}

export async function requireAdmin() {
  const { user, supabase } = await getAuthUser()
  if (!user) return { authorized: false as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { authorized: false as const }
  }

  const adminClient = createAdminClient()
  return { authorized: true as const, user, adminClient }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  table: string,
  userIdColumn: string,
  userId: string,
  windowMs: number,
  maxRequests: number,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString()
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(userIdColumn, userId)
    .gt('created_at', since)

  return (count ?? 0) >= maxRequests
}
