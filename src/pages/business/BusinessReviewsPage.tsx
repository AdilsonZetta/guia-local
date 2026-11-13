import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { PageContent, EmptyState } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Input'
import { checked, businessRows, useAction } from '@/lib/management'
import {
  BusinessGate,
  ResourceState,
  Feedback,
  Status,
} from '@/components/Management'

export function BusinessReviewsPage() {
  return (
    <BusinessGate>
      <Reviews />
    </BusinessGate>
  )
}
function Reviews() {
  const { business } = useAuth()
  const action = useAction()
  const [tab, setTab] = useState('all')
  const [composer, setComposer] = useState<string | null>(null)
  const [sort, setSort] = useState('recent')
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [reports, setReports] = useState<Record<string, string>>({})
  const resource = useResource(async () => {
    const reviews = (await businessRows('reviews', business!.id)).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )
    const ids = [...new Set(reviews.map((r) => r.user_id))]
    const authors: {
      id: string | null
      full_name: string | null
      avatar_url: string | null
    }[] = []
    for (let i = 0; i < ids.length; i += 100)
      authors.push(
        ...(await checked(
          supabase
            .from('public_profiles')
            .select('*')
            .in('id', ids.slice(i, i + 100)),
        )),
      )
    return { reviews, authors }
  }, [business?.id])
  const published =
    resource.data?.reviews.filter((r) => r.status === 'published') ?? []
  const unanswered = published.filter((r) => !r.reply_text).length
  const average = published.length
    ? published.reduce((sum, r) => sum + r.rating, 0) / published.length
    : 0
  return (
    <PageContent
      title="Avaliações"
      description="Acompanhe as experiências dos clientes e responda com atenção."
    >
      <div className="management-actions">
        <Link className="btn-outline" to={`/empresa/${business!.slug}`}>
          Ver avaliações no perfil
        </Link>
      </div>
      <Feedback action={action} />
      <ResourceState resource={resource}>
        {!resource.data?.reviews.length && (
          <EmptyState title="Nenhuma avaliação por enquanto" />
        )}
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="p-5 self-start space-y-5">
            <h2>Sua reputação</h2>
            <p className="text-7xl font-extrabold">
              {average.toFixed(1).replace('.', ',')}
            </p>
            <p className="text-3xl text-amber-500">★★★★★</p>
            <p className="text-muted">{published.length} avaliações</p>
            {[5, 4, 3, 2, 1].map((n) => (
              <div className="flex items-center gap-3 text-sm" key={n}>
                <span className="w-20 text-muted">{n} estrelas</span>
                <progress
                  className="h-3 w-full accent-amber-400"
                  max={published.length || 1}
                  value={published.filter((r) => r.rating === n).length}
                />
                <span>{published.filter((r) => r.rating === n).length}</span>
              </div>
            ))}
            <div className="rounded-xl bg-orange-50 p-5">
              <strong className="text-3xl">{unanswered}</strong>
              <p className="text-muted">sem resposta</p>
            </div>
            <div className="rounded-xl bg-brand-soft p-5">
              <strong className="text-3xl">
                {published.length - unanswered}
              </strong>
              <p className="text-muted">respondidas</p>
            </div>
            <p className="text-xs text-muted">
              ⓘ As respostas ficam visíveis no seu perfil.
            </p>
          </Card>
          <div className="space-y-4">
            <Card className="p-4 flex flex-wrap gap-2">
              {[
                ['all', `Todas (${resource.data?.reviews.length ?? 0})`],
                ['unanswered', `Sem resposta (${unanswered})`],
                ['answered', `Respondidas (${published.length - unanswered})`],
              ].map(([key, label]) => (
                <Button
                  key={key}
                  variant={tab === key ? 'primary' : 'outline'}
                  onClick={() => setTab(key!)}
                >
                  {label}
                </Button>
              ))}
              <select
                aria-label="Ordenação"
                className="ml-auto border border-line rounded-lg px-3"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recent">Mais recentes</option>
                <option value="oldest">Mais antigas</option>
              </select>
            </Card>
            {resource.data?.reviews
              .filter(
                (r) =>
                  tab === 'all' ||
                  (tab === 'unanswered' ? !r.reply_text : !!r.reply_text),
              )
              .slice()
              .sort((a, b) =>
                sort === 'recent'
                  ? b.created_at.localeCompare(a.created_at)
                  : a.created_at.localeCompare(b.created_at),
              )
              .map((r) => (
                <Card key={r.id} className="p-5 space-y-3">
                  <div className="flex justify-between gap-2">
                    <h2 className="font-bold">
                      {resource.data?.authors.find((a) => a.id === r.user_id)
                        ?.full_name || 'Morador'}{' '}
                      <span className="ml-5 text-amber-500">
                        {'★'.repeat(r.rating)}
                        <span className="text-slate-300">
                          {'★'.repeat(5 - r.rating)}
                        </span>
                      </span>
                    </h2>
                    <Status value={r.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="whitespace-pre-wrap">{r.body}</p>
                  {r.reply_text && (
                    <div className="bg-brand-soft rounded-xl p-3">
                      <strong>Sua resposta</strong>
                      <p>{r.reply_text}</p>
                    </div>
                  )}
                  {composer !== r.id && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setComposer(r.id)}
                      >
                        {r.reply_text ? 'Editar resposta' : 'Responder'}
                      </Button>
                    </div>
                  )}
                  {composer === r.id && (
                    <form
                      className="space-y-3 rounded-xl border border-line bg-canvas p-5"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void action.run(async () => {
                          if (!(replies[r.id] ?? r.reply_text ?? '').trim())
                            throw new Error('Escreva sua resposta.')
                          await checked(
                            supabase
                              .from('reviews')
                              .update({
                                reply_text: (
                                  replies[r.id] ??
                                  r.reply_text ??
                                  ''
                                ).trim(),
                              })
                              .eq('id', r.id)
                              .eq('business_id', business!.id),
                          )
                          setComposer(null)
                          resource.reload()
                        })
                      }}
                    >
                      <Field label="Sua resposta">
                        <Textarea
                          required
                          value={replies[r.id] ?? r.reply_text ?? ''}
                          onChange={(e) =>
                            setReplies({ ...replies, [r.id]: e.target.value })
                          }
                        />
                      </Field>
                      <Button disabled={action.busy} type="submit">
                        Publicar resposta
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setComposer(null)}
                      >
                        Cancelar
                      </Button>
                    </form>
                  )}
                  <details>
                    <summary className="cursor-pointer text-danger">
                      Denunciar avaliação
                    </summary>
                    <form
                      className="space-y-2 mt-3"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void action.run(async () => {
                          const reason = reports[r.id]?.trim()
                          if (!reason)
                            throw new Error('Informe o motivo da denúncia.')
                          await checked(
                            supabase
                              .from('reviews')
                              .update({
                                reported_by_business: true,
                                report_reason: reason,
                              })
                              .eq('id', r.id)
                              .eq('business_id', business!.id),
                          )
                          resource.reload()
                        })
                      }}
                    >
                      <Field label="Motivo da denúncia">
                        <Textarea
                          required
                          value={reports[r.id] ?? ''}
                          onChange={(e) =>
                            setReports({ ...reports, [r.id]: e.target.value })
                          }
                        />
                      </Field>
                      <Button
                        disabled={action.busy || r.reported_by_business}
                        variant="danger"
                        type="submit"
                      >
                        Enviar denúncia
                      </Button>
                      {r.report_reason && (
                        <p>Denúncia enviada: {r.report_reason}</p>
                      )}
                    </form>
                  </details>
                </Card>
              ))}
          </div>
        </div>
      </ResourceState>
    </PageContent>
  )
}
