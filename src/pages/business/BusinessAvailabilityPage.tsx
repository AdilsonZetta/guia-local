import { useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { WEEKDAYS } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'
import { PageContent } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { checked, useAction } from '@/lib/management'
import {
  BusinessGate,
  ResourceState,
  Feedback,
  Toggle,
} from '@/components/Management'

export function BusinessAvailabilityPage() {
  return (
    <BusinessGate>
      <Availability />
    </BusinessGate>
  )
}
function Availability() {
  const { business: b } = useAuth()
  const resource = useResource(async () => {
    const [hours, areas, neighborhoods, settings] = await Promise.all([
      checked(
        supabase.from('business_hours').select('*').eq('business_id', b!.id),
      ),
      checked(
        supabase
          .from('business_service_areas')
          .select('*')
          .eq('business_id', b!.id),
      ),
      checked(supabase.from('neighborhoods').select('*').order('sort_order')),
      checked(supabase.from('site_settings').select('*').single()),
    ])
    return { hours, areas, neighborhoods, settings }
  }, [b?.id])
  return (
    <PageContent title="Disponibilidade">
      <ResourceState resource={resource}>
        {resource.data && (
          <AvailabilityForm
            key={b!.id}
            data={resource.data}
            reload={resource.reload}
          />
        )}
      </ResourceState>
    </PageContent>
  )
}

type AvailabilityData = {
  hours: Tables<'business_hours'>[]
  areas: Tables<'business_service_areas'>[]
  neighborhoods: Tables<'neighborhoods'>[]
  settings: Tables<'site_settings'>
}
function AvailabilityForm({
  data,
  reload,
}: {
  data: AvailabilityData
  reload: () => void
}) {
  const { business: b, refreshProfile } = useAuth()
  const action = useAction()
  const [receiving, setReceiving] = useState(b!.receiving_orders)
  const [until, setUntil] = useState(b!.receiving_orders_until ?? '')
  const [hours, setHours] = useState<Omit<Tables<'business_hours'>, 'id'>[]>(
    WEEKDAYS.map((day) =>
      (() => {
        const existing = data.hours.find((h) => h.weekday === day.value)
        return existing
          ? {
              ...existing,
              open_time: existing.open_time?.slice(0, 5) ?? null,
              close_time: existing.close_time?.slice(0, 5) ?? null,
            }
          : {
              business_id: b!.id,
              weekday: day.value,
              is_closed: true,
              open_time: '08:00',
              close_time: '18:00',
            }
      })(),
    ),
  )
  const [areas, setAreas] = useState(data.areas.map((a) => a.neighborhood_id))
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        void action.run(async () => {
          if (receiving && !until)
            throw new Error('Informe a validade da disponibilidade.')
          for (const h of hours)
            if (
              !h.is_closed &&
              (!h.open_time || !h.close_time || h.open_time >= h.close_time)
            )
              throw new Error(
                'Confira os horários: a abertura deve ocorrer antes do fechamento.',
              )
          await checked(
            supabase
              .from('businesses')
              .update({
                receiving_orders: receiving,
                receiving_orders_until: until || null,
              })
              .eq('id', b!.id),
          )
          await checked(
            supabase.from('business_hours').upsert(
              hours.map((h) => ({
                business_id: b!.id,
                weekday: h.weekday,
                is_closed: h.is_closed,
                open_time: h.is_closed ? null : h.open_time,
                close_time: h.is_closed ? null : h.close_time,
              })),
              { onConflict: 'business_id,weekday' },
            ),
          )
          const removed = data.areas.filter(
            (a) => !areas.includes(a.neighborhood_id),
          )
          for (const area of removed)
            await checked(
              supabase
                .from('business_service_areas')
                .delete()
                .eq('business_id', b!.id)
                .eq('neighborhood_id', area.neighborhood_id),
            )
          const added = areas.filter(
            (id) => !data.areas.some((a) => a.neighborhood_id === id),
          )
          if (added.length)
            await checked(
              supabase.from('business_service_areas').upsert(
                added.map((id) => ({
                  business_id: b!.id,
                  neighborhood_id: id,
                })),
                { onConflict: 'business_id,neighborhood_id' },
              ),
            )
          await refreshProfile()
          reload()
        })
      }}
    >
      <Feedback action={action} />
      <Card className="p-5">
        <Toggle
          label="Recebendo pedidos"
          checked={receiving}
          onChange={(v) => {
            setReceiving(v)
            if (v) {
              const date = new Date()
              date.setDate(
                date.getDate() + data.settings.availability_validity_days,
              )
              setUntil(date.toLocaleDateString('en-CA'))
            }
          }}
        />
        <Field label="Disponível até">
          <Input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            required={receiving}
          />
        </Field>
      </Card>
      <Card className="p-5 space-y-4">
        <h2 className="font-bold">Horários da semana</h2>
        {hours.map((h, i) => {
          function change(patch: Partial<Tables<'business_hours'>>) {
            setHours((rows) =>
              rows.map((row, j) => (j === i ? { ...row, ...patch } : row)),
            )
          }
          return (
            <div
              key={h.weekday}
              className="grid gap-3 border-b border-line pb-3 sm:grid-cols-4"
            >
              <p className="font-semibold">{WEEKDAYS[i]!.label}</p>
              <Toggle
                label="Fechado"
                checked={h.is_closed}
                onChange={(v) =>
                  change({
                    is_closed: v,
                    open_time: h.open_time || '08:00',
                    close_time: h.close_time || '18:00',
                  })
                }
              />
              <Field label="Abre às">
                <Input
                  type="time"
                  disabled={h.is_closed}
                  required={!h.is_closed}
                  value={h.open_time ?? ''}
                  onChange={(e) => change({ open_time: e.target.value })}
                />
              </Field>
              <Field label="Fecha às">
                <Input
                  type="time"
                  disabled={h.is_closed}
                  required={!h.is_closed}
                  value={h.close_time ?? ''}
                  onChange={(e) => change({ close_time: e.target.value })}
                />
              </Field>
            </div>
          )
        })}
      </Card>
      <Card className="p-5">
        <h2 className="font-bold">Bairros atendidos</h2>
        <div className="grid sm:grid-cols-2">
          {data.neighborhoods.map((n) => (
            <Toggle
              key={n.id}
              label={n.name + (!n.active ? ' (inativo)' : '')}
              checked={areas.includes(n.id)}
              onChange={(v) =>
                setAreas(
                  v ? [...areas, n.id] : areas.filter((id) => id !== n.id),
                )
              }
            />
          ))}
        </div>
      </Card>
      <Button type="submit" disabled={action.busy}>
        Salvar disponibilidade
      </Button>
    </form>
  )
}
