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
  return (
    <PageContent title="Avaliações">
      <Feedback action={action} />
      <ResourceState resource={resource}>
        {!resource.data?.reviews.length && (
          <EmptyState title="Nenhuma avaliação por enquanto" />
        )}
        {resource.data?.reviews.map((r) => (
          <Card key={r.id} className="p-5 space-y-3">
            <div className="flex justify-between gap-2">
              <h2 className="font-bold">
                {resource.data?.authors.find((a) => a.id === r.user_id)
                  ?.full_name || 'Morador'}{' '}
                · {r.rating}/5
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
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault()
                void action.run(async () => {
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
                  resource.reload()
                })
              }}
            >
              <Field label="Responder avaliação">
                <Textarea
                  required
                  value={replies[r.id] ?? r.reply_text ?? ''}
                  onChange={(e) =>
                    setReplies({ ...replies, [r.id]: e.target.value })
                  }
                />
              </Field>
              <Button disabled={action.busy} type="submit">
                Salvar resposta
              </Button>
            </form>
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
                {r.report_reason && <p>Denúncia enviada: {r.report_reason}</p>}
              </form>
            </details>
          </Card>
        ))}
      </ResourceState>
    </PageContent>
  )
}
