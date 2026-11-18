import { Suspense } from 'react'
import { Flag, Heart, Star, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { RouteFallback } from '@/components/ui/Skeleton'
const items = [
  { to: '/morador/favoritos', label: 'Favoritos', icon: Heart },
  { to: '/morador/avaliacoes', label: 'Minhas avaliações', icon: Star },
  { to: '/morador/indicar', label: 'Indicar empresa', icon: Flag },
  { to: '/morador/conta', label: 'Minha conta', icon: UserRound },
]
export function ResidentShell() {
  return (
    <div className="site-container resident-layout grid min-w-0 items-start gap-4 py-4 sm:gap-7 sm:py-8 lg:grid-cols-[245px_1fr]">
      <aside className="min-w-0 max-w-full rounded-xl border border-line bg-white p-3 sm:p-5 lg:sticky lg:top-24">
        <h2 className="mb-3 text-xl font-extrabold sm:mb-5 sm:text-2xl">Minha área</h2>
        <nav className="flex max-w-full gap-2 overflow-x-auto lg:flex-col">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 font-bold ${isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-canvas'}`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}
