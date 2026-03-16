import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { UserActions } from './UserActions'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string }
}) {
  const admin = createAdminClient()
  const search = searchParams.q ?? ''
  const page = Number(searchParams.page ?? 1)
  const perPage = 25
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  let query = admin
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.ilike('display_name', `%${search}%`)
  }

  const { data: users, count } = await query

  const totalPages = Math.ceil((count ?? 0) / perPage)

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Usuários</h2>

      <form className="mb-4">
        <input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome..."
          className="bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold w-full max-w-sm"
        />
      </form>

      {!users || users.length === 0 ? (
        <p className="text-text-muted">Nenhum usuário encontrado.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-left">
                  <th className="pb-3 pr-4">Nome</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Cadastro</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user: {
                  id: string
                  display_name: string
                  role: string
                  created_at: string
                  is_banned: boolean
                }) => (
                  <tr key={user.id} className="hover:bg-bg-card transition-colors">
                    <td className="py-3 pr-4 text-text-primary">{user.display_name}</td>
                    <td className="py-3 pr-4 text-text-muted">{user.role}</td>
                    <td className="py-3 pr-4 text-text-muted">{formatDate(user.created_at)}</td>
                    <td className="py-3 pr-4">
                      <span className={user.is_banned ? 'text-status-error' : 'text-status-success'}>
                        {user.is_banned ? 'Banido' : 'Ativo'}
                      </span>
                    </td>
                    <td className="py-3">
                      <UserActions userId={user.id} isBanned={user.is_banned} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex gap-2 mt-4 text-sm">
              {page > 1 && (
                <a href={`?q=${search}&page=${page - 1}`} className="text-gold hover:text-gold-bright">← Anterior</a>
              )}
              <span className="text-text-muted">Página {page} de {totalPages}</span>
              {page < totalPages && (
                <a href={`?q=${search}&page=${page + 1}`} className="text-gold hover:text-gold-bright">Próxima →</a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
