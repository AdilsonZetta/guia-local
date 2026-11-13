import { Flag, Heart, Star, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const ITEMS = [
  { to: '/morador/favoritos', label: 'Meus favoritos', icon: Heart },
  { to: '/morador/avaliacoes', label: 'Minhas avaliações', icon: Star },
  { to: '/morador/indicar', label: 'Indicar empresa', icon: Flag },
  { to: '/morador/conta', label: 'Minha conta', icon: UserRound },
]

export function ResidentShell() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-ink">Área do morador</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-muted',
                isActive && 'border-brand bg-brand-soft text-brand-dark',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
