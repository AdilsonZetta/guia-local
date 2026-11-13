import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { enrichBusinesses, useResource } from '@/lib/public-data'
import {
  PageContent,
  EmptyState,
  LoadError,
  Notice,
} from '@/components/PageContent'
import { BusinessCard } from '@/components/business/BusinessCard'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
export function FavoritesPage() {
  const { user } = useAuth()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const resource = useResource(async () => {
    if (!user) return []
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    if (!data.length) return []
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('*')
      .in(
        'id',
        data.map((f) => f.business_id),
      )
      .eq('status', 'active')
      .eq('is_paused', false)
    if (businessesError) throw businessesError
    const enriched = await enrichBusinesses(businesses)
    return data
      .map((f) => enriched.find((b) => b.id === f.business_id))
      .filter((b) => b !== undefined)
  }, [user?.id])
  async function remove(id: string) {
    if (!user) return
    setBusy(id)
    setError('')
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('business_id', id)
      if (error) throw error
      resource.reload()
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
      {resource.loading ? (
        <Spinner />
      ) : resource.error ? (
        <LoadError message={resource.error} retry={resource.reload} />
      ) : resource.data?.length ? (
        <div className="space-y-5">
          {resource.data.map((b) => (
            <div key={b.id}>
              <BusinessCard business={b} source="favorites" wide />
              <div className="mt-1 text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={Boolean(busy)}
                  onClick={() => remove(b.id)}
                >
                  {busy === b.id ? 'Removendo…' : 'Remover dos favoritos'}
                </Button>
              </div>
            </div>
          ))}
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
