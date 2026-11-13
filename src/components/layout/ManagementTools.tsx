import { Bell, Search } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import { checked } from '@/lib/management'

export function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const resource = useResource(
    async () =>
      checked(
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(40),
      ),
    [user?.id],
  )
  const reloadNotifications = useEffectEvent(() => resource.reload())
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => reloadNotifications(),
      )
      .subscribe()
    const timer = window.setInterval(() => reloadNotifications(), 60000)
    return () => {
      clearInterval(timer)
      void supabase.removeChannel(channel)
    }
  }, [user?.id])
  async function read(id?: string) {
    try {
      let q = supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user!.id)
      if (id) q = q.eq('id', id)
      await checked(q)
      resource.reload()
    } catch {
      setError('Não foi possível marcar como lida.')
    }
  }
  return (
    <div className="relative">
      <button
        className="relative p-2"
        aria-label="Notificações"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={24} />
        {resource.data?.some((n) => !n.read_at) && (
          <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>
      {open && (
        <div className="management-dropdown">
          <div className="flex justify-between gap-3 border-b border-line p-4">
            <strong>Notificações</strong>
            <button className="text-sm text-brand" onClick={() => void read()}>
              Marcar todas como lidas
            </button>
          </div>
          {(error || resource.error) && (
            <p role="alert" className="p-4 text-red-600">
              {error || resource.error}
            </p>
          )}
          {!resource.data?.length && (
            <p className="p-5 text-muted">Nenhuma notificação.</p>
          )}
          {resource.data?.map((n) => (
            <div
              key={n.id}
              className={`border-b border-line p-4 ${!n.read_at ? 'bg-brand-soft' : ''}`}
            >
              <Link
                to={(n.link || '/').replace(/^\/guia-local/, '')}
                onClick={() => {
                  void read(n.id)
                  setOpen(false)
                }}
              >
                <strong className="block text-sm">{n.title}</strong>
                <p className="mt-1 text-sm text-muted">{n.body}</p>
              </Link>
              <button
                className="mt-2 text-xs text-brand"
                onClick={() => void read(n.id)}
              >
                {n.read_at ? 'Lida' : 'Marcar como lida'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
export function GlobalAdminSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<
    { id: string; label: string; to: string; kind: string }[]
  >([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([])
        return
      }
      const term = `%${query.trim().replace(/[%_]/g, '')}%`
      try {
        const [businesses, users, reviews] = await Promise.all([
          checked(
            supabase
              .from('businesses')
              .select('id,name')
              .ilike('name', term)
              .limit(5),
          ),
          checked(
            supabase
              .from('profiles')
              .select('id,full_name,email')
              .or(
                `full_name.ilike.${term.replace(/[,()]/g, '')},email.ilike.${term.replace(/[,()]/g, '')}`,
              )
              .limit(5),
          ),
          checked(
            supabase
              .from('reviews')
              .select('id,body')
              .ilike('body', term)
              .limit(5),
          ),
        ])
        if (active) {
          setError('')
          setResults([
            ...businesses.map((b) => ({
              id: b.id,
              label: b.name,
              to: `/admin/empresas?id=${b.id}`,
              kind: 'Empresa',
            })),
            ...users.map((u) => ({
              id: u.id,
              label: u.full_name || u.email,
              to: `/admin/usuarios?id=${u.id}`,
              kind: 'Usuário',
            })),
            ...reviews.map((r) => ({
              id: r.id,
              label: r.body.slice(0, 80),
              to: `/admin/avaliacoes?id=${r.id}`,
              kind: 'Avaliação',
            })),
          ])
        }
      } catch {
        if (active) setError('Não foi possível buscar.')
      }
    }, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query])
  return (
    <div className="relative ml-auto hidden w-80 lg:block">
      <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
        <Search size={18} />
        <input
          className="w-full outline-none text-sm"
          placeholder="Buscar na plataforma"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query.length >= 2 && (
        <div className="management-dropdown">
          {error && <p className="p-4">{error}</p>}
          {results.map((r) => (
            <Link
              className="block border-b border-line p-3 hover:bg-brand-soft"
              key={r.kind + r.id}
              to={r.to}
              onClick={() => setQuery('')}
            >
              <small className="text-brand">{r.kind}</small>
              <p className="text-sm">{r.label}</p>
            </Link>
          ))}
          {!results.length && !error && (
            <p className="p-4 text-sm text-muted">Nenhum resultado.</p>
          )}
        </div>
      )}
    </div>
  )
}
