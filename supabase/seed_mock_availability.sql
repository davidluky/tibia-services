-- Update mock serviceiro availability to show varied grid patterns
-- Run in: Supabase Dashboard → SQL Editor → New query

-- KnightMaster99: weekdays only, evening shift (18:00–23:00)
UPDATE serviceiro_profiles SET
  available_weekdays = ARRAY['mon', 'tue', 'wed', 'thu', 'fri'],
  available_from     = '18:00',
  available_to       = '23:00',
  timezone_offset    = -3
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';

-- SorcQuestPro: weekend + Wed, late night crossing midnight (22:00–04:00)
UPDATE serviceiro_profiles SET
  available_weekdays = ARRAY['wed', 'fri', 'sat', 'sun'],
  available_from     = '22:00',
  available_to       = '04:00',
  timezone_offset    = -3
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002';

-- PaladinElite: weekends only, afternoon to late night (14:00–02:00)
UPDATE serviceiro_profiles SET
  available_weekdays = ARRAY['fri', 'sat', 'sun'],
  available_from     = '14:00',
  available_to       = '02:00',
  timezone_offset    = -3
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003';
