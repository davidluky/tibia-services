import type { VocationKey, GameplayTypeKey, WeekdayKey } from './constants'

// ─── Database row types ────────────────────────────────────────────────────────
// These match the Supabase database schema exactly.

export type UserRole = 'customer' | 'serviceiro' | 'admin'

export interface Profile {
  id: string
  role: UserRole
  display_name: string
  bio: string | null
  whatsapp: string | null        // only returned by /api/contact/[id]
  discord: string | null         // only returned by /api/contact/[id]
  is_banned: boolean
  created_at: string
}

export interface ServiceiroProfile {
  id: string
  vocations: VocationKey[]
  gameplay_types: GameplayTypeKey[]
  available_weekdays: WeekdayKey[]
  available_from: string           // "HH:MM" format
  available_to: string             // "HH:MM" format
  timezone_offset: number          // hours from UTC (e.g. -3 for BRT)
  is_registered: boolean
  registered_at: string | null
  tibia_character: string | null
  tibia_char_verified: boolean
}

// Combined type used in most UI components
export interface ServiceiroWithProfile extends ServiceiroProfile {
  profile: Profile
  avg_rating: number | null
  review_count: number
  completion_counts: Record<GameplayTypeKey, number>
}

export interface Booking {
  id: string
  customer_id: string
  serviceiro_id: string
  service_type: GameplayTypeKey
  agreed_price_tc: number | null
  price_confirmed_by_customer: boolean
  price_confirmed_by_serviceiro: boolean
  payment_sent_by_customer: boolean
  payment_received_by_serviceiro: boolean
  complete_by_customer: boolean
  complete_by_serviceiro: boolean
  status: 'pending' | 'active' | 'completed' | 'declined' | 'cancelled' | 'disputed' | 'resolved'
  created_at: string
  completed_at: string | null
  // Joined fields
  customer?: Profile
  serviceiro?: Profile
  dispute?: Dispute
}

export interface Message {
  id: string
  booking_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: Profile
}

export interface Dispute {
  id: string
  booking_id: string
  opened_by: string
  reason: string
  status: 'open' | 'resolved'
  resolution: string | null
  resolved_by: string | null
  opened_at: string
  resolved_at: string | null
  // Joined fields
  opener?: { display_name: string }
}

export interface Review {
  id: string
  booking_id: string
  reviewer_id: string
  serviceiro_id: string
  rating: number   // 1–5
  comment: string | null
  is_visible: boolean
  created_at: string
  reviewer?: Profile
}

export interface VerificationRequest {
  id: string
  serviceiro_id: string
  character_name: string
  screenshot_url: string
  id_document_url: string
  fee_paid: boolean
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

// ─── API response types ────────────────────────────────────────────────────────
export interface ContactInfo {
  whatsapp: string
  discord: string
}

export interface ApiError {
  error: string
}
