import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
export function PageContent({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:py-12">
      <div>
        <h1 className="text-3xl font-extrabold text-ink">{title}</h1>
        {description && <p className="mt-2 text-muted">{description}</p>}
      </div>
      {children}
    </div>
  )
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode
  error?: boolean
}) {
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`rounded-xl p-4 text-sm ${error ? 'bg-brand-soft text-danger' : 'bg-brand-soft text-brand-dark'}`}
    >
      {children}
    </div>
  )
}
export function LoadError({
  message,
  retry,
}: {
  message: string
  retry: () => void
}) {
  return (
    <Card className="space-y-4 p-6">
      <Notice error>{message}</Notice>
      <Button variant="outline" onClick={retry}>
        Tentar novamente
      </Button>
    </Card>
  )
}
export function EmptyState({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <Card className="space-y-3 p-8 text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="text-muted">{children}</div>
    </Card>
  )
}
export function MissingBusiness() {
  return (
    <PageContent title="Empresa não encontrada">
      <EmptyState title="Este perfil não está disponível">
        <p className="mb-4">
          A empresa pode estar pausada ou aguardando aprovação.
        </p>
        <Link className="font-bold text-brand" to="/busca">
          Explorar empresas
        </Link>
      </EmptyState>
    </PageContent>
  )
}
