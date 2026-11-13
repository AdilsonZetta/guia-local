import {
  ChevronDown,
  ExternalLink,
  Home,
  MapPin,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { cn } from '@/lib/utils'
import { catalog, useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { checked } from '@/lib/management'
import { GlobalAdminSearch, NotificationBell } from './ManagementTools'
export type SidebarItem = {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
  badge?: number
}
export function SidebarLayout({
  title,
  items,
  homeTo,
}: {
  title: string
  items: SidebarItem[]
  homeTo: string
}) {
  const { profile, business, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const admin = homeTo === '/admin'
  const refs = useResource(catalog)
  const settings = useResource(() =>
    checked(supabase.from('site_settings').select('*').eq('id', 1).single()),
  )
  const count = useResource(
    async () =>
      business
        ? checked(
            supabase
              .from('reviews')
              .select('id')
              .eq('business_id', business.id)
              .eq('status', 'published')
              .is('reply_text', null),
          )
        : [],
    [business?.id],
  )
  const current = items.find((i) =>
    i.end ? i.to === location.pathname : location.pathname.startsWith(i.to),
  )
  const name = profile?.full_name || 'Minha conta'
  const nav = (
    <nav className="flex flex-1 flex-col gap-2 p-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between rounded-lg px-4 py-3 text-muted hover:bg-brand-soft',
              isActive && 'bg-brand-soft text-brand',
            )
          }
        >
          <span className="flex items-center gap-5">
            {item.icon}
            {item.label}
          </span>
          {item.label === 'Avaliações' && !admin && !!count.data?.length && (
            <span className="rounded-full bg-emerald-100 px-2 text-sm font-bold text-brand">
              {count.data.length}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
  return (
    <div className="mesh-shell management-shell min-h-svh bg-canvas md:grid md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="management-sidebar hidden border-r border-line bg-white md:flex md:flex-col">
        <Link to={homeTo} className="flex items-center gap-3 px-6 py-5">
          <MapPin className="brand-pin h-10 w-10 fill-brand text-brand" />
          <span>
            <strong className="block text-xl font-extrabold">Guia Local</strong>
            <small className="text-muted">{title}</small>
          </span>
        </Link>
        <div className="mx-3 my-3 flex items-center gap-3 rounded-lg border border-line p-2">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-rose-400 text-white">
            {business?.logo_url && !admin ? (
              <img
                src={business.logo_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Home size={28} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm">
              {admin ? name : business?.name || 'Meu negócio'}
            </strong>
            <small className="block truncate text-muted">
              {admin
                ? 'Administrador'
                : refs.data?.categories.find(
                    (c) => c.id === business?.category_id,
                  )?.name || 'Cadastre sua empresa'}
            </small>
          </span>
          <ChevronDown size={16} />
        </div>
        {nav}
        <div className="mt-auto border-t border-line p-6">
          <Link
            className="flex items-center gap-4 text-muted"
            to={business && !admin ? `/empresa/${business.slug}` : '/'}
          >
            <ExternalLink size={20} />
            {admin ? 'Ver site' : 'Ver página pública'}
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <span className="avatar bg-slate-200 text-ink">
              {name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')}
            </span>
            <span className="flex-1 text-sm">
              <strong className="block">{name}</strong>
              <small className="text-muted">
                {admin ? 'Administrador' : 'Responsável'}
              </small>
            </span>
            <button aria-label="Sair" onClick={() => void signOut()}>
              <LogOut size={16} className="text-muted" />
            </button>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="management-topbar flex items-center gap-5 border-b border-line bg-white px-6">
          <button
            className="md:hidden"
            aria-label="Menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <div className="flex items-center gap-3 text-sm">
            <Home size={20} />
            <span className="hidden sm:inline text-muted">{title}</span>
            <span className="text-muted">/</span>
            <span>
              {location.pathname.includes('indicacoes')
                ? 'Empresas / Indicações'
                : current?.label}
            </span>
          </div>
          {admin && <GlobalAdminSearch />}
          <div className="ml-auto flex items-center gap-8">
            <NotificationBell />
            <span className="city-pill hidden sm:flex">
              <MapPin size={18} className="text-brand" />
              {settings.data?.city_name || 'Uberaba'},{' '}
              {settings.data?.state_code || 'MG'}
              <ChevronDown size={16} />
            </span>
          </div>
        </header>
        {open && <div className="bg-white md:hidden">{nav}</div>}
        <main
          key={location.pathname + location.search}
          className="management-content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
