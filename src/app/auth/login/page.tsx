import type { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Entrar — Tibia Services',
}

export default function LoginPage() {
  return <LoginClient />
}
