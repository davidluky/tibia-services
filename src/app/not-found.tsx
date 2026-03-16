import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-gold mb-4">404</p>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Página não encontrada</h2>
        <p className="text-text-muted text-sm mb-6">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          href="/"
          className="bg-gold text-bg-primary px-6 py-2 rounded-md font-semibold hover:bg-gold-bright transition-colors text-sm"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
