import { uploadReviewPhotos } from '@/lib/review-photos'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import { useAuth } from '@/context/AuthProvider'
import type { Tables, ReviewStatus } from '@/lib/database.types'
import { ReviewForm } from '@/components/forms/ReviewForm'
import {
  PageContent,
  EmptyState,
  LoadError,
  Notice,
} from '@/components/PageContent'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
const labels: Record<ReviewStatus, string> = {
  pending: 'Em análise',
  published: 'Publicada',
  adjustment_requested: 'Ajuste solicitado',
  removed: 'Removida',
  flagged: 'Em análise',
}
export function MyReviewsPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState<Tables<'reviews'> | null>(null)
  const [deleting, setDeleting] = useState<Tables<'reviews'> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const resource = useResource(async () => {
    if (!user) return { reviews: [], businesses: [], services: [] }
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    const businesses = reviews.length
      ? await supabase
          .from('businesses')
          .select('id, name, slug')
          .in('id', [...new Set(reviews.map((r) => r.business_id))])
          .eq('status', 'active')
          .eq('is_paused', false)
      : { data: [], error: null }
    if (businesses.error) throw businesses.error
    const services = reviews.length
      ? await supabase
          .from('services')
          .select('*')
          .in('business_id', [...new Set(reviews.map((r) => r.business_id))])
          .eq('active', true)
      : { data: [], error: null }
    if (services.error) throw services.error
    return {
      reviews,
      businesses: businesses.data ?? [],
      services: services.data ?? [],
    }
  }, [user?.id])
  async function remove() {
    if (!deleting || !user) return
    setBusy(true)
    setError('')
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', deleting.id)
        .eq('user_id', user.id)
      if (error) throw error
      setDeleting(null)
      setMessage('Avaliação excluída.')
      resource.reload()
    } catch {
      setError('Não foi possível excluir a avaliação.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <PageContent
      title="Minhas avaliações"
      description="Acompanhe suas contribuições e o retorno das empresas."
    >
      <div className="flex gap-5 border-b border-line">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'published', label: 'Publicadas' },
          { id: 'pending', label: 'Em análise' },
        ].map((t) => (
          <button
            key={t.id}
            className={`border-b-2 px-3 py-3 font-bold ${filter === t.id ? 'border-brand text-brand' : 'border-transparent text-muted'}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {resource.loading ? (
        <Spinner />
      ) : resource.error ? (
        <LoadError message={resource.error} retry={resource.reload} />
      ) : !resource.data?.reviews.length ? (
        <EmptyState title="Sua opinião faz a diferença">
          <Link to="/busca" className="text-brand">
            Encontre uma empresa para compartilhar sua experiência.
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {!resource.data.reviews.some(
            (r) =>
              filter === 'all' ||
              r.status === filter ||
              (filter === 'pending' && r.status === 'flagged'),
          ) && <EmptyState title="Nenhuma avaliação nesta aba" />}
          {resource.data.reviews
            .filter(
              (r) =>
                filter === 'all' ||
                r.status === filter ||
                (filter === 'pending' && r.status === 'flagged'),
            )
            .map((r) => {
              const b = resource.data?.businesses.find(
                (b) => b.id === r.business_id,
              )
              return (
                <Card key={r.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {b ? (
                      <Link
                        to={`/empresa/${b.slug}`}
                        className="text-lg font-bold text-brand"
                      >
                        {b.name}
                      </Link>
                    ) : (
                      <h2 className="font-bold">Empresa indisponível</h2>
                    )}
                    <Badge
                      tone={r.status === 'published' ? 'success' : 'warning'}
                    >
                      {labels[r.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {new Date(r.created_at).toLocaleDateString('pt-BR')} ·{' '}
                    <span
                      className="text-amber-500"
                      aria-label={`${r.rating} estrelas`}
                    >
                      {'★'.repeat(r.rating)}
                    </span>
                  </p>
                  {r.title && <h3 className="font-bold">{r.title}</h3>}
                  <p className="whitespace-pre-wrap">{r.body}</p>
                  {r.moderation_notes && (
                    <Notice>
                      Orientação da moderação: {r.moderation_notes}
                    </Notice>
                  )}
                  {r.reply_text && (
                    <div className="rounded-xl bg-brand-soft p-4 text-sm">
                      <p className="font-bold">Resposta da empresa</p>
                      <p className="mt-1 whitespace-pre-wrap">{r.reply_text}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(r)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setError('')
                        setDeleting(r)
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                </Card>
              )
            })}
        </div>
      )}
      {editing && (
        <Modal title="Editar avaliação" onClose={() => setEditing(null)}>
          <ReviewForm
            initial={editing}
            services={resource.data?.services.filter(
              (s) => s.business_id === editing.business_id,
            )}
            onCancel={() => setEditing(null)}
            onSubmit={async (content, photos) => {
              const { error } = await supabase
                .from('reviews')
                .update({ ...content, status: 'pending' })
                .eq('id', editing.id)
                .eq('user_id', user!.id)
              if (error) throw error
              const photoFailed = await uploadReviewPhotos(
                editing.id,
                user!.id,
                photos,
              )
              setEditing(null)
              setMessage(
                photoFailed
                  ? 'Alterações enviadas para análise, mas algumas fotos não puderam ser anexadas.'
                  : 'Alterações enviadas para uma nova análise.',
              )
              resource.reload()
            }}
          />
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Excluir avaliação?"
          onClose={() => {
            if (!busy) setDeleting(null)
          }}
        >
          <p className="mb-5 text-muted">
            Esta ação exclui sua avaliação permanentemente.
          </p>
          {error && <Notice error>{error}</Notice>}
          <div className="mt-4 flex gap-2">
            <Button variant="danger" disabled={busy} onClick={remove}>
              {busy ? 'Excluindo…' : 'Excluir avaliação'}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </Button>
          </div>
        </Modal>
      )}
    </PageContent>
  )
}
