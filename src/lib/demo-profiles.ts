export const DEMO_PROFILE_IDS = [
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000002',
  'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
] as const

export function isDemoProfileId(id: string): boolean {
  return DEMO_PROFILE_IDS.includes(id as (typeof DEMO_PROFILE_IDS)[number])
}

export const DEMO_PROFILE_ID_FILTER = `(${DEMO_PROFILE_IDS.join(',')})`
