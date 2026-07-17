jest.mock('server-only', () => ({}))
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }))
jest.mock('resend', () => ({ Resend: jest.fn() }))

import { sanitizeEmailSubject } from '@/lib/email'

describe('email subject safety', () => {
  it('preserves ordinary text without HTML entity encoding', () => {
    expect(sanitizeEmailSubject('A&B <Knight>')).toBe('A&B <Knight>')
  })

  it('removes header-breaking newlines and collapses whitespace', () => {
    expect(sanitizeEmailSubject('Alice\r\nBcc: attacker@example.com   Knight')).toBe(
      'Alice Bcc: attacker@example.com Knight',
    )
  })
})
