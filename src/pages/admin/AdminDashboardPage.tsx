import { Link } from 'react-router-dom'
import { useResource } from '@/lib/public-data'
import { all } from '@/lib/management'
import {
  ActivityChart,
  Metrics,
  ResourceState,
  Status,
} from '@/components/Management'

import { PageContent } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
export function AdminDashboardPage() {
  const resource = useResource(async () => {
    const [businesses, reviews, suggestions, searches, clicks, activity] =
      await Promise.all([
        all('businesses'),
        all('reviews'),
        all('suggestions'),
        all('searches'),
        all('whatsapp_clicks'),
        all('activity_log'),
      ])
    const since = Date.now() - 7 * 86400000
    return {
      businesses,
      reviews,
      suggestions,
      searches: searches.filter((r) => Date.parse(r.created_at) >= since),
      clicks: clicks.filter((r) => Date.parse(r.created_at) >= since),
      activity,
    }
  })
  const d = resource.data
  return (
    <PageContent title="Visão geral">
      <ResourceState resource={resource}>
        {d && (
          <>
            <Metrics
              items={[
                [
                  'Empresas ativas',
                  d.businesses.filter(
                    (b) => b.status === 'active' && !b.is_paused,
                  ).length,
                ],
                [
                  'Empresas pendentes',
                  d.businesses.filter((b) => b.status === 'pending').length,
                ],
                [
                  'Avaliações pendentes e sinalizadas',
                  d.reviews.filter((r) =>
                    ['pending', 'flagged'].includes(r.status),
                  ).length,
                ],
                [
                  'Indicações pendentes',
                  d.suggestions.filter((s) => s.status === 'pending').length,
                ],
                ['Buscas nos últimos 7 dias', d.searches.length],
                ['Cliques no WhatsApp em 7 dias', d.clicks.length],
              ]}
            />
            <h2 className="text-lg font-bold">Atividade nos últimos 30 dias</h2>
            <ActivityChart rows={d.activity} />
            <Card className="p-5 space-y-3">
              <h2 className="text-lg font-bold">Precisa de atenção</h2>
              <Link
                className="block text-brand font-bold"
                to="/admin/empresas?status=pending"
              >
                {d.businesses.filter((b) => b.status === 'pending').length}{' '}
                empresas aguardando análise →
              </Link>
              <Link
                className="block text-brand font-bold"
                to="/admin/moderacao"
              >
                {d.reviews.filter((r) => r.status === 'flagged').length}{' '}
                avaliações sinalizadas →
              </Link>
              <Link
                className="block text-brand font-bold"
                to="/admin/indicacoes"
              >
                {d.suggestions.filter((s) => s.status === 'pending').length}{' '}
                indicações pendentes →
              </Link>
            </Card>
            <Card className="p-5 space-y-3">
              <h2 className="text-lg font-bold">Cadastros recentes</h2>
              {[...d.businesses]
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .slice(0, 8)
                .map((b) => (
                  <div
                    className="flex flex-wrap justify-between gap-2 border-b border-line py-2"
                    key={b.id}
                  >
                    <Link
                      className="font-semibold text-brand"
                      to={`/admin/empresas?id=${b.id}`}
                    >
                      {b.name}
                    </Link>
                    <span>
                      {new Date(b.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <Status value={b.status} />
                  </div>
                ))}
            </Card>
          </>
        )}
      </ResourceState>
    </PageContent>
  )
}
