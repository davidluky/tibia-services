export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-text-muted">
        <span className="text-3xl animate-spin">⟳</span>
        <p className="text-sm">Carregando...</p>
      </div>
    </div>
  )
}
