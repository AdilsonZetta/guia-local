import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { Spinner } from './ui/Spinner'

export function RequireAuth({
  children,
  role,
}: {
  children: ReactNode
  role?: 'admin' | 'business'
}) {
  const { user, profile, isAdmin, isBusiness, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (profile?.status === 'suspended') {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold">Conta suspensa</h1>
        <p className="mt-2 text-muted">{profile.suspension_reason || 'Entre em contato com o suporte do Guia Local.'}</p>
      </div>
    )
  }
  if (role === 'admin' && !isAdmin) return <Navigate to="/" replace />
  if (role === 'business' && !isBusiness && !isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
