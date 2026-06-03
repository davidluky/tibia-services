'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useLanguage } from '@/lib/language-context'

export default function RegisterPage() {
  const { t } = useLanguage()

  // Role explanation shown to the user during registration.
  // This choice cannot be changed later (would require admin action).
  const ROLE_OPTIONS = [
    { value: 'customer', title: t('register_role_customer_title'), description: t('register_role_customer_desc') },
    { value: 'serviceiro', title: t('register_role_serviceiro_title'), description: t('register_role_serviceiro_desc') },
  ]

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'customer' | 'serviceiro'>('customer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(t('register_password_error'))
      return
    }

    setLoading(true)

    // Pass role and display_name as user_metadata so the DB trigger can use them
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, display_name: displayName }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Redirect to home after signup (Supabase may require email confirmation
    // depending on project settings — disable it in Supabase Auth settings for easier dev)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-text-primary mb-2">{t('register_title')}</h1>
        <p className="text-text-muted text-sm mb-8">
          {t('register_has_account')}{' '}
          <Link href="/auth/login" className="text-gold hover:text-gold-bright">
            {t('register_login_link')}
          </Link>
        </p>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          {/* Role selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-text-muted">{t('register_role_label')}</label>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value as 'customer' | 'serviceiro')}
                  className={`
                    p-3 rounded-lg border text-left transition-all
                    ${role === opt.value
                      ? 'border-gold bg-gold/10 text-text-primary'
                      : 'border-border text-text-muted hover:border-gold/50'
                    }
                  `}
                >
                  <div className="font-medium text-sm">{opt.title}</div>
                  <div className="text-xs mt-1 opacity-70">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          <Input
            label={t('register_name_label')}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={t('register_name_placeholder')}
            required
          />
          <Input
            label={t('register_email_label')}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('register_email_placeholder')}
            required
          />
          <Input
            label={t('register_password_label')}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={t('register_password_placeholder')}
            required
          />

          {error && (
            <p className="text-status-error text-sm bg-status-error/10 border border-status-error/20 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            {t('register_submit')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
