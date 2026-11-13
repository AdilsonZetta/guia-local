import {
  ChevronDown,
  Heart,
  MapPin,
  Menu,
  Plus,
  Search,
  Star,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { NotificationBell } from './ManagementTools'
import { MeshBackground } from './MeshBackground'
import { applySeo } from '@/lib/seo'
const links = [
  { to: '/busca', label: 'Explorar', icon: Search },
  { to: '/morador/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/morador/avaliacoes', label: 'Minhas avaliações', icon: Star },
]
export function PublicLayout() {
  const { user, profile, isAdmin, isBusiness, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState(false)
  const [city, setCity] = useState('Uberaba')
  const [identity,setIdentity]=useState({site_name:'Guia Local',site_description:'',logo_url:null as string|null,state_code:'MG'})
  const location = useLocation()
  const [year] = useState(() => new Date().getFullYear())
  useEffect(() => {
    setOpen(false)
    setAccount(false)
  }, [location.pathname])
  useEffect(() => {
    void supabase
      .from('site_settings')
      .select('city_name,site_name,site_description,logo_url,state_code')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.city_name) setCity(data.city_name)
        if(data){setIdentity(data);applySeo({title:data.site_name,description:data.site_description || 'Encontre empresas e prestadores de confiança em Uberaba, MG.',url:window.location.origin+window.location.pathname})}
      })
  }, [])
  const name =
    profile?.full_name || user?.user_metadata.full_name || 'Minha conta'
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
  return (
    <div className="mesh-shell public-shell flex min-h-svh flex-col">
      <MeshBackground />
      <header className="public-header">
        <div className="site-container flex h-16 items-center gap-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 text-2xl font-extrabold tracking-tight"
          >
            {identity.logo_url ? <img src={identity.logo_url} alt="" className="h-9 w-9 object-contain"/> : <MapPin className="brand-pin h-9 w-9 fill-brand text-brand" strokeWidth={1.5}/>}
            <span>{identity.site_name}</span>
          </Link>
          <span className="city-pill hidden sm:inline-flex">
            <MapPin size={17} className="text-brand" />
            {city}, {identity.state_code}
            <ChevronDown size={16} className="ml-4" />
          </span>
          <nav className="ml-auto hidden items-center gap-7 text-sm text-muted lg:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className="flex items-center gap-2 hover:text-brand"
              >
                <l.icon size={21} />
                {l.label}
              </NavLink>
            ))}
          </nav>
          <Link
            to="/entrar?tipo=empresa"
            className="header-signup btn-outline ml-auto hidden shrink-0 text-sm md:inline-flex lg:ml-1"
          >
            <Plus size={19} />
            Cadastrar negócio
          </Link>
          {user && <NotificationBell/>}
          <div className="relative hidden md:block">
            {user ? (
              <>
                <button
                  onClick={() => setAccount(!account)}
                  aria-expanded={account}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="avatar">{initials}</span>
                  {name.split(' ')[0]}
                  <ChevronDown size={16} />
                </button>
                {account && (
                  <div className="absolute right-0 top-12 z-50 grid w-52 gap-3 rounded-xl border border-line bg-white p-4 shadow-lg">
                    <Link to="/morador/conta">Minha conta</Link>
                    {isBusiness && (
                      <Link to="/empresa-area/painel">Área da empresa</Link>
                    )}
                    {isAdmin && <Link to="/admin">Admin</Link>}
                    <button
                      className="text-left text-brand"
                      onClick={() => void signOut()}
                    >
                      Sair
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link className="btn-primary text-sm" to="/entrar">
                <UserRound size={18} />
                Entrar
              </Link>
            )}
          </div>
          <button
            className="ml-auto p-2 md:hidden"
            aria-label="Abrir menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <nav className="grid gap-4 border-t border-line bg-white p-5 md:hidden">
            {links.map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
            <Link to="/entrar?tipo=empresa">Cadastrar negócio</Link>
            <Link to="/morador/conta">Minha conta</Link>
            {isBusiness && (
              <Link to="/empresa-area/painel">Área da empresa</Link>
            )}
            {isAdmin && <Link to="/admin">Admin</Link>}
            {user ? (
              <button className="text-left" onClick={() => void signOut()}>
                Sair
              </button>
            ) : (
              <Link to="/entrar">Entrar</Link>
            )}
          </nav>
        )}
      </header>
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <footer className="site-container flex flex-wrap justify-between gap-3 py-5 text-xs text-muted">
        <span>
          © {year} {identity.site_name} · {city}, {identity.state_code}
        </span>
        {identity.site_description && <span>{identity.site_description}</span>}
        <Link to="/indicar">Ajude a conectar sua cidade · Indicar empresa</Link>
      </footer>
      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white py-3 text-[11px] font-bold md:hidden">
        {[
          ...links,
          {
            to: user ? '/morador/conta' : '/entrar',
            label: 'Conta',
            icon: UserRound,
          },
        ].map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 ${isActive ? 'text-brand' : 'text-muted'}`
            }
          >
            <l.icon size={21} />
            {l.label === 'Minhas avaliações' ? 'Avaliações' : l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
