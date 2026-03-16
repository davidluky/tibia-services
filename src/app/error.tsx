'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-4xl mb-4">⚠</p>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Algo deu errado</h2>
        <p className="text-text-muted text-sm mb-6">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  )
}
