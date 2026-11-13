import { BarChart3, MessageCircle, Star, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
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
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
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
        role="switch"
        className="management-switch"
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
      tone={
        ['active', 'published'].includes(value)
          ? 'success'
          : [
                'pending',
                'flagged',
                'adjustments_requested',
                'adjustment_requested',
              ].includes(value)
            ? 'warning'
            : ['removed', 'suspended', 'rejected'].includes(value)
              ? 'danger'
              : 'neutral'
      }
    >
      {labels[value] ?? value}
    </Badge>
  )
}

function AnimatedMetric({ value }: { value: string | number }) {
  const reduced = useReducedMotion()
  const numeric = typeof value === 'number' && Number.isFinite(value)
  const [frame, setFrame] = useState<{ value: number; progress: number } | null>(null)
  useEffect(() => {
    if (!numeric || reduced) return
    let id = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 700, 1)
      setFrame({ value, progress: 1 - (1 - progress) ** 3 })
      if (progress < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [value, numeric, reduced])
  const displayed = numeric && !reduced && frame?.value === value
    ? Math.round(value * frame.progress * (Number.isInteger(value) ? 1 : 10)) / (Number.isInteger(value) ? 1 : 10)
    : value
  return <span className="metric-number" aria-label={String(value)}><span aria-hidden="true">{displayed}</span></span>
}

export function Metrics({ items }: { items: [string, string | number][] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value]) => (
        <Card key={label} className="management-metric p-5">
          <span className="metric-icon">
            {(() => {
              const Icon = [BarChart3, MessageCircle, Star, Users][
                items.findIndex((item) => item[0] === label) % 4
              ]!
              return <Icon size={30} />
            })()}
          </span>
          <div>
            <p className="text-sm text-muted">{label.split(' · ')[0]}</p>
            <p className="text-3xl font-bold text-ink"><AnimatedMetric value={value} /></p>
            {label.includes(' · ') && (
              <p className="text-sm text-muted">{label.split(' · ')[1]}</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

export function ActivityChart({
  rows,
  days = 30,
  clicks = [],
}: {
  rows: { created_at: string }[]
  days?: number
  clicks?: { created_at: string }[]
}) {
  const reduced = useReducedMotion()
  const [today] = useState(() => new Date())
  const data = Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    const key = d.toLocaleDateString('en-CA')
    return {
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      clicks: clicks.filter(
        (r) => new Date(r.created_at).toLocaleDateString('en-CA') === key,
      ).length,
      total: rows.filter(
        (r) => new Date(r.created_at).toLocaleDateString('en-CA') === key,
      ).length,
    }
  })
  return (
    <div className="pt-3">
      <div className="h-64" role="img" aria-label="Gráfico de atividade diária">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0F7B5A" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#0F7B5A" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A37A" stopOpacity={0.42} />
                <stop offset="100%" stopColor="#16A37A" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ffffff80" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              minTickGap={50}
              tick={{ fontSize: 12, fill: '#53627d' }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              width={38}
              tick={{ fontSize: 12, fill: '#53627d' }}
            />
            <Tooltip />
            <Legend
              verticalAlign="top"
              align="right"
              height={40}
              iconType="circle"
            />
            <Area
              type="monotone"
              isAnimationActive={!reduced}
              animationDuration={550}
              animationEasing="ease-out"
              dataKey="total"
              name="Visitas"
              dot={days <= 30 ? { r: 3, strokeWidth: 0 } : false}
              stroke="#0F7B5A"
              fill="url(#fillVisits)"
              fillOpacity={1}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              isAnimationActive={!reduced}
              animationDuration={550}
              animationEasing="ease-out"
              dataKey="clicks"
              name="Cliques no WhatsApp"
              dot={days <= 30 ? { r: 3, strokeWidth: 0 } : false}
              stroke="#16A37A"
              fill="url(#fillClicks)"
              fillOpacity={1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
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

export function PeriodFilter({
  days,
  onChange,
}: {
  days: number
  onChange: (days: number) => void
}) {
  return (
    <select
      aria-label="Período"
      className="rounded-lg border border-line bg-white px-4 py-3 text-sm"
      value={days}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {[7, 30, 90].map((n) => (
        <option key={n} value={n}>
          Últimos {n} dias
        </option>
      ))}
    </select>
  )
}
