import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RegisterClient from '@/app/auth/register/RegisterClient'
import { VerificationClient } from '@/app/dashboard/verification/VerificationClient'
import { BookNowForm } from '@/app/serviceiro/[id]/BookNowForm'
import { NewRequestForm } from '@/app/servicos/novo/NewRequestForm'
import { NotificationBell } from '@/components/layout/NotificationBell'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: jest.fn() }),
}))

jest.mock('@/lib/language-context', () => ({
  useLanguage: () => ({
    lang: 'en',
    t: (key: string) => key,
  }),
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: jest.fn(),
    },
  }),
}))

beforeEach(() => {
  mockPush.mockReset()
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.restoreAllMocks()
})

it('exposes registration roles as keyboard-selectable radios', () => {
  render(<RegisterClient />)

  const customer = screen.getByRole('radio', { name: /register_role_customer_title/ })
  const serviceiro = screen.getByRole('radio', { name: /register_role_serviceiro_title/ })

  expect(customer).toBeChecked()
  fireEvent.click(serviceiro)
  expect(serviceiro).toBeChecked()
  expect(customer).not.toBeChecked()
})

it('restores the booking button and shows a fallback after a network failure', async () => {
  ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'))
  render(<BookNowForm serviceiroId="serviceiro-1" gameplayTypes={['quests']} />)

  const submit = screen.getByRole('button', { name: 'booknow_submit' })
  fireEvent.click(submit)

  expect(await screen.findByRole('alert')).toHaveTextContent('booknow_error')
  expect(submit).not.toBeDisabled()
  expect(screen.getByLabelText('booknow_service_label')).toBeInTheDocument()
})

it('recovers the new-request form after fetch rejects', async () => {
  ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'))
  render(<NewRequestForm />)

  fireEvent.change(screen.getByLabelText('requests_field_type *'), { target: { value: 'quests' } })
  fireEvent.change(screen.getByLabelText('requests_field_title *'), { target: { value: 'Quest help' } })
  const submit = screen.getByRole('button', { name: 'requests_submit' })
  fireEvent.click(submit)

  expect(await screen.findByRole('alert')).toHaveTextContent('requests_error_generic')
  expect(submit).not.toBeDisabled()
})

it('handles a non-JSON verification error without leaving the form busy', async () => {
  ;(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    json: jest.fn().mockRejectedValue(new Error('not json')),
  })
  render(<VerificationClient userId="user-1" existing={null} />)

  fireEvent.change(screen.getByLabelText('verification_char_label'), { target: { value: 'Knight Name' } })
  fireEvent.change(screen.getByLabelText('verification_screenshot_label'), {
    target: { files: [new File(['image'], 'screen.png', { type: 'image/png' })] },
  })
  fireEvent.change(screen.getByLabelText('verification_id_label'), {
    target: { files: [new File(['image'], 'id.png', { type: 'image/png' })] },
  })
  const submit = screen.getByRole('button', { name: 'verification_submit' })
  fireEvent.submit(submit.closest('form') as HTMLFormElement)

  expect(await screen.findByRole('alert')).toHaveTextContent('verification_error_send')
  expect(submit).not.toBeDisabled()
})

it('shows notification fetch errors and retries successfully', async () => {
  ;(global.fetch as jest.Mock)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue([]) })
  render(<NotificationBell />)

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
  fireEvent.click(screen.getByRole('button', { name: 'notif_bell_label' }))
  const retry = await screen.findByRole('button', { name: 'error_retry' })
  fireEvent.click(retry)

  expect(await screen.findByText('notif_empty')).toBeInTheDocument()
})

it('rolls unread notifications back when marking them read fails', async () => {
  const notification = {
    id: 'notification-1',
    user_id: 'user-1',
    type: 'booking',
    title: 'Booking update',
    body: null,
    link: null,
    is_read: false,
    created_at: new Date().toISOString(),
  }
  ;(global.fetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue([notification]) })
    .mockResolvedValueOnce({ ok: false })
  render(<NotificationBell />)

  const bell = await screen.findByRole('button', { name: 'notif_bell_label (1)' })
  fireEvent.click(bell)

  expect(await screen.findByRole('button', { name: 'error_retry' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'notif_bell_label (1)' })).toBeInTheDocument()
})
