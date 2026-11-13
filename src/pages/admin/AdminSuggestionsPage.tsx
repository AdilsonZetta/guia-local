import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import { slugify } from '@/lib/utils'
import { all, checked, useAction, audit } from '@/lib/management'
import {
  ResourceState,
  Status,
  Feedback,
  Metrics,
} from '@/components/Management'
import { PageContent } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select, Field, Textarea } from '@/components/ui/Input'
export function AdminSuggestionsPage() {
  const { user } = useAuth()
  const action = useAction()
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [duplicates, setDuplicates] = useState(false)
  const resource = useResource(async () => {
    const [suggestions, categories, neighborhoods, businesses] =
      await Promise.all([
        all('suggestions'),
        all('categories'),
        all('neighborhoods'),
        all('businesses'),
      ])
    return {
      suggestions: suggestions.sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
      categories,
      neighborhoods,
      businesses,
    }
  })
  const d = resource.data
  const rows =
    d?.suggestions.filter((s) => !status || s.status === status) ?? []
  const current = d?.suggestions.find((s) => s.id === selected) ?? rows[0]
  const similar = current
    ? d?.businesses.filter(
        (b) =>
          slugify(b.name).includes(
            slugify(current.business_name).split('-')[0] || '',
          ) || slugify(current.business_name).includes(slugify(b.name)),
      )
    : []
  async function convert() {
    if (!current) return
    const fresh = await checked(
      supabase.from('suggestions').select('*').eq('id', current.id).single(),
    )
    if (fresh.status !== 'pending')
      throw new Error('Esta indicação já foi processada.')
    const created = await checked(
      supabase
        .from('businesses')
        .insert({
          name: current.business_name,
          slug: `${slugify(current.business_name)}-${crypto.randomUUID().slice(0, 8)}`,
          category_id: current.category_id,
          neighborhood_id: current.neighborhood_id,
          phone: current.phone,
          whatsapp: current.phone,
          status: 'pending',
        })
        .select('id')
        .single(),
    )
    try {
      await checked(
        supabase
          .from('suggestions')
          .update({
            status: 'registration_created',
            created_business_id: created.id,
          })
          .eq('id', current.id)
          .eq('status', 'pending')
          .select('id')
          .single(),
      )
    } catch (error) {
      await supabase.from('businesses').delete().eq('id', created.id)
      throw error
    }
    await audit(
      user!.id,
      'suggestion_registration_created',
      'suggestions',
      current.id,
      { business_id: created.id, notes },
    )
    setNotes('')
    resource.reload()
  }
  return (
    <PageContent
      title="Indicações"
      description="Analise os negócios sugeridos pelos moradores."
    >
      <Feedback action={action} />
      <ResourceState resource={resource}>
        {d && (
          <>
            <Metrics
              items={[
                ['Recebidas', d.suggestions.length],
                [
                  'Aguardando análise',
                  d.suggestions.filter((s) => s.status === 'pending').length,
                ],
                [
                  'Convertidas em cadastro',
                  d.suggestions.filter(
                    (s) => s.status === 'registration_created',
                  ).length,
                ],
              ]}
            />
            <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
              <Card className="p-5 self-start overflow-x-auto">
                <Field label="Status">
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Todas</option>
                    <option value="pending">Aguardando análise</option>
                    <option value="registration_created">Convertidas</option>
                    <option value="archived">Arquivadas</option>
                  </Select>
                </Field>
                <table className="mt-5 w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>Negócio sugerido</th>
                      <th>Categoria</th>
                      <th>Bairro</th>
                      <th>Indicado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr
                        key={s.id}
                        className={`cursor-pointer border-t border-line ${s.id === current?.id ? 'bg-brand-soft' : ''}`}
                        onClick={() => {
                          setSelected(s.id)
                          setNotes('')
                          setDuplicates(false)
                        }}
                      >
                        <td className="font-bold">{s.business_name}</td>
                        <td>
                          {d.categories.find((c) => c.id === s.category_id)
                            ?.name || '—'}
                        </td>
                        <td>
                          {d.neighborhoods.find(
                            (n) => n.id === s.neighborhood_id,
                          )?.name || '—'}
                        </td>
                        <td>
                          <span className="avatar mr-2">
                            {s.suggester_name?.slice(0, 2).toUpperCase() ||
                              'MO'}
                          </span>
                          {s.suggester_name || 'Morador'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <p className="p-5 text-muted">
                    Nenhuma indicação neste filtro.
                  </p>
                )}
              </Card>
              {current && (
                <Card className="p-5 space-y-5">
                  <h2>{current.business_name}</h2>
                  <Status value={current.status} />
                  <div>
                    <strong>Observação do morador</strong>
                    <p className="mt-2 rounded-xl bg-canvas p-4">
                      {current.notes || 'Sem observações.'}
                    </p>
                  </div>
                  <p className="text-muted">
                    Contato: {current.phone || 'Não informado'}
                  </p>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setDuplicates(true)}
                  >
                    Conferir duplicidade – Buscar cadastros semelhantes
                  </Button>
                  {duplicates && (
                    <div className="rounded-xl bg-brand-soft p-4">
                      {similar?.length ? (
                        similar.map((b) => (
                          <Link
                            key={b.id}
                            className="block py-2 text-brand"
                            to={`/admin/empresas?id=${b.id}`}
                          >
                            {b.name} →
                          </Link>
                        ))
                      ) : (
                        <p>Nenhum cadastro semelhante encontrado.</p>
                      )}
                    </div>
                  )}
                  <Field label="Observações da análise">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </Field>
                  {current.created_business_id && (
                    <Link
                      className="btn-outline"
                      to={`/admin/empresas?id=${current.created_business_id}`}
                    >
                      Ver cadastro criado
                    </Link>
                  )}
                  {current.status === 'pending' && (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        disabled={action.busy}
                        onClick={() => void action.run(convert)}
                      >
                        Criar cadastro pendente
                      </Button>
                      <Button
                        variant="outline"
                        disabled={action.busy}
                        onClick={() =>
                          void action.run(async () => {
                            await checked(
                              supabase
                                .from('suggestions')
                                .update({ status: 'archived' })
                                .eq('id', current.id),
                            )
                            await audit(
                              user!.id,
                              'suggestion_archived',
                              'suggestions',
                              current.id,
                              { notes },
                            )
                            resource.reload()
                          })
                        }
                      >
                        Arquivar
                      </Button>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </>
        )}
      </ResourceState>
    </PageContent>
  )
}
