import {
  BadgeCheck,
  CalendarClock,
  LayoutDashboard,
  Link2,
  Megaphone,
  Settings,
  Star,
  UserRound,
} from 'lucide-react'
import { SidebarLayout } from './SidebarLayout'

export function BusinessLayout() {
  return (
    <SidebarLayout
      title="Área da empresa"
      homeTo="/empresa-area/painel"
      items={[
        { to: '/empresa-area/painel', label: 'Meu painel', icon: <LayoutDashboard className="h-4 w-4" /> },
        { to: '/empresa-area/perfil', label: 'Meu perfil', icon: <UserRound className="h-4 w-4" /> },
        { to: '/empresa-area/servicos', label: 'Serviços e fotos', icon: <BadgeCheck className="h-4 w-4" /> },
        { to: '/empresa-area/avaliacoes', label: 'Avaliações', icon: <Star className="h-4 w-4" /> },
        { to: '/empresa-area/disponibilidade', label: 'Disponibilidade', icon: <CalendarClock className="h-4 w-4" /> },
        { to: '/empresa-area/link', label: 'Link na bio', icon: <Link2 className="h-4 w-4" /> },
        { to: '/empresa-area/divulgacao', label: 'Divulgação', icon: <Megaphone className="h-4 w-4" /> },
        { to: '/empresa-area/configuracoes', label: 'Configurações', icon: <Settings className="h-4 w-4" /> },
      ]}
    />
  )
}
