import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import { profileCompleteness } from '@/lib/utils'
import { PageContent } from '@/components/PageContent'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  checked,
  businessRows,
  useAction,
  publicUrl,
  share,
} from '@/lib/management'
import {
  BusinessGate,
  ResourceState,
  Feedback,
  Metrics,
  ActivityChart,
  Toggle,
} from '@/components/Management'

export function BusinessDashboardPage() {
  return (
    <BusinessGate>
      <Dashboard />
    </BusinessGate>
  )
}
function Dashboard() {
  const { business: b, refreshProfile } = useAuth()
  const action = useAction()
  const resource = useResource(async () => {
    const since = new Date()
    since.setDate(since.getDate() - 29)
    since.setHours(0, 0, 0, 0)
    const [visits, clicks, stats, services, photos, hours, settings] =
      await Promise.all([
        businessRows('profile_visits', b!.id, since.toISOString()),
        checked(
          supabase
            .from('whatsapp_clicks')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', b!.id)
            .gte('created_at', since.toISOString())
            .then((r) => ({ ...r, data: r.count ?? 0 })),
        ),
        checked(
          supabase
            .from('business_stats')
            .select('*')
            .eq('business_id', b!.id)
            .maybeSingle(),
        ),
        checked(
          supabase
            .from('services')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', b!.id)
            .then((r) => ({ ...r, data: r.count ?? 0 })),
        ),
        checked(
          supabase
            .from('business_photos')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', b!.id)
            .then((r) => ({ ...r, data: r.count ?? 0 })),
        ),
        checked(
          supabase
            .from('business_hours')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', b!.id)
            .then((r) => ({ ...r, data: r.count ?? 0 })),
        ),
        checked(supabase.from('site_settings').select('*').single()),
      ])
    return { visits, clicks, stats, services, photos, hours, settings }
  }, [b?.id])
  const d = resource.data
  const completeness =
    b && d
      ? profileCompleteness({
          ...b,
          servicesCount: d.services,
          photosCount: d.photos,
          hoursCount: d.hours,
        })
      : 0
  return (
    <PageContent title="Meu painel">
      <Feedback action={action} />
      <ResourceState resource={resource}>
        {d && b && (
          <>
            <Metrics
              items={[
                ['Visitas nos últimos 30 dias', d.visits.length],
                ['Cliques no WhatsApp', d.clicks],
                [
                  `Nota média (${d.stats?.review_count ?? 0} avaliações)`,
                  Number(d.stats?.avg_rating ?? 0).toFixed(1),
                ],
                ['Aguardando resposta', d.stats?.awaiting_reply_count ?? 0],
              ]}
            />
            <Toggle
              label="Recebendo pedidos"
              checked={b.receiving_orders}
              disabled={action.busy}
              onChange={(value) =>
                void action.run(async () => {
                  const date = new Date()
                  date.setDate(
                    date.getDate() + d.settings.availability_validity_days,
                  )
                  await checked(
                    supabase
                      .from('businesses')
                      .update({
                        receiving_orders: value,
                        ...(value
                          ? {
                              receiving_orders_until:
                                date.toLocaleDateString('en-CA'),
                            }
                          : {}),
                      })
                      .eq('id', b.id),
                  )
                  await refreshProfile()
                })
              }
            />
            <h2 className="font-bold">Visitas por dia</h2>
            <ActivityChart rows={d.visits} />
            <Card className="p-5 space-y-3">
              <p>Completude do perfil: {completeness}%</p>
              <progress
                aria-label="Completude do perfil"
                className="w-full accent-brand"
                value={completeness}
                max={100}
              />
              <Button
                onClick={() =>
                  void action.run(() =>
                    share(publicUrl(`/empresa/${b.slug}`), b.name),
                  )
                }
              >
                Compartilhar perfil
              </Button>
            </Card>
          </>
        )}
      </ResourceState>
    </PageContent>
  )
}
