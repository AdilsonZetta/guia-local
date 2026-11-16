import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import type { ReviewStatus } from '@/lib/database.types'
import { all, checked, useAction, audit } from '@/lib/management'
import { businessNames } from '@/lib/business-search'
import {
  ResourceState,
  Status,
  Feedback,
  Metrics,
} from '@/components/Management'
import { PageContent } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
export function AdminModerationPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const action = useAction()
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState<string | null>(params.get('id'))
  const [tab, setTab] = useState(
    params.get('id') || params.get('user') ? 'recent' : 'flagged',
  )
  const [rules, setRules] = useState(false)
  const resource = useResource(async () => {
    const [reviews, profiles, services] = await Promise.all([
      all('reviews'),
      all('profiles'),
      all('services'),
    ])
    const businesses = await businessNames(reviews.map((review) => review.business_id))
    return {
      reviews: reviews.sort((a, b) => b.created_at.localeCompare(a.created_at)),
      businesses,
      profiles,
      services,
    }
  })
  const d = resource.data
  const queue =
    d?.reviews.filter(
      (r) =>
        (!params.get('user') || r.user_id === params.get('user')) &&
        (tab === 'recent' ||
          ['pending', 'flagged', 'adjustment_requested'].includes(r.status)),
    ) ?? []
  const current = d?.reviews.find((r) => r.id === selected) ?? queue[0]
  async function moderate(status: ReviewStatus) {
    if (!current) return
    const reason = notes.trim()
    if (status !== 'published' && !reason)
      throw new Error('Informe a justificativa da decisão.')
    await checked(
      supabase
        .from('reviews')
        .update({ status, moderation_notes: reason || null })
        .eq('id', current.id)
        .select('id')
        .single(),
    )
    await checked(
      supabase.from('moderation_events').insert({
        review_id: current.id,
        business_id: current.business_id,
        actor_id: user!.id,
        action: status,
        justification: reason || null,
      }),
    )
    await audit(user!.id, `review_${status}`, 'reviews', current.id, {
      notes: reason,
    })
    setSelected(null)
    setNotes('')
    resource.reload()
  }
  return (
    <PageContent
      title="Avaliações"
      description="Revise as experiências publicadas e mantenha a confiança na plataforma."
    >
      <Feedback action={action} />
      <div className="management-actions">
        <Button variant="outline" onClick={() => setRules(true)}>
          Regras de publicação
        </Button>
      </div>
      <ResourceState resource={resource}>
        {d && (
          <>
            <Metrics
              items={[
                [
                  'Publicadas',
                  d.reviews.filter((r) => r.status === 'published').length,
                ],
                [
                  'Em análise',
                  d.reviews.filter((r) =>
                    ['pending', 'flagged', 'adjustment_requested'].includes(
                      r.status,
                    ),
                  ).length,
                ],
                ['Respondidas', d.reviews.filter((r) => !!r.reply_text).length],
                [
                  'Removidas',
                  d.reviews.filter((r) => r.status === 'removed').length,
                ],
              ]}
            />
            <div className="grid gap-5 lg:grid-cols-[.85fr_1.5fr]">
              <Card className="p-5 space-y-4 self-start">
                <h2>Fila de análise</h2>
                <div className="flex gap-2">
                  <Button
                    variant={tab === 'flagged' ? 'primary' : 'outline'}
                    onClick={() => {
                      setTab('flagged')
                      setSelected(null)
                    }}
                  >
                    Sinalizadas
                  </Button>
                  <Button
                    variant={tab === 'recent' ? 'primary' : 'outline'}
                    onClick={() => {
                      setTab('recent')
                      setSelected(null)
                    }}
                  >
                    Recentes
                  </Button>
                </div>
                {queue.map((r) => (
                  <button
                    className={`block w-full rounded-lg border p-4 text-left ${r.id === current?.id ? 'border-brand bg-brand-soft' : 'border-line'}`}
                    key={r.id}
                    onClick={() => {
                      setSelected(r.id)
                      setNotes(r.moderation_notes || '')
                    }}
                  >
                    <div className="flex justify-between gap-2">
                      <strong>
                        {d.businesses.find((b) => b.id === r.business_id)?.name}
                      </strong>
                      <Status value={r.status} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted">
                      {r.body}
                    </p>
                  </button>
                ))}
                {!queue.length && (
                  <p className="text-muted">
                    Nenhuma avaliação aguardando análise.
                  </p>
                )}
              </Card>
              {current && (
                <Card className="p-6 space-y-5">
                  <div className="flex justify-between">
                    <div>
                      <h2>
                        {d.profiles.find((p) => p.id === current.user_id)
                          ?.full_name || 'Morador'}
                      </h2>
                      <p className="text-sm text-muted">
                        Conta cadastrada ·{' '}
                        {new Date(current.created_at).toLocaleDateString(
                          'pt-BR',
                        )}
                      </p>
                    </div>
                    <span className="text-2xl text-amber-500">
                      {'★'.repeat(current.rating)}
                    </span>
                  </div>
                  <p className="text-muted">
                    {
                      d.businesses.find((b) => b.id === current.business_id)
                        ?.name
                    }{' '}
                    ·{' '}
                    {d.services.find((s) => s.id === current.service_id)
                      ?.name || 'Serviço não informado'}{' '}
                    · Experiência: {current.experience_month || 'Não informada'}
                  </p>
                  <blockquote className="rounded-xl bg-canvas p-5 text-lg">
                    “{current.body}”
                  </blockquote>
                  {(current.report_reason || current.flag_reason) && (
                    <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
                      <strong>Motivo da denúncia</strong>
                      <p className="mt-2">
                        {current.report_reason || current.flag_reason}
                      </p>
                    </div>
                  )}
                  {current.reply_text && (
                    <section className="rounded-xl bg-brand-soft p-5">
                      <strong>Resposta da empresa</strong>
                      <p className="mt-2">{current.reply_text}</p>
                    </section>
                  )}
                  <Field label="Justificativa da decisão">
                    <Textarea
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(() => moderate('published'))
                      }
                    >
                      Manter publicada
                    </Button>
                    <Button
                      variant="outline"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(() => moderate('adjustment_requested'))
                      }
                    >
                      Solicitar ajuste
                    </Button>
                    <Button
                      variant="danger"
                      disabled={action.busy}
                      onClick={() => void action.run(() => moderate('removed'))}
                    >
                      Remover por violação
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </ResourceState>
      {rules && (
        <Modal title="Regras de publicação" onClose={() => setRules(false)}>
          <ul className="list-disc pl-5 space-y-3 text-muted">
            <li>Relate uma experiência real com o negócio.</li>
            <li>Não publique dados pessoais, ofensas ou ameaças.</li>
            <li>A nota deve refletir o atendimento recebido.</li>
            <li>Não publique publicidade ou conteúdo repetido.</li>
            <li>Decisões de remoção e ajuste precisam de justificativa.</li>
          </ul>
        </Modal>
      )}
    </PageContent>
  )
}
