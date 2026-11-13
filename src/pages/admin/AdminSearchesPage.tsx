import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useResource } from '@/lib/public-data'
import { all, csv } from '@/lib/management'
import { ResourceState, Metrics, PeriodFilter } from '@/components/Management'

import { PageContent } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
function group(values: string[]) {
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])
}
const sources: Record<string, string> = {
  search: 'Busca',
  profile: 'Perfil',
  link_in_bio: 'Link na bio',
  home: 'Página inicial',
  favorites: 'Favoritos',
  instagram: 'Instagram',
  google: 'Google',
  direct: 'Direto',
  partner: 'Links de parceiros',
  partners: 'Links de parceiros',
}
export function AdminSearchesPage() {
  const [days, setDays] = useState(30)
  const resource = useResource(async () => {
    const [searches, clicks, visits] = await Promise.all([
      all('searches'),
      all('whatsapp_clicks'),
      all('profile_visits'),
    ])
    return {
      searches: searches.sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
      clicks,
      visits,
    }
  })
  const [today] = useState(() => new Date())
  const since = new Date(today)
  since.setDate(since.getDate() - days + 1)
  since.setHours(0, 0, 0, 0)
  const inPeriod = (r: { created_at: string }) =>
    Date.parse(r.created_at) >= since.getTime()
  const raw = resource.data
  const d = raw
    ? {
        ...raw,
        searches: raw.searches.filter(inPeriod),
        clicks: raw.clicks.filter(inPeriod),
        visits: raw.visits.filter(inPeriod),
      }
    : null
  return (
    <PageContent
      title="Buscas e contatos"
      description="Entenda a procura por serviços e as oportunidades da sua região."
    >
      <div className="management-actions">
        <PeriodFilter days={days} onChange={setDays} />
      </div>
      <ResourceState resource={resource}>
        {d && (
          <>
            <Metrics
              items={[
                ['Buscas realizadas', d.searches.length],
                ['Visitas', d.visits.length],
                ['Cliques no WhatsApp', d.clicks.length],
                [
                  'Buscas sem resultado',
                  d.searches.filter((s) => s.results_count === 0).length,
                ],
              ]}
            />
            <Button
              onClick={() =>
                csv('buscas.csv', d.searches, [
                  'id',
                  'query',
                  'results_count',
                  'category_id',
                  'neighborhood_id',
                  'created_at',
                ])
              }
            >
              Exportar buscas em CSV
            </Button>
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="p-5 space-y-3">
                <h2 className="font-bold text-lg">Serviços mais buscados</h2>
                {group(
                  d.searches.map(
                    (s) =>
                      s.query.trim().toLocaleLowerCase('pt-BR') ||
                      '(Busca sem termo)',
                  ),
                )
                  .slice(0, 30)
                  .map(([query, total]) => (
                    <div
                      key={query}
                      className="flex justify-between gap-2 border-b border-line py-2"
                    >
                      <span>{query}</span>
                      <div className="flex items-center gap-3">
                        <progress
                          className="w-32 accent-brand"
                          max={Math.max(d.searches.length, d.clicks.length, 1)}
                          value={total}
                        />
                        <strong>{total}</strong>
                      </div>
                    </div>
                  ))}
              </Card>
              <Card className="p-5 space-y-3">
                <h2 className="font-bold text-lg">
                  Origem dos cliques no WhatsApp
                </h2>
                {group(d.clicks.map((c) => c.source)).map(([source, total]) => (
                  <div
                    key={source}
                    className="flex justify-between gap-2 border-b border-line py-2"
                  >
                    <span>{sources[source] ?? source}</span>
                    <strong>{total}</strong>
                  </div>
                ))}
              </Card>
            </div>
            <Card className="p-5 space-y-3">
              <h2>Oportunidade da semana</h2>
              <p className="text-muted">
                {group(
                  d.searches
                    .filter((s) => s.results_count === 0)
                    .map((s) => s.query),
                )[0]?.[0] || 'Nenhuma busca sem resultado no período.'}
              </p>
              <Link className="btn-outline" to="/admin/empresas">
                Priorizar novos cadastros
              </Link>
            </Card>
            <Card className="p-5 space-y-3">
              <h2 className="font-bold text-lg">Onde faltam opções</h2>
              {group(
                d.searches
                  .filter((s) => s.results_count === 0)
                  .map(
                    (s) =>
                      s.query.trim().toLocaleLowerCase('pt-BR') ||
                      'Busca sem termo',
                  ),
              ).map(([query, total]) => (
                <div
                  key={query}
                  className="flex justify-between border-b border-line py-3"
                >
                  <span>{query}</span>
                  <strong>{total} buscas</strong>
                </div>
              ))}
              {!d.searches.some((s) => s.results_count === 0) && (
                <p className="text-muted">Nenhuma busca sem resultado.</p>
              )}
            </Card>
          </>
        )}
      </ResourceState>
    </PageContent>
  )
}
