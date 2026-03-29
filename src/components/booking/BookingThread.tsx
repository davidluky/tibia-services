'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { timeAgo, formatTC, sanitizeText } from '@/lib/utils'
import { GAMEPLAY_TYPES } from '@/lib/constants'
import type { Booking, Message, Dispute } from '@/lib/types'
import { useLanguage } from '@/lib/language-context'
import { createClient } from '@/lib/supabase/client'
import { ErrorRetry } from '@/components/ui/ErrorRetry'

interface BookingThreadProps {
  booking: Booking
  currentUserId: string
  currentUserRole: string
  dispute?: Dispute
}

const STATUS_VARIANTS: Record<string, string> = {
  pending: 'bg-status-warning/10 text-status-warning border border-status-warning/20',
  active: 'bg-status-success/10 text-status-success border border-status-success/20',
  completed: 'bg-gold/10 text-gold border border-gold/20',
  declined: 'bg-status-error/10 text-status-error border border-status-error/20',
  cancelled: 'bg-text-muted/10 text-text-muted border border-border',
  disputed: 'bg-status-warning/10 text-status-warning border border-status-warning/30',
  resolved: 'bg-border/50 text-text-muted border border-border',
}

export function BookingThread({ booking: initialBooking, currentUserId, currentUserRole, dispute }: BookingThreadProps) {
  const { t } = useLanguage()
  const supabase = createClient()
  const [booking, setBooking] = useState(initialBooking)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [error, setError] = useState('')
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeLoading, setDisputeLoading] = useState(false)
  const [disputeError, setDisputeError] = useState('')
  const [messageError, setMessageError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isCustomer = currentUserId === booking.customer_id
  const isServiceiro = currentUserId === booking.serviceiro_id

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?booking_id=${booking.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
        setMessageError(false)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      } else {
        setMessageError(true)
      }
    } catch {
      setMessageError(true)
    }
  }, [booking.id])

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${booking.id}`)
      if (res.ok) {
        const data = await res.json()
        setBooking(data)
      }
    } catch {
      // network error — booking state stays stale
    }
  }, [booking.id])

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`booking-messages-${booking.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${booking.id}`,
        },
        (payload) => {
          setMessages(prev => {
            const newMsg = payload.new as unknown as Message
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id])

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    setSendingMessage(true)
    setError('')

    const cleanContent = sanitizeText(newMessage)
    if (!cleanContent) {
      setSendingMessage(false)
      return
    }

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id, content: cleanContent }),
      })

      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev, msg])
        setNewMessage('')
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      } else {
        const data = await res.json()
        setError(data.error)
      }
    } catch {
      setError(t('error_generic'))
    }
    setSendingMessage(false)
  }

  const doAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(action)
    setError('')

    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
      } else {
        await fetchBooking()
      }
    } catch {
      setError(t('error_generic'))
    }
    setActionLoading(null)
  }

  const submitDispute = async () => {
    if (disputeReason.length < 10 || disputeReason.length > 500) {
      setDisputeError(t('booking_dispute_length_error'))
      return
    }
    setDisputeLoading(true)
    setDisputeError('')

    const res = await fetch('/api/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: booking.id, reason: disputeReason }),
    })

    if (res.ok) {
      setShowDisputeForm(false)
      setDisputeReason('')
      await fetchBooking()
      setDisputeLoading(false)
    } else {
      const data = await res.json()
      setDisputeError(data.error ?? t('booking_dispute_error_fallback'))
      setDisputeLoading(false)
    }
  }

  const serviceType = GAMEPLAY_TYPES.find(g => g.key === booking.service_type)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main: messages */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {/* Booking header */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_VARIANTS[booking.status]}`}>
                {t(`booking_status_${booking.status}`)}
              </span>
              <h2 className="text-lg font-semibold text-text-primary mt-2">
                {serviceType?.label ?? booking.service_type}
              </h2>
              {booking.agreed_price_tc && (
                <p className="text-text-muted text-sm">
                  {t('booking_price_agreed')} <span className="text-gold font-medium">{formatTC(booking.agreed_price_tc)}</span>
                  {booking.price_confirmed_by_customer && booking.price_confirmed_by_serviceiro && (
                    <span className="text-status-success text-xs ml-2">{t('booking_price_confirmed')}</span>
                  )}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-text-muted">
              <p>{t('booking_label_customer')} {booking.customer?.display_name ?? t('booking_label_customer_fallback')}</p>
              <p>{t('booking_label_serviceiro')} {booking.serviceiro?.display_name ?? t('booking_label_serviceiro_fallback')}</p>
            </div>
          </div>
        </Card>

        {/* Messages */}
        <Card className="flex flex-col h-96">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messageError ? (
              <ErrorRetry onRetry={fetchMessages} />
            ) : messages.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">
                {booking.status === 'pending'
                  ? t('booking_msg_pending')
                  : t('booking_msg_empty')}
              </p>
            ) : (
              messages.map(msg => {
                const isMine = msg.sender_id === currentUserId
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-xl px-3 py-2 ${
                      isMine
                        ? 'bg-gold/10 text-text-primary'
                        : 'bg-bg-hover text-text-primary'
                    }`}>
                      {!isMine && (
                        <p className="text-xs text-text-muted mb-1">
                          {(msg.sender as { display_name: string } | undefined)?.display_name}
                        </p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs text-text-muted/60 mt-1 text-right">{timeAgo(msg.created_at)}</p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          {booking.status === 'active' && (
            <div className="border-t border-border p-3 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={t('booking_msg_placeholder')}
                className="flex-1 bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold"
              />
              <Button onClick={sendMessage} loading={sendingMessage} size="sm">
                {t('booking_send')}
              </Button>
            </div>
          )}
        </Card>

        {/* Disputed state card */}
        {booking.status === 'disputed' && dispute && (
          <Card className="p-4 border border-status-warning/30 bg-status-warning/5">
            <h3 className="text-sm font-semibold text-status-warning mb-2">{t('booking_disputed_title')}</h3>
            <p className="text-sm text-text-primary mb-1">
              <span className="text-text-muted">{t('booking_disputed_reason')} </span>{dispute.reason}
            </p>
            <p className="text-xs text-text-muted">
              {t('booking_disputed_opened_by')} <span className="text-text-primary">{dispute.opener?.display_name ?? t('booking_participant_fallback')}</span>
            </p>
            <p className="text-xs text-text-muted mt-2">{t('booking_disputed_waiting')}</p>
          </Card>
        )}

        {/* Resolved state card */}
        {booking.status === 'resolved' && dispute && (
          <Card className="p-4 border border-border bg-border/10">
            <h3 className="text-sm font-semibold text-text-muted mb-2">{t('booking_resolved_title')}</h3>
            <p className="text-sm text-text-primary">{dispute.resolution ?? ''}</p>
          </Card>
        )}
      </div>

      {/* Sidebar: actions */}
      <div className="space-y-4">
        {error && (
          <p className="text-status-error text-sm bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {/* Serviceiro actions */}
        {isServiceiro && booking.status === 'pending' && (
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-semibold text-text-primary">{t('booking_respond_title')}</h3>
            <Button
              onClick={() => doAction('accept')}
              loading={actionLoading === 'accept'}
              className="w-full"
            >
              {t('booking_accept')}
            </Button>
            <Button
              variant="danger"
              onClick={() => doAction('decline')}
              loading={actionLoading === 'decline'}
              className="w-full"
            >
              {t('booking_decline')}
            </Button>
          </Card>
        )}

        {/* Price negotiation */}
        {booking.status === 'active' && (
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">{t('booking_price_section')}</h3>
            <div className="flex gap-2">
              <input
                type="number"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
                placeholder="Ex: 500"
                min={25}
                step={25}
                className="flex-1 bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => doAction('set_price', { price_tc: Number(priceInput) })}
                loading={actionLoading === 'set_price'}
              >
                {t('booking_price_propose')}
              </Button>
            </div>

            {booking.agreed_price_tc && (
              <div>
                <p className="text-xs text-text-muted mb-2">
                  {t('booking_price_proposed')} <span className="text-gold">{formatTC(booking.agreed_price_tc)}</span>
                </p>
                <div className="flex gap-1 text-xs">
                  <span className={booking.price_confirmed_by_customer ? 'text-status-success' : 'text-text-muted'}>
                    {booking.price_confirmed_by_customer ? '✓' : '○'} {t('booking_label_customer_short')}
                  </span>
                  <span className="text-text-muted/30 mx-1">|</span>
                  <span className={booking.price_confirmed_by_serviceiro ? 'text-status-success' : 'text-text-muted'}>
                    {booking.price_confirmed_by_serviceiro ? '✓' : '○'} {t('booking_label_serviceiro_short')}
                  </span>
                </div>
                {!((isCustomer && booking.price_confirmed_by_customer) || (isServiceiro && booking.price_confirmed_by_serviceiro)) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => doAction('confirm_price')}
                    loading={actionLoading === 'confirm_price'}
                    className="w-full mt-2"
                  >
                    {t('booking_price_confirm')}
                  </Button>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Payment */}
        {booking.status === 'active' && booking.price_confirmed_by_customer && booking.price_confirmed_by_serviceiro && (
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-semibold text-text-primary">{t('booking_payment_section')}</h3>
            {isCustomer && !booking.payment_sent_by_customer && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => doAction('payment_sent')}
                loading={actionLoading === 'payment_sent'}
                className="w-full"
              >
                {t('booking_payment_sent_btn')}
              </Button>
            )}
            {isServiceiro && !booking.payment_received_by_serviceiro && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => doAction('payment_received')}
                loading={actionLoading === 'payment_received'}
                className="w-full"
              >
                {t('booking_payment_received_btn')}
              </Button>
            )}
            <div className="flex gap-2 text-xs">
              <span className={booking.payment_sent_by_customer ? 'text-status-success' : 'text-text-muted'}>
                {booking.payment_sent_by_customer ? '✓' : '○'} {t('booking_payment_sent_label')}
              </span>
              <span className="text-text-muted/30">|</span>
              <span className={booking.payment_received_by_serviceiro ? 'text-status-success' : 'text-text-muted'}>
                {booking.payment_received_by_serviceiro ? '✓' : '○'} {t('booking_payment_received_label')}
              </span>
            </div>
          </Card>
        )}

        {/* Mark complete */}
        {booking.status === 'active' && (
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-semibold text-text-primary">{t('booking_complete_section')}</h3>
            {!((isCustomer && booking.complete_by_customer) || (isServiceiro && booking.complete_by_serviceiro)) && (
              <Button
                size="sm"
                onClick={() => doAction('mark_complete')}
                loading={actionLoading === 'mark_complete'}
                className="w-full"
              >
                {t('booking_complete_btn')}
              </Button>
            )}
            <div className="flex gap-2 text-xs">
              <span className={booking.complete_by_customer ? 'text-status-success' : 'text-text-muted'}>
                {booking.complete_by_customer ? '✓' : '○'} {t('booking_label_customer_short')}
              </span>
              <span className="text-text-muted/30">|</span>
              <span className={booking.complete_by_serviceiro ? 'text-status-success' : 'text-text-muted'}>
                {booking.complete_by_serviceiro ? '✓' : '○'} {t('booking_label_serviceiro_short')}
              </span>
            </div>
          </Card>
        )}

        {/* Cancel */}
        {(booking.status === 'active' || booking.status === 'pending') && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => doAction('cancel')}
            loading={actionLoading === 'cancel'}
            className="w-full"
          >
            {t('booking_cancel')}
          </Button>
        )}

        {/* Dispute form (only when active) */}
        {booking.status === 'active' && (
          <div>
            {!showDisputeForm ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDisputeForm(true)}
                className="w-full"
              >
                {t('booking_dispute_btn')}
              </Button>
            ) : (
              <Card className="p-4 space-y-3">
                <h3 className="text-sm font-semibold text-status-warning">{t('booking_dispute_title')}</h3>
                <textarea
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                  placeholder={t('booking_dispute_placeholder')}
                  rows={4}
                  minLength={10}
                  maxLength={500}
                  className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-status-warning resize-none"
                />
                <p className="text-xs text-text-muted text-right">{disputeReason.length}/500</p>
                {disputeError && (
                  <p className="text-status-error text-xs">{disputeError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={submitDispute}
                    loading={disputeLoading}
                    className="flex-1"
                  >
                    {t('booking_dispute_confirm')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowDisputeForm(false); setDisputeReason(''); setDisputeError('') }}
                    className="flex-1"
                  >
                    {t('booking_dispute_cancel')}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
