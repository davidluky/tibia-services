import type { Metadata } from 'next'
import RegisterClient from './RegisterClient'

export const metadata: Metadata = {
  title: 'Criar conta — Tibia Services',
}

export default function RegisterPage() {
  return <RegisterClient />
}
