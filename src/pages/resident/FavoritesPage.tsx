import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { BUSINESS_PAGE_SIZE, searchBusinesses } from '@/lib/business-search'
import { friendlyError } from '@/lib/queries'
import {
  PageContent,
  EmptyState,
  LoadError,
  Notice,
} from '@/components/PageContent'
import { BusinessCard } from '@/components/business/BusinessCard'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { useInfiniteSentinel } from '@/hooks/useInfiniteSentinel'

export function FavoritesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const favorites = useInfiniteQuery({
    queryKey: ['favorites', user?.id],
    enabled: Boolean(user),
    initialPageParam: 0,
    staleTime: 30_000,
    queryFn: async ({ pageParam }) => {
      const { data, error: favoriteError, count } = await supabase
        .from('favorites')
        .select('business_id, created_at', { count: 'estimated' })
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + BUSINESS_PAGE_SIZE - 1)
      if (favoriteError) throw favoriteError
      const ids = (data ?? []).map((row) => row.business_id)
      if (!ids.length) return { rows: [], total: count ?? 0, fetched: 0 }
      const result = await searchBusinesses({
        ids,
        includeInactive: false,
        limit: ids.length,
        offset: 0,
      })
      const byId = new Map(result.rows.map((row) => [row.id, row]))
      return {
        rows: ids.flatMap((id) => {
          const business = byId.get(id)
          return business ? [business] : []
        }),
        total: count ?? ids.length,
        fetched: ids.length,
      }
    },
    getNextPageParam: (last, _pages, lastOffset) => {
      const next = lastOffset + BUSINESS_PAGE_SIZE
      if (!last.fetched || next >= last.total) return undefined
      return next
    },
  })
  const rows = favorites.data?.pages.flatMap((page) => page.rows) ?? []
  const sentinel = useInfiniteSentinel(
    Boolean(favorites.hasNextPage && !favorites.isFetchingNextPage),
    () => {
      void favorites.fetchNextPage()
    },
  )
  async function remove(id: string) {
    if (!user) return
    setBusy(id)
    setError('')
    try {
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('business_id', id)
      if (deleteError) throw deleteError
      queryClient.setQueryData<string[]>(['favorite-ids', user.id], (current = []) =>
        current.filter((item) => item !== id),
      )
      await queryClient.invalidateQueries({ queryKey: ['favorites', user.id] })
    } catch {
      setError('Não foi possível remover o favorito.')
    } finally {
      setBusy('')
    }
  }
  return (
    <PageContent
      title="Meus favoritos"
      description="Seus negócios preferidos, sempre por perto. Perfis indisponíveis não aparecem nesta lista."
    >
      {error && <Notice error>{error}</Notice>}
      {favorites.isLoading ? (
        <CardSkeleton count={2} />
      ) : favorites.isError ? (
        <LoadError message={friendlyError(favorites.error)} retry={() => void favorites.refetch()} />
      ) : rows.length ? (
        <div className="space-y-5">
          {rows.map((business) => (
            <div key={business.id}>
              <BusinessCard business={business} source="favorites" wide />
              <div className="mt-1 text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={Boolean(busy)}
                  onClick={() => void remove(business.id)}
                >
                  {busy === business.id ? 'Removendo…' : 'Remover dos favoritos'}
                </Button>
              </div>
            </div>
          ))}
          {favorites.hasNextPage && (
            <Button
              variant="outline"
              disabled={favorites.isFetchingNextPage}
              onClick={() => void favorites.fetchNextPage()}
            >
              {favorites.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
            </Button>
          )}
          <div ref={sentinel} />
        </div>
      ) : (
        <EmptyState title="Salve suas próximas descobertas">
          <p className="mb-4">
            Toque em Salvar no perfil de uma empresa para encontrá-la aqui.
          </p>
          <Link to="/busca" className="font-bold text-brand">
            Explorar empresas
          </Link>
        </EmptyState>
      )}
    </PageContent>
  )
}
