'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useLanguage } from '@/lib/language-context'

export default function LoginPage() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(t('login_error'))
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-text-primary mb-2">{t('login_title')}</h1>
        <p className="text-text-muted text-sm mb-8">
          {t('login_no_account')}{' '}
          <Link href="/auth/register" className="text-gold hover:text-gold-bright">
            {t('login_register_link')}
          </Link>
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label={t('login_email_label')}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('login_email_placeholder')}
            required
          />
          <Input
            label={t('login_password_label')}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <p className="text-status-error text-sm bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            {t('login_submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
