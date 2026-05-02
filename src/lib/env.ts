import 'server-only'

const PLACEHOLDER_VALUES = new Set([
  'your-anon-public-key-here',
  'your-service-role-key-here',
  're_your_api_key_here',
  'your-random-secret-here',
])

export function requireServerEnv(name: string): string {
  const value = process.env[name]

  if (!value || PLACEHOLDER_VALUES.has(value) || value.includes('your-project-id')) {
    throw new Error(`${name} must be configured before this server path can run.`)
  }

  return value
}
