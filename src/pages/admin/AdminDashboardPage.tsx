import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useResource } from '@/lib/public-data'
import { all } from '@/lib/management'
import {
  ActivityChart,
  Metrics,
  ResourceState,
  Status,
  PeriodFilter,
} from '@/components/Management'
import { PageContent } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
export function AdminDashboardPage() {
  const [days, setDays] = useState(30)
  const resource = useResource(async () => {
    const [
      businesses,
      profiles,
      reviews,
      clicks,
      visits,
      categories,
      neighborhoods,
    ] = await Promise.all([
      all('businesses'),
      all('profiles'),
      all('reviews'),
      all('whatsapp_clicks'),
      all('profile_visits'),
      all('categories'),
      all('neighborhoods'),
    ])
    return {
      businesses,
      profiles,
      reviews,
      clicks,
      visits,
      categories,
      neighborhoods,
    }
  })
  const d = resource.data
  const [today] = useState(() => new Date())
  const since = new Date(today)
  since.setDate(since.getDate() - days + 1)
  since.setHours(0, 0, 0, 0)
  const inPeriod = (r: { created_at: string }) =>
    Date.parse(r.created_at) >= since.getTime()
  return (
    <PageContent
      title="Visão geral"
      description="Acompanhe os negócios e a atividade da sua cidade."
    >
      <div className="management-actions">
        <PeriodFilter days={days} onChange={setDays} />
        <Link className="btn-outline" to="/">
          Ver site
        </Link>
      </div>
      <ResourceState resource={resource}>
        {d && (
          <>
            <Metrics
              items={[
                ['Empresas cadastradas', d.businesses.filter(inPeriod).length],
                ['Usuários cadastrados', d.profiles.filter(inPeriod).length],
                ['Cliques no WhatsApp', d.clicks.filter(inPeriod).length],
                [
                  'Avaliações publicadas',
                  d.reviews
                    .filter((r) => r.status === 'published')
                    .filter(inPeriod).length,
                ],
              ]}
            />
            <div className="management-grid">
              <section className="management-section">
                <h2>Atividade da plataforma</h2>
                <ActivityChart
                  rows={d.visits.filter(inPeriod)}
                  clicks={d.clicks.filter(inPeriod)}
                  days={days}
                />
              </section>
              <section className="management-section space-y-5">
                <h2>Precisa da sua atenção</h2>
                <div className="rounded-xl bg-orange-50 p-5">
                  <strong className="text-3xl">
                    {d.businesses.filter((b) => b.status === 'pending').length}
                  </strong>
                  <p className="mb-3 text-muted">cadastros pendentes</p>
                  <Link
                    className="text-brand font-bold"
                    to="/admin/empresas?status=pending"
                  >
                    Analisar cadastros →
                  </Link>
                </div>
                <div className="rounded-xl bg-brand-soft p-5">
                  <strong className="text-3xl">
                    {d.reviews.filter((r) => r.status === 'flagged').length}
                  </strong>
                  <p className="mb-3 text-muted">avaliações sinalizadas</p>
                  <Link className="text-brand font-bold" to="/admin/avaliacoes">
                    Revisar avaliações →
                  </Link>
                </div>
              </section>
            </div>
            <Card className="p-5 overflow-x-auto">
              <div className="flex justify-between mb-5">
                <h2>Cadastros recentes</h2>
                <Link className="text-brand" to="/admin/empresas">
                  Ver todos →
                </Link>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="p-3">Negócio</th>
                    <th>Categoria</th>
                    <th>Região</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {d.businesses
                    .slice()
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .slice(0, 6)
                    .map((b) => (
                      <tr key={b.id} className="border-b border-line">
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-brand-soft text-xl text-brand">
                              {b.logo_url ? (
                                <img
                                  src={b.logo_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                b.name[0]
                              )}
                            </span>
                            <div>
                              <strong>{b.name}</strong>
                              <p className="text-xs text-muted max-w-60 truncate">
                                {b.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {d.categories.find((c) => c.id === b.category_id)
                            ?.name || '—'}
                        </td>
                        <td>
                          {d.neighborhoods.find(
                            (n) => n.id === b.neighborhood_id,
                          )?.name || '—'}
                        </td>
                        <td>
                          <Status value={b.status} />
                        </td>
                        <td>
                          <Link
                            className="text-brand font-bold"
                            to={`/admin/empresas?id=${b.id}`}
                          >
                            {b.status === 'pending' ? 'Analisar' : 'Ver perfil'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </ResourceState>
    </PageContent>
  )
}
