import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidTC, sanitizeText } from '@/lib/utils'

const VALID_SERVICE_TYPES = [
  'hunt_x1', 'hunt_x2', 'hunt_x3plus', 'quests', 'ks_pk', 'bestiary',
]

export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (profile.is_banned) {
    return NextResponse.json({ error: 'banned' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
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
  if (typeof service_type !== 'string' || !VALID_SERVICE_TYPES.includes(service_type)) {
    return NextResponse.json({ error: 'invalid_service_type' }, { status: 400 })
  }

  // Validate title
  if (typeof title !== 'string' || title.trim().length < 5 || title.trim().length > 100) {
    return NextResponse.json({ error: 'invalid_title' }, { status: 400 })
  }

  // Validate description
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string' || description.length > 500) {
      return NextResponse.json({ error: 'invalid_description' }, { status: 400 })
    }
  }

  // Validate budget_tc
  if (budget_tc !== undefined && budget_tc !== null) {
    if (typeof budget_tc !== 'number' || !isValidTC(budget_tc)) {
      return NextResponse.json({ error: 'invalid_budget' }, { status: 400 })
    }
  }

  const flexible_time = time_preference === 'flexible'

  // Validate date when scheduled
  if (!flexible_time) {
    if (!preferred_date || typeof preferred_date !== 'string') {
      return NextResponse.json({ error: 'date_required' }, { status: 400 })
    }
    const today = new Date().toISOString().slice(0, 10)
    if (preferred_date < today) {
      return NextResponse.json({ error: 'date_in_past' }, { status: 400 })
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
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
