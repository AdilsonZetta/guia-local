import { useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import type { ReviewStatus } from '@/lib/database.types'
import { all, checked, useAction, audit } from '@/lib/management'
import { ResourceState, Status, Feedback } from '@/components/Management'

import { PageContent, EmptyState } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Input'
export function AdminModerationPage() {
  const { user } = useAuth()
  const action = useAction()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const resource = useResource(async () => {
    const [reviews, businesses, profiles] = await Promise.all([
      all('reviews').then((rows) =>
        rows
          .filter((r) =>
            ['pending', 'flagged', 'adjustment_requested'].includes(r.status),
          )
          .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      ),
      all('businesses'),
      all('profiles'),
    ])
    return { reviews, businesses, profiles }
  })
  async function moderate(id: string, status: ReviewStatus) {
    const reason = notes[id]?.trim() || ''
    if (status !== 'published' && !reason)
      throw new Error('Informe as orientações ou a justificativa.')
    await checked(
      supabase
        .from('reviews')
        .update({ status, moderation_notes: reason || null })
        .eq('id', id)
        .select('id')
        .single(),
    )
    await audit(user!.id, `review_${status}`, 'reviews', id, { notes: reason })
    resource.reload()
  }
  return (
    <PageContent title="Moderação de avaliações">
      <Feedback action={action} />
      <ResourceState resource={resource}>
        {!resource.data?.reviews.length && (
          <EmptyState title="Nenhuma avaliação aguardando moderação" />
        )}
        {resource.data?.reviews.map((r) => (
          <Card className="p-5 space-y-3" key={r.id}>
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-bold">
                {resource.data?.businesses.find((b) => b.id === r.business_id)
                  ?.name ?? 'Empresa'}
              </h2>
              <Status value={r.status} />
            </div>
            <p>
              {resource.data?.profiles.find((p) => p.id === r.user_id)
                ?.full_name || 'Morador'}{' '}
              · {r.rating}/5 ·{' '}
              {new Date(r.created_at).toLocaleDateString('pt-BR')}
            </p>
            <h3 className="font-semibold">{r.title}</h3>
            <p className="whitespace-pre-wrap">{r.body}</p>
            {r.reply_text && (
              <p className="bg-brand-soft p-3 rounded-xl">
                Resposta da empresa: {r.reply_text}
              </p>
            )}
            {r.report_reason && (
              <p className="text-danger">
                Denúncia da empresa: {r.report_reason}
              </p>
            )}
            {r.flag_reason && (
              <p className="text-danger">Sinalização: {r.flag_reason}</p>
            )}
            {r.moderation_notes && (
              <p className="text-muted">
                Orientações anteriores: {r.moderation_notes}
              </p>
            )}
            <Field label="Orientações ou justificativa">
              <Textarea
                value={notes[r.id] ?? ''}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={action.busy}
                onClick={() =>
                  void action.run(() => moderate(r.id, 'published'))
                }
              >
                Manter / publicar
              </Button>
              <Button
                disabled={action.busy}
                variant="outline"
                onClick={() =>
                  void action.run(() => moderate(r.id, 'adjustment_requested'))
                }
              >
                Solicitar ajuste
              </Button>
              <Button
                disabled={action.busy}
                variant="danger"
                onClick={() => void action.run(() => moderate(r.id, 'removed'))}
              >
                Remover
              </Button>
            </div>
          </Card>
        ))}
      </ResourceState>
    </PageContent>
  )
}
