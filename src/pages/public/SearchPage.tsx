import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { catalog, publicBusinesses, useResource } from '@/lib/public-data'
import { logSearch } from '@/lib/analytics'
import { isReceivingNow, slugify } from '@/lib/utils'
import { useAuth } from '@/context/AuthProvider'
import { EmptyState, LoadError } from '@/components/PageContent'
import { Select, Field } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { BusinessCard } from '@/components/business/BusinessCard'
import { SearchBar } from '@/components/SearchBar'
import { supabase } from '@/lib/supabase'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const key = params.toString()
  const { user, loading: authLoading } = useAuth()
  const [draft, setDraft] = useState(key)
  const logged = useRef('')
  const resource = useResource(async () => {
    const [refs, businesses, settings] = await Promise.all([
      catalog(),
      publicBusinesses(),
      supabase
        .from('site_settings')
        .select('city_name')
        .eq('id', 1)
        .maybeSingle(),
    ])
    return { ...refs, businesses, city: settings.data?.city_name || 'Uberaba' }
  })
  useEffect(() => {
    setDraft(key)
  }, [key])
  const values = new URLSearchParams(draft)
  const change = (name: string, value: string) => {
    const next = new URLSearchParams(draft)
    if (value) next.set(name, value)
    else next.delete(name)
    setDraft(next.toString())
  }
  const category = resource.data?.categories.find(
    (c) => c.slug === params.get('categoria'),
  )
  const neighborhood = resource.data?.neighborhoods.find(
    (n) => n.slug === params.get('bairro'),
  )
  const words = slugify(params.get('q') ?? '')
    .split('-')
    .filter(Boolean)
  const rows = (resource.data?.businesses ?? [])
    .filter((b) => {
      const text = slugify(
        [b.name, b.tagline, b.description, b.categories?.name]
          .filter(Boolean)
          .join(' '),
      )
      return (
        words.every((word) => text.includes(word)) &&
        (!params.get('categoria') ||
          b.categories?.slug === params.get('categoria')) &&
        (!params.get('bairro') ||
          b.neighborhoods?.slug === params.get('bairro') ||
          b.serviceAreas?.some((n) => n.slug === params.get('bairro'))) &&
        (params.get('casa') !== '1' || b.home_service) &&
        (params.get('pedidos') !== '1' || isReceivingNow(b)) &&
        Number(b.business_stats?.avg_rating ?? 0) >=
          (Number(params.get('nota')) || 0)
      )
    })
    .sort((a, b) => {
      if (params.get('ordem') === 'recentes')
        return b.created_at.localeCompare(a.created_at)
      if (params.get('ordem') === 'nota')
        return (
          Number(b.business_stats?.avg_rating ?? 0) -
            Number(a.business_stats?.avg_rating ?? 0) ||
          Number(b.business_stats?.review_count ?? 0) -
            Number(a.business_stats?.review_count ?? 0)
        )
      const q = slugify(params.get('q') ?? '')
      return (
        Number(slugify(b.name).includes(q)) -
          Number(slugify(a.name).includes(q)) ||
        Number(b.featured) - Number(a.featured) ||
        a.name.localeCompare(b.name, 'pt-BR')
      )
    })
  useEffect(() => {
    if (!resource.data || resource.loading || resource.error || authLoading)
      return
    const identity = `${key}:${user?.id ?? ''}`
    if (logged.current === identity) return
    logged.current = identity
    void logSearch({
      query: params.get('q') ?? '',
      resultsCount: rows.length,
      categoryId: category?.id,
      neighborhoodId: neighborhood?.id,
      userId: user?.id,
    })
  }, [
    key,
    resource.data,
    resource.loading,
    resource.error,
    authLoading,
    user?.id,
    rows.length,
    category?.id,
    neighborhood?.id,
    params,
  ])
  function submit(e: FormEvent) {
    e.preventDefault()
    setParams(new URLSearchParams(draft))
    setPage(1)
  }
  const [page, setPage] = useState(1)
  useEffect(() => {
    setPage(1)
  }, [key])
  return (
    <div className="site-container space-y-6 py-6">
      <SearchBar
        key={key}
        neighborhoods={resource.data?.neighborhoods || []}
        query={params.get('q') || ''}
        neighborhood={params.get('bairro') || ''}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[310px_1fr]">
        <Card className="p-5">
          <h2 className="mb-5 text-2xl font-extrabold">Filtrar resultados</h2>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Categoria">
              <Select
                aria-label="Categoria"
                value={values.get('categoria') ?? ''}
                onChange={(e) => change('categoria', e.target.value)}
              >
                <option value="">Todas as categorias</option>
                {resource.data?.categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bairro atendido">
              <Select
                aria-label="Bairro atendido"
                value={values.get('bairro') ?? ''}
                onChange={(e) => change('bairro', e.target.value)}
              >
                <option value="">Todos os bairros</option>
                {resource.data?.neighborhoods.map((n) => (
                  <option key={n.id} value={n.slug}>
                    {n.name}
                  </option>
                ))}
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.get('casa') === '1'}
                onChange={(e) => change('casa', e.target.checked ? '1' : '')}
              />{' '}
              Atende em domicílio
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.get('pedidos') === '1'}
                onChange={(e) => change('pedidos', e.target.checked ? '1' : '')}
              />{' '}
              Recebendo pedidos
            </label>
            <Field label="Avaliações">
              <Select
                aria-label="Avaliações"
                value={values.get('nota') ?? ''}
                onChange={(e) => change('nota', e.target.value)}
              >
                <option value="">Todas as notas</option>
                {[3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} estrelas
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" className="w-full">
              Aplicar filtros
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              type="button"
              onClick={() => {
                setDraft('')
                setParams({})
              }}
            >
              Limpar filtros
            </Button>
          </form>
          <Link
            to="/indicar"
            className="mt-6 block rounded-xl bg-brand-soft p-4"
          >
            <strong>Não encontrou?</strong>
            <span className="block text-muted">Indique uma empresa →</span>
          </Link>
        </Card>
        <div className="space-y-4">
          {resource.loading ? (
            <Spinner />
          ) : resource.error ? (
            <LoadError message={resource.error} retry={resource.reload} />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold md:text-4xl">
                    {params.get('q') || category?.name || 'Empresas e serviços'}{' '}
                    em {resource.data?.city}
                  </h1>
                  <p className="mt-1 text-xl text-muted">
                    {rows.length} opções para você conhecer
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm text-muted">
                  Ordenar por:
                  <Select
                    aria-label="Ordenar por"
                    value={params.get('ordem') || ''}
                    onChange={(e) => {
                      const next = new URLSearchParams(params)
                      next.set('ordem', e.target.value)
                      setParams(next)
                    }}
                  >
                    <option value="">Relevância</option>
                    <option value="nota">Melhor avaliados</option>
                    <option value="recentes">Mais recentes</option>
                  </Select>
                </label>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {rows.slice(0, page * 12).map((b) => (
                  <BusinessCard
                    key={b.id}
                    business={b}
                    city={resource.data?.city}
                  />
                ))}
              </div>
              {!rows.length && (
                <EmptyState title="Nenhuma empresa encontrada">
                  Tente outro termo ou amplie os filtros para descobrir mais
                  opções.{' '}
                  <Link to="/indicar" className="block text-brand underline">
                    Indicar empresa
                  </Link>
                </EmptyState>
              )}
              {rows.length > page * 12 && (
                <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                  Mostrar mais empresas
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
