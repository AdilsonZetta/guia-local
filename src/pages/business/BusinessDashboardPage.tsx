import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import { profileCompleteness } from '@/lib/utils'
import { PageContent } from '@/components/PageContent'
import { Button } from '@/components/ui/Button'
import { checked, businessRows, useAction, publicUrl } from '@/lib/management'
import {
  BusinessGate,
  ResourceState,
  Feedback,
  Metrics,
  ActivityChart,
  Toggle,
  PeriodFilter,
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
  const [days, setDays] = useState(30)
  const action = useAction()
  const resource = useResource(async () => {
    const since = new Date()
    since.setDate(since.getDate() - days + 1)
    since.setHours(0, 0, 0, 0)
    const [visits, clicks, services, photos, hours, settings, reviews] =
      await Promise.all([
        businessRows('profile_visits', b!.id, since.toISOString()),
        checked(
          supabase
            .from('whatsapp_clicks')
            .select('*')
            .eq('business_id', b!.id)
            .gte('created_at', since.toISOString()),
        ),
        businessRows('services', b!.id),
        businessRows('business_photos', b!.id),
        checked(
          supabase.from('business_hours').select('*').eq('business_id', b!.id),
        ),
        checked(supabase.from('site_settings').select('*').single()),
        checked(
          supabase
            .from('reviews')
            .select('*')
            .eq('business_id', b!.id)
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .gte('created_at', since.toISOString()),
        ),
      ])
    const profiles = reviews.length
      ? await checked(
          supabase
            .from('public_profiles')
            .select('*')
            .in(
              'id',
              reviews.map((r) => r.user_id),
            ),
        )
      : []
    return {
      visits,
      clicks,
      stats: {
        review_count: reviews.length,
        avg_rating: reviews.length
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0,
        awaiting_reply_count: reviews.filter((r) => !r.reply_text).length,
      },
      services,
      photos,
      hours,
      settings,
      reviews,
      profiles,
    }
  }, [b?.id, days])
  const d = resource.data
  const complete =
    b && d
      ? profileCompleteness({
          ...b,
          servicesCount: d.services.length,
          photosCount: d.photos.length,
          hoursCount: d.hours.length,
        })
      : 0
  return (
    <PageContent
      title="Meu negócio"
      description="Seu perfil, suas avaliações e novas oportunidades em um só lugar."
    >
      <div className="management-actions">
        <PeriodFilter days={days} onChange={setDays} />
        <Link className="btn-outline" to={`/empresa/${b!.slug}`}>
          Ver perfil público
        </Link>
        <Link className="btn-primary" to="/empresa-area/perfil">
          Editar meu perfil
        </Link>
      </div>
      <Feedback action={action} />
      <ResourceState resource={resource}>
        {d && b && (
          <>
            <Metrics
              items={[
                ['Visitas ao perfil', d.visits.length],
                ['Cliques no WhatsApp', d.clicks.length],
                [
                  `Nota média · ${d.stats?.review_count ?? 0} avaliações`,
                  Number(d.stats?.avg_rating ?? 0)
                    .toFixed(1)
                    .replace('.', ','),
                ],
                ['Aguardando resposta', d.stats?.awaiting_reply_count ?? 0],
              ]}
            />
            <div className="management-grid">
              <div className="space-y-5">
                <section className="management-section">
                  <h2>Visibilidade do seu perfil</h2>
                  <ActivityChart
                    rows={d.visits}
                    clicks={d.clicks}
                    days={days}
                  />
                </section>
                <section className="management-section">
                  <div className="flex justify-between">
                    <h2>Avaliações recentes</h2>
                    <Link className="text-brand" to="/empresa-area/avaliacoes">
                      Ver todas →
                    </Link>
                  </div>
                  {d.reviews.slice(0, 2).map((r) => (
                    <div
                      className="flex items-center gap-5 border-t border-line py-4 mt-3"
                      key={r.id}
                    >
                      <span className="avatar">
                        {d.profiles
                          .find((p) => p.id === r.user_id)
                          ?.full_name?.slice(0, 2)
                          .toUpperCase() || 'CL'}
                      </span>
                      <div className="flex-1">
                        <strong>
                          {d.profiles.find((p) => p.id === r.user_id)
                            ?.full_name || 'Cliente'}
                        </strong>
                        <span className="ml-4 text-amber-500">
                          {'★'.repeat(r.rating)}
                        </span>
                        <p className="mt-1 text-sm text-muted">{r.body}</p>
                      </div>
                      <Link
                        className="btn-outline text-sm"
                        to="/empresa-area/avaliacoes"
                      >
                        Responder
                      </Link>
                    </div>
                  ))}
                  {!d.reviews.length && (
                    <p className="mt-4 text-muted">
                      Seu negócio ainda não recebeu avaliações.
                    </p>
                  )}
                </section>
              </div>
              <div className="space-y-4">
                <section className="management-section space-y-4">
                  <h2>Disponibilidade</h2>
                  <Toggle
                    label="Recebendo novos pedidos"
                    checked={b.receiving_orders}
                    disabled={action.busy}
                    onChange={(value) =>
                      void action.run(async () => {
                        const date = new Date()
                        date.setDate(
                          date.getDate() +
                            d.settings.availability_validity_days,
                        )
                        await checked(
                          supabase
                            .from('businesses')
                            .update({
                              receiving_orders: value,
                              receiving_orders_until:
                                date.toLocaleDateString('en-CA'),
                            })
                            .eq('id', b.id),
                        )
                        await refreshProfile()
                      })
                    }
                  />
                  <p className="text-sm text-muted">
                    {b.receiving_orders_until
                      ? `Válido até ${new Date(b.receiving_orders_until + 'T12:00:00').toLocaleDateString('pt-BR')}`
                      : 'Confirme sua disponibilidade.'}
                  </p>
                  <Link
                    className="btn-outline w-full"
                    to="/empresa-area/disponibilidade"
                  >
                    Atualizar disponibilidade
                  </Link>
                </section>
                <section className="management-section space-y-3">
                  <h2>Seu perfil está {complete}% completo</h2>
                  <progress
                    className="h-3 w-full accent-brand"
                    value={complete}
                    max={100}
                  />
                  <p className="text-sm text-muted">
                    Adicione fotos dos seus trabalhos.
                  </p>
                  <Link
                    className="btn-outline w-full"
                    to="/empresa-area/perfil"
                  >
                    Completar perfil
                  </Link>
                </section>
                <section className="management-section space-y-4">
                  <h2>Divulgue seu negócio</h2>
                  <p className="text-sm text-muted">
                    Compartilhe seu perfil e convide clientes a avaliar.
                  </p>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() =>
                      void action.run(() =>
                        navigator.clipboard.writeText(
                          publicUrl(`/empresa/${b.slug}`),
                        ),
                      )
                    }
                  >
                    Copiar link do perfil
                  </Button>
                  <div id="dashboard-qr" className="hidden">
                    <QRCodeCanvas
                      value={publicUrl(`/empresa/${b.slug}/avaliar`)}
                      size={512}
                      marginSize={4}
                    />
                  </div>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() =>
                      void action.run(async () => {
                        const canvas =
                          document.querySelector<HTMLCanvasElement>(
                            '#dashboard-qr canvas',
                          )
                        if (!canvas) throw new Error('QR Code indisponível.')
                        const a = document.createElement('a')
                        a.href = canvas.toDataURL()
                        a.download = `${b.slug}-qr.png`
                        a.click()
                      })
                    }
                  >
                    Baixar QR Code
                  </Button>
                </section>
              </div>
            </div>
            <p className="text-xs text-muted">
              ⓘ Cliques indicam intenção de contato. Não representam vendas
              confirmadas.
            </p>
          </>
        )}
      </ResourceState>
    </PageContent>
  )
}
