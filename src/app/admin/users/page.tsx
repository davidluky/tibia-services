import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'
import { getServerT } from '@/lib/i18n-server'
import { UserActions } from './UserActions'

export default async function UsersPage(
  props: {
    searchParams: Promise<{ q?: string; page?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const admin = createAdminClient()
  const t = await getServerT()
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
      <h2 className="text-2xl font-bold text-text-primary mb-6">{t('admin_users_title')}</h2>

      <form className="mb-4">
        <input
          name="q"
          defaultValue={search}
          placeholder={t('admin_users_search_placeholder')}
          className="bg-bg-primary border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold w-full max-w-sm"
        />
      </form>

      {!users || users.length === 0 ? (
        <p className="text-text-muted">{t('admin_users_empty')}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-left">
                  <th className="pb-3 pr-4">{t('admin_users_col_name')}</th>
                  <th className="pb-3 pr-4">{t('admin_users_col_role')}</th>
                  <th className="pb-3 pr-4">{t('admin_users_col_created')}</th>
                  <th className="pb-3 pr-4">{t('admin_users_col_status')}</th>
                  <th className="pb-3">{t('admin_users_col_action')}</th>
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
                        {user.is_banned ? t('admin_user_banned') : t('admin_user_active')}
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
                <a href={`?q=${search}&page=${page - 1}`} className="text-gold hover:text-gold-bright">{t('admin_page_prev')}</a>
              )}
              <span className="text-text-muted">{t('admin_page_of')} {page} {t('admin_page_of_total')} {totalPages}</span>
              {page < totalPages && (
                <a href={`?q=${search}&page=${page + 1}`} className="text-gold hover:text-gold-bright">{t('admin_page_next')}</a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
