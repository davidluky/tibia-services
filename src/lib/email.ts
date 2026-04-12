import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key_here') return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@tibia-services.com'
const BASE_URL = process.env.APP_URL ?? 'http://localhost:3000'

async function getEmail(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.getUserById(userId)
    return data.user?.email ?? null
  } catch {
    return null
  }
}

function bookingLink(bookingId: string): string {
  return `${BASE_URL}/bookings/${bookingId}`
}

function emailHtml(title: string, body: string, bookingId: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">
        <tr>
          <td style="background:#1a1a2e;padding:20px 32px">
            <span style="color:#d4af37;font-size:18px;font-weight:bold">Tibia Services</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:20px">${title}</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6">${body}</p>
            <a href="${bookingLink(bookingId)}"
               style="display:inline-block;background:#d4af37;color:#1a1a2e;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
              Ver Reserva
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #eee">
            <p style="margin:0;color:#999;font-size:12px">
              Tibia Services — você recebeu este email porque tem uma reserva ativa.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Public send functions (never throw) ──────────────────────────────────────

export async function sendBookingCreated(opts: {
  bookingId: string
  serviceiroId: string
  customerName: string
  serviceType: string
}): Promise<void> {
  try {
    const to = await getEmail(opts.serviceiroId)
    if (!to) return
    const r = getResend(); if (!r) return
    await r.emails.send({
      from: FROM,
      to,
      subject: `Nova reserva de ${escapeHtml(opts.customerName)}`,
      html: emailHtml(
        `Nova reserva de ${escapeHtml(opts.customerName)}`,
        `Você recebeu uma nova reserva para <strong>${escapeHtml(opts.serviceType)}</strong>. Acesse para aceitar ou recusar.`,
        opts.bookingId,
      ),
    })
  } catch (err) {
    console.error('[email] sendBookingCreated failed:', err)
  }
}

export async function sendBookingAccepted(opts: {
  bookingId: string
  customerId: string
  serviceiroName: string
  serviceType: string
}): Promise<void> {
  try {
    const to = await getEmail(opts.customerId)
    if (!to) return
    const r = getResend(); if (!r) return
    await r.emails.send({
      from: FROM,
      to,
      subject: `${escapeHtml(opts.serviceiroName)} aceitou sua reserva`,
      html: emailHtml(
        `${escapeHtml(opts.serviceiroName)} aceitou sua reserva`,
        `Sua reserva de <strong>${escapeHtml(opts.serviceType)}</strong> foi aceita. Acesse para combinar os detalhes e o preço.`,
        opts.bookingId,
      ),
    })
  } catch (err) {
    console.error('[email] sendBookingAccepted failed:', err)
  }
}

export async function sendBookingDeclined(opts: {
  bookingId: string
  customerId: string
  serviceiroName: string
  serviceType: string
}): Promise<void> {
  try {
    const to = await getEmail(opts.customerId)
    if (!to) return
    const r = getResend(); if (!r) return
    await r.emails.send({
      from: FROM,
      to,
      subject: `${escapeHtml(opts.serviceiroName)} recusou sua reserva`,
      html: emailHtml(
        `${escapeHtml(opts.serviceiroName)} recusou sua reserva`,
        `Sua reserva de <strong>${escapeHtml(opts.serviceType)}</strong> foi recusada. Você pode buscar outro serviceiro.`,
        opts.bookingId,
      ),
    })
  } catch (err) {
    console.error('[email] sendBookingDeclined failed:', err)
  }
}

export async function sendBookingCompleted(opts: {
  bookingId: string
  customerId: string
  serviceiroName: string
}): Promise<void> {
  try {
    const to = await getEmail(opts.customerId)
    if (!to) return
    const r = getResend(); if (!r) return
    await r.emails.send({
      from: FROM,
      to,
      subject: `Reserva concluída — avalie ${escapeHtml(opts.serviceiroName)}`,
      html: emailHtml(
        `Reserva concluída!`,
        `Sua reserva com <strong>${escapeHtml(opts.serviceiroName)}</strong> foi concluída com sucesso! Não esqueça de deixar uma avaliação.`,
        opts.bookingId,
      ),
    })
  } catch (err) {
    console.error('[email] sendBookingCompleted failed:', err)
  }
}

export async function sendBookingCancelled(opts: {
  bookingId: string
  recipientId: string
  cancellerName: string
  serviceType: string
}): Promise<void> {
  try {
    const to = await getEmail(opts.recipientId)
    if (!to) return
    const r = getResend(); if (!r) return
    await r.emails.send({
      from: FROM,
      to,
      subject: `Reserva cancelada por ${escapeHtml(opts.cancellerName)}`,
      html: emailHtml(
        `Reserva cancelada`,
        `A reserva de <strong>${escapeHtml(opts.serviceType)}</strong> foi cancelada por <strong>${escapeHtml(opts.cancellerName)}</strong>.`,
        opts.bookingId,
      ),
    })
  } catch (err) {
    console.error('[email] sendBookingCancelled failed:', err)
  }
}
