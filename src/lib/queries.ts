import { useQuery, type QueryKey } from '@tanstack/react-query'
import { catalog } from './public-data'

export function friendlyError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'Não foi possível carregar os dados. Tente novamente.'
}

export function useQueryResource<T>(options: {
  queryKey: QueryKey
  queryFn: () => Promise<T>
  enabled?: boolean
  staleTime?: number
}) {
  const query = useQuery({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 60_000,
  })
  return {
    data: query.data ?? null,
    error: query.isError ? friendlyError(query.error) : '',
    loading: query.isLoading,
    fetching: query.isFetching,
    reload: () => {
      void query.refetch()
    },
  }
}

export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: catalog,
    staleTime: 10 * 60_000,
  })
}
