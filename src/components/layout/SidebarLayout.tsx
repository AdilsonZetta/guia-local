import { MapPin, Menu, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { cn } from '@/lib/utils'

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
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-brand-soft hover:text-brand-dark',
              isActive && 'bg-brand-soft text-brand-dark',
            )
          }
        >
          <span className="flex items-center gap-2">
            {item.icon}
            {item.label}
          </span>
          {item.badge ? (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] text-white">{item.badge}</span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-svh bg-canvas md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-line bg-white md:flex md:flex-col">
        <Link to={homeTo} className="flex items-center gap-2 px-5 py-5 font-extrabold text-brand">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
            <MapPin className="h-5 w-5" />
          </span>
          {title}
        </Link>
        {nav}
        <div className="border-t border-line p-4 text-sm">
          <p className="font-semibold text-ink">{profile?.full_name}</p>
          <p className="text-xs text-muted">{profile?.email}</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link to="/" className="text-brand">
              Ver site público
            </Link>
            <button className="text-left text-muted hover:text-ink" onClick={() => signOut()}>
              Sair
            </button>
          </div>
        </div>
      </aside>
      <div className="flex min-h-svh flex-col">
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <span className="font-extrabold text-brand">{title}</span>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </header>
        {open && <div className="border-b border-line bg-white md:hidden">{nav}</div>}
        <div className="flex-1 p-4 md:p-8" key={location.pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
