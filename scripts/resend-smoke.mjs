import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Resend } from 'resend'

const PLACEHOLDERS = new Set(['', 're_your_api_key_here', 'your-resend-api-key'])

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const index = trimmed.indexOf('=')
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!(key in process.env)) process.env[key] = value
  }
}

function argValue(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
loadEnvFile(resolve(projectRoot, '.env.local'))

const dryRun = process.argv.includes('--dry-run')
const to = argValue('--to') ?? process.env.RESEND_TEST_TO
const apiKey = process.env.RESEND_API_KEY ?? ''
const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

if (PLACEHOLDERS.has(apiKey) || !apiKey.startsWith('re_')) {
  console.error('RESEND_API_KEY is missing, placeholder-shaped, or not a Resend key.')
  process.exit(2)
}

if (!to) {
  console.error('Provide a test recipient with --to someone@example.com or RESEND_TEST_TO.')
  process.exit(2)
}

if (dryRun) {
  console.log(`Dry run ok. Would send one Resend smoke email from ${from} to ${to}.`)
  process.exit(0)
}

const resend = new Resend(apiKey)
const result = await resend.emails.send({
  from,
  to,
  subject: 'Tibia Services Resend smoke test',
  html: [
    '<p>This is a controlled Tibia Services email smoke test.</p>',
    '<p>If you received this, the configured Resend key and sender can deliver email.</p>',
  ].join(''),
})

if (result.error) {
  console.error(`Resend smoke failed: ${result.error.message}`)
  process.exit(1)
}

console.log(`Resend smoke sent. Message id: ${result.data?.id ?? 'unknown'}`)
