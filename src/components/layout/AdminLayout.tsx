import {
  Building2,
  Flag,
  LayoutDashboard,
  Search,
  Settings,
  Shield,
  Tags,
  Users,
} from 'lucide-react'
import { SidebarLayout } from './SidebarLayout'

export function AdminLayout() {
  return (
    <SidebarLayout
      title="Admin"
      homeTo="/admin"
      items={[
        { to: '/admin', label: 'Visão geral', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
        { to: '/admin/empresas', label: 'Empresas e prestadores', icon: <Building2 className="h-4 w-4" /> },
        { to: '/admin/indicacoes', label: 'Indicações de empresas', icon: <Flag className="h-4 w-4" /> },
        { to: '/admin/moderacao', label: 'Moderação de avaliações', icon: <Shield className="h-4 w-4" /> },
        { to: '/admin/buscas', label: 'Buscas e contatos', icon: <Search className="h-4 w-4" /> },
        { to: '/admin/categorias', label: 'Categorias', icon: <Tags className="h-4 w-4" /> },
        { to: '/admin/usuarios', label: 'Usuários', icon: <Users className="h-4 w-4" /> },
        { to: '/admin/configuracoes', label: 'Configurações', icon: <Settings className="h-4 w-4" /> },
      ]}
    />
  )
}
