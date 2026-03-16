export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-card mt-20">
      <div className="max-w-6xl mx-auto px-4 py-8 text-center text-text-muted text-sm">
        <p>© {new Date().getFullYear()} Tibia Services. Não afiliado à CipSoft GmbH.</p>
        <p className="mt-1 text-xs">
          Tibia é marca registrada da CipSoft GmbH. Todos os nomes de vocação e itens pertencem aos seus respectivos donos.
        </p>
      </div>
    </footer>
  )
}
