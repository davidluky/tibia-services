-- Fix: trigger created serviceiro_profiles with empty arrays before seed ran.
-- Run in: Supabase Dashboard → SQL Editor → New query

UPDATE serviceiro_profiles SET
  vocations      = ARRAY['knight'],
  gameplay_types = ARRAY['hunt_x1', 'hunt_x2', 'hunt_x3plus']
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';

UPDATE serviceiro_profiles SET
  vocations      = ARRAY['sorcerer', 'druid'],
  gameplay_types = ARRAY['quests', 'hunt_x1', 'bestiary']
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002';

UPDATE serviceiro_profiles SET
  vocations      = ARRAY['paladin'],
  gameplay_types = ARRAY['ks_pk', 'bestiary', 'hunt_x1']
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003';
