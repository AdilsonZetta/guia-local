import { useResource } from '@/lib/public-data'
import { all, csv } from '@/lib/management'
import { ResourceState, Metrics } from '@/components/Management'

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
}
export function AdminSearchesPage() {
  const resource = useResource(async () => {
    const [searches, clicks] = await Promise.all([
      all('searches'),
      all('whatsapp_clicks'),
    ])
    return {
      searches: searches.sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
      clicks,
    }
  })
  const d = resource.data
  return (
    <PageContent title="Buscas e contatos">
      <ResourceState resource={resource}>
        {d && (
          <>
            <Metrics
              items={[
                ['Buscas registradas', d.searches.length],
                [
                  'Sem resultado',
                  d.searches.filter((s) => s.results_count === 0).length,
                ],
                ['Cliques no WhatsApp', d.clicks.length],
                [
                  'Termos diferentes',
                  new Set(
                    d.searches.map((s) =>
                      s.query.trim().toLocaleLowerCase('pt-BR'),
                    ),
                  ).size,
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
                <h2 className="font-bold text-lg">Termos mais buscados</h2>
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
                      <strong>{total}</strong>
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
              <h2 className="font-bold text-lg">Buscas sem resultado</h2>
              {d.searches
                .filter((s) => s.results_count === 0)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap justify-between gap-2 border-b border-line py-2"
                  >
                    <span>{s.query || 'Busca sem termo'}</span>
                    <span className="text-muted">
                      {new Date(s.created_at).toLocaleString('pt-BR')}
                    </span>
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
