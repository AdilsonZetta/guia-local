import { Link, useSearchParams } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { BUSINESS_PAGE_SIZE, searchBusinesses } from '@/lib/business-search'
import { useCatalog } from '@/lib/queries'
import { logSearch } from '@/lib/analytics'
import { useAuth } from '@/context/AuthProvider'
import { EmptyState, LoadError } from '@/components/PageContent'
import { Select, Field } from '@/components/ui/Input'
import { NeighborhoodSelect } from '@/components/ui/NeighborhoodSelect'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { BusinessCard } from '@/components/business/BusinessCard'
import { SearchBar } from '@/components/SearchBar'
import { supabase } from '@/lib/supabase'
import { useInfiniteSentinel } from '@/hooks/useInfiniteSentinel'

function sortParam(value: string | null): 'relevance' | 'rating' | 'recent' {
  if (value === 'nota') return 'rating'
  if (value === 'recentes') return 'recent'
  return 'relevance'
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const key = params.toString()
  const { user, loading: authLoading } = useAuth()
  const [draft, setDraft] = useState(key)
  const logged = useRef('')
  const catalog = useCatalog()
  const city = useQuery({
    queryKey: ['site-city'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('city_name')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      return data?.city_name || 'Uberaba'
    },
  })
  const listParams = {
    query: params.get('q') || '',
    category: params.get('categoria'),
    neighborhood: params.get('bairro'),
    homeService: params.get('casa') === '1',
    receiving: params.get('pedidos') === '1',
    minRating: Number(params.get('nota')) || 0,
    sort: sortParam(params.get('ordem')),
  }
  const results = useInfiniteQuery({
    queryKey: ['business-search', listParams],
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: ({ pageParam }) =>
      searchBusinesses({
        ...listParams,
        limit: BUSINESS_PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (last, _pages, lastOffset) => {
      const next = lastOffset + last.rows.length
      if (!last.rows.length || last.rows.length < BUSINESS_PAGE_SIZE || next >= last.total) {
        return undefined
      }
      return next
    },
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
  const category = catalog.data?.categories.find(
    (item) => item.slug === params.get('categoria'),
  )
  const neighborhood = catalog.data?.neighborhoods.find(
    (item) => item.slug === params.get('bairro'),
  )
  const rows = results.data?.pages.flatMap((page) => page.rows) ?? []
  const total = results.data?.pages[0]?.total ?? 0
  const cityName = city.data || 'Uberaba'
  useEffect(() => {
    if (!results.data || results.isLoading || results.isError || authLoading) return
    const identity = `${key}:${user?.id ?? ''}`
    if (logged.current === identity) return
    logged.current = identity
    void logSearch({
      query: params.get('q') ?? '',
      resultsCount: total,
      categoryId: category?.id,
      neighborhoodId: neighborhood?.id,
      userId: user?.id,
    })
  }, [
    key,
    results.data,
    results.isLoading,
    results.isError,
    authLoading,
    user?.id,
    total,
    category?.id,
    neighborhood?.id,
    params,
  ])
  function submit(event: FormEvent) {
    event.preventDefault()
    setParams(new URLSearchParams(draft))
  }
  const applySearch = useCallback(
    (next: { q: string; bairro: string }) => {
      const url = new URLSearchParams(params)
      if (next.q) url.set('q', next.q)
      else url.delete('q')
      if (next.bairro) url.set('bairro', next.bairro)
      else url.delete('bairro')
      setParams(url)
    },
    [params, setParams],
  )
  const sentinel = useInfiniteSentinel(
    Boolean(results.hasNextPage && !results.isFetchingNextPage),
    () => {
      void results.fetchNextPage()
    },
  )
  return (
    <div className="site-container space-y-4 py-4 sm:space-y-6 sm:py-6">
      <SearchBar
        live
        neighborhoods={catalog.data?.neighborhoods || []}
        query={params.get('q') || ''}
        neighborhood={params.get('bairro') || ''}
        onSearch={applySearch}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[310px_1fr]">
        <Card className="p-4 sm:p-5">
          <h2 className="mb-4 text-xl font-extrabold sm:mb-5 sm:text-2xl">Filtrar resultados</h2>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Categoria">
              <Select
                aria-label="Categoria"
                value={values.get('categoria') ?? ''}
                onChange={(event) => change('categoria', event.target.value)}
              >
                <option value="">Todas as categorias</option>
                {catalog.data?.categories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bairro atendido">
              <NeighborhoodSelect
                ariaLabel="Bairro atendido"
                neighborhoods={catalog.data?.neighborhoods || []}
                value={values.get('bairro') ?? ''}
                onChange={(slug) => change('bairro', slug)}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.get('casa') === '1'}
                onChange={(event) => change('casa', event.target.checked ? '1' : '')}
              />{' '}
              Atende em domicílio
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.get('pedidos') === '1'}
                onChange={(event) => change('pedidos', event.target.checked ? '1' : '')}
              />{' '}
              Recebendo pedidos
            </label>
            <Field label="Avaliações">
              <Select
                aria-label="Avaliações"
                value={values.get('nota') ?? ''}
                onChange={(event) => change('nota', event.target.value)}
              >
                <option value="">Todas as notas</option>
                {[3, 4, 5].map((note) => (
                  <option key={note} value={note}>
                    {note} estrelas
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
          <Link to="/indicar" className="mt-6 block rounded-xl bg-brand-soft p-4">
            <strong>Não encontrou?</strong>
            <span className="block text-muted">Indique uma empresa →</span>
          </Link>
        </Card>
        <div className="space-y-4">
          {results.isLoading ? (
            <CardSkeleton count={4} />
          ) : results.isError ? (
            <LoadError
              message="Não foi possível carregar os dados. Tente novamente."
              retry={() => void results.refetch()}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="break-words text-3xl font-extrabold md:text-4xl">
                    {params.get('q') || category?.name || 'Empresas e serviços'} em {cityName}
                  </h1>
                  <p className="mt-1 text-base text-muted sm:text-xl">
                    {total.toLocaleString('pt-BR')} opções para você conhecer
                  </p>
                </div>
                <label className="flex w-full min-w-0 items-center gap-2 text-sm text-muted sm:w-auto sm:shrink-0 sm:gap-3">
                  Ordenar por:
                  <Select
                    aria-label="Ordenar por"
                    value={params.get('ordem') || ''}
                    onChange={(event) => {
                      const next = new URLSearchParams(params)
                      if (event.target.value) next.set('ordem', event.target.value)
                      else next.delete('ordem')
                      setParams(next)
                    }}
                  >
                    <option value="">Relevância</option>
                    <option value="nota">Melhor avaliados</option>
                    <option value="recentes">Mais recentes</option>
                  </Select>
                </label>
              </div>
              <div className={`grid gap-4 xl:grid-cols-2 ${results.isFetching && !results.isFetchingNextPage ? 'opacity-70' : ''}`}>
                {rows.map((business) => (
                  <BusinessCard key={business.id} business={business} city={cityName} />
                ))}
              </div>
              {!rows.length && (
                <EmptyState title="Nenhuma empresa encontrada">
                  Tente outro termo ou amplie os filtros para descobrir mais opções.{' '}
                  <Link to="/indicar" className="block text-brand underline">
                    Indicar empresa
                  </Link>
                </EmptyState>
              )}
              {results.hasNextPage && (
                <Button
                  variant="outline"
                  disabled={results.isFetchingNextPage}
                  onClick={() => void results.fetchNextPage()}
                >
                  {results.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
                </Button>
              )}
              <div ref={sentinel} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
