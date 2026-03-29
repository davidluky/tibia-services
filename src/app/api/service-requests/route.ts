import { NextResponse } from 'next/server'
import { isValidTC, sanitizeText } from '@/lib/utils'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import {
  getAuthUserWithProfile,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from '@/lib/api-helpers'

export async function POST(request: Request) {
  const { user, profile, supabase } = await getAuthUserWithProfile()
  if (!user) return unauthorized()

  if (!profile || profile.role !== 'customer') {
    return forbidden('forbidden')
  }
  if (profile.is_banned) {
    return forbidden('banned')
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return badRequest('invalid_json')
  }

  const {
    service_type,
    title,
    description,
    time_preference,
    preferred_date,
    preferred_time,
    budget_tc,
  } = body as Record<string, unknown>

  // Validate service_type
  if (typeof service_type !== 'string' || !GAMEPLAY_TYPES.map(g => g.key).includes(service_type as typeof GAMEPLAY_TYPES[number]['key'])) {
    return badRequest('invalid_service_type')
  }

  // Validate title
  if (typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 100) {
    return badRequest('invalid_title')
  }

  // Validate description
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > 500) {
      return badRequest('invalid_description')
    }
  }

  // Validate budget_tc
  if (budget_tc !== undefined && budget_tc !== null) {
    if (typeof budget_tc !== 'number' || !isValidTC(budget_tc)) {
      return badRequest('invalid_budget')
    }
  }

  const flexible_time = time_preference === 'flexible'

  // Validate date when scheduled
  if (!flexible_time) {
    if (!preferred_date || typeof preferred_date !== 'string') {
      return badRequest('date_required')
    }
    const today = new Date().toISOString().slice(0, 10)
    if (preferred_date < today) {
      return badRequest('date_in_past')
    }
  }

  const { data, error } = await supabase
    .from('service_requests')
    .insert({
      customer_id: user.id,
      service_type,
      title: sanitizeText(title),
      description: description && typeof description === 'string' ? sanitizeText(description) || null : null,
      flexible_time,
      preferred_date: flexible_time ? null : (preferred_date as string),
      preferred_time: flexible_time ? null : (typeof preferred_time === 'string' ? preferred_time : null),
      budget_tc: budget_tc ?? null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('service_requests insert error:', error)
    return serverError('server_error')
  }

  return NextResponse.json({ id: data.id })
}
