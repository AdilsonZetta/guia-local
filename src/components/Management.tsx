import { useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { BusinessRegistrationForm } from '@/components/forms/BusinessRegistrationForm'
import { PageContent, Notice, LoadError } from '@/components/PageContent'
import { Spinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { Input, Field } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { useAction } from '@/lib/management'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
export function Feedback({ action }: { action: ReturnType<typeof useAction> }) {
  return action.message ? (
    <Notice error={action.error}>{action.message}</Notice>
  ) : null
}

export function BusinessGate({ children }: { children: ReactNode }) {
  const { business, loading } = useAuth()
  if (loading) return <Spinner />
  if (!business)
    return (
      <PageContent title="Cadastre seu negócio">
        <Card className="p-6">
          <BusinessRegistrationForm onComplete={() => {}} />
        </Card>
      </PageContent>
    )
  return children
}

export function ResourceState({
  resource,
  children,
}: {
  resource: {
    loading: boolean
    error: string
    reload: () => void
    data?: unknown
  }
  children: ReactNode
}) {
  if (resource.loading && !resource.data) return <Spinner />
  if (resource.error)
    return <LoadError message={resource.error} retry={resource.reload} />
  return children
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string | number | null | undefined
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <Field label={label}>
      <Input
        aria-label={label}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </Field>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center gap-3 py-2 text-sm text-ink">
      <input
        type="checkbox"
        className="accent-brand h-5 w-5"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}
const labels: Record<string, string> = {
  pending: 'Pendente',
  active: 'Ativo',
  archived: 'Arquivado',
  rejected: 'Rejeitado',
  adjustments_requested: 'Ajustes solicitados',
  adjustment_requested: 'Ajuste solicitado',
  published: 'Publicada',
  removed: 'Removida',
  flagged: 'Sinalizada',
  registration_created: 'Cadastro criado',
  suspended: 'Suspenso',
  admin: 'Administrador',
  business: 'Empresa',
  client: 'Morador',
}

export function Status({ value }: { value: string }) {
  return (
    <Badge
      tone={['active', 'published'].includes(value) ? 'success' : 'neutral'}
    >
      {labels[value] ?? value}
    </Badge>
  )
}

export function Metrics({ items }: { items: [string, string | number][] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <Card key={label} className="p-5">
          <p className="text-sm text-muted">{label}</p>
          <p className="text-3xl font-bold text-brand-dark">{value}</p>
        </Card>
      ))}
    </div>
  )
}

export function ActivityChart({
  rows,
  days = 30,
}: {
  rows: { created_at: string }[]
  days?: number
}) {
  const [today] = useState(() => new Date())
  const data = Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    const key = d.toLocaleDateString('en-CA')
    return {
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      total: rows.filter(
        (r) => new Date(r.created_at).toLocaleDateString('en-CA') === key,
      ).length,
    }
  })
  return (
    <Card className="p-4">
      <div className="h-64" role="img" aria-label="Gráfico de atividade diária">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" name="Quantidade" fill="#0F7B5A" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function Reorder({
  index,
  total,
  onMove,
  disabled,
}: {
  index: number
  total: number
  onMove: (direction: number) => void
  disabled?: boolean
}) {
  return (
    <span className="inline-flex gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Mover para cima"
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
      >
        ↑
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Mover para baixo"
        disabled={disabled || index === total - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </Button>
    </span>
  )
}
