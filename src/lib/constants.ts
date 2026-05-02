// ─── Vocations ────────────────────────────────────────────────────────────────
// Fixed list — no promoted versions (e.g. no "Elite Knight").
// Keeping base vocations only prevents inconsistent entries and keeps filters simple.
export const VOCATIONS = [
  { key: 'knight',   label: 'Knight' },
  { key: 'paladin',  label: 'Paladin' },
  { key: 'sorcerer', label: 'Sorcerer' },
  { key: 'druid',    label: 'Druid' },
  { key: 'monk',     label: 'Monk' },
] as const

export type VocationKey = typeof VOCATIONS[number]['key']

// ─── Gameplay Types ───────────────────────────────────────────────────────────
// hunt_x1 = solo, hunt_x2 = duo, hunt_x3plus = 3+ players, quests, ks_pk
// These are the service categories a serviceiro can offer.
// Completion counters are tracked per gameplay type in the reviews/bookings data.
export const GAMEPLAY_TYPES = [
  { key: 'hunt_x1',    label: 'Hunt x1',   description: 'Solo hunting' },
  { key: 'hunt_x2',    label: 'Hunt x2',   description: 'Duo hunting' },
  { key: 'hunt_x3plus',label: 'Hunt x3+',  description: 'Team hunting (3+ players)' },
  { key: 'quests',     label: 'Quests',    description: 'Quest completion' },
  { key: 'ks_pk',      label: 'KS/PK',     description: 'Kill stealing / Player killing' },
  { key: 'bestiary',   label: 'Bestiary',  description: 'Killing creatures for bestiary completion' },
] as const

export type GameplayTypeKey = typeof GAMEPLAY_TYPES[number]['key']

// ─── Weekdays ─────────────────────────────────────────────────────────────────
export const WEEKDAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
] as const

export type WeekdayKey = typeof WEEKDAYS[number]['key']

// ─── Booking Statuses ─────────────────────────────────────────────────────────
export const BOOKING_STATUSES = {
  PENDING:   'pending',    // created, waiting for serviceiro to accept
  ACTIVE:    'active',     // accepted, in progress
  COMPLETED: 'completed',  // both parties marked complete
  DECLINED:  'declined',   // serviceiro declined
  CANCELLED: 'cancelled',  // either party cancelled while active
  DISPUTED:  'disputed',   // participant opened a dispute
  RESOLVED:  'resolved',   // admin resolved a dispute
} as const

// ─── Tibia Coins ─────────────────────────────────────────────────────────────
// TC prices must be multiples of 25 (the smallest TC denomination in the game).
export const TC_INCREMENT = 25
export const TC_MIN = 25
export const TC_MAX = 100000
