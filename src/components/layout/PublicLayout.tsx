import { MapPin, Menu, Search, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Início', icon: MapPin, end: true },
  { to: '/busca', label: 'Buscar', icon: Search },
  { to: '/morador/favoritos', label: 'Favoritos', icon: UserRound, auth: true },
]

export function PublicLayout() {
  const { user, profile, isAdmin, isBusiness, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [siteName, setSiteName] = useState('Guia Local')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('site_name')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.site_name) setSiteName(data.site_name)
      })
  }, [])

  return (
    <div className="flex min-h-svh flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-brand">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="text-lg">{siteName}</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-muted md:flex">
            <NavLink to="/" end className={({ isActive }) => cn(isActive && 'text-brand')}>
              Início
            </NavLink>
            <NavLink to="/busca" className={({ isActive }) => cn(isActive && 'text-brand')}>
              Buscar
            </NavLink>
            <NavLink to="/indicar" className={({ isActive }) => cn(isActive && 'text-brand')}>
              Indicar empresa
            </NavLink>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <div className="hidden items-center gap-2 md:flex">
                {isAdmin && (
                  <Link to="/admin" className="text-sm font-semibold text-brand">
                    Admin
                  </Link>
                )}
                {isBusiness && (
                  <Link to="/empresa-area/painel" className="text-sm font-semibold text-brand">
                    Área da empresa
                  </Link>
                )}
                <Link
                  to="/morador/conta"
                  className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-dark"
                >
                  {profile?.full_name?.split(' ')[0] ?? 'Minha conta'}
                </Link>
                <button className="text-sm text-muted hover:text-ink" onClick={() => signOut()}>
                  Sair
                </button>
              </div>
            ) : (
              <button
                className="hidden rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white md:inline-flex"
                onClick={() => navigate('/entrar')}
              >
                Entrar
              </button>
            )}
            <button className="rounded-xl p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-line bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-semibold">
              <Link to="/">Início</Link>
              <Link to="/busca">Buscar</Link>
              <Link to="/indicar">Indicar empresa</Link>
              {isAdmin && <Link to="/admin">Admin</Link>}
              {isBusiness && <Link to="/empresa-area/painel">Área da empresa</Link>}
              {user ? (
                <>
                  <Link to="/morador/conta">Minha conta</Link>
                  <button className="text-left" onClick={() => signOut()}>
                    Sair
                  </button>
                </>
              ) : (
                <Link to="/entrar">Entrar</Link>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <footer className="mt-auto hidden border-t border-line bg-white py-8 md:block">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted">
          <p>© {new Date().getFullYear()} {siteName} · Uberaba, MG</p>
          <div className="flex gap-4">
            <Link to="/busca">Buscar empresas</Link>
            <Link to="/indicar">Indicar empresa</Link>
            <Link to="/entrar">Entrar</Link>
          </div>
        </div>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white py-2 text-[11px] font-semibold text-muted md:hidden">
        <NavLink to="/" end className={({ isActive }) => cn('flex flex-col items-center gap-1', isActive && 'text-brand')}>
          <MapPin className="h-5 w-5" />
          Início
        </NavLink>
        <NavLink to="/busca" className={({ isActive }) => cn('flex flex-col items-center gap-1', isActive && 'text-brand')}>
          <Search className="h-5 w-5" />
          Buscar
        </NavLink>
        <NavLink to="/indicar" className={({ isActive }) => cn('flex flex-col items-center gap-1', isActive && 'text-brand')}>
          <MapPin className="h-5 w-5" />
          Indicar
        </NavLink>
        <NavLink
          to={user ? '/morador/conta' : '/entrar'}
          className={({ isActive }) => cn('flex flex-col items-center gap-1', isActive && 'text-brand')}
        >
          <UserRound className="h-5 w-5" />
          Conta
        </NavLink>
      </nav>
    </div>
  )
}
