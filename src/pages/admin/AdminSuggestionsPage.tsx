import { useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import { slugify } from '@/lib/utils'
import { all, checked, useAction, audit } from '@/lib/management'
import { ResourceState, Status, Feedback } from '@/components/Management'

import { PageContent, EmptyState } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select, Field } from '@/components/ui/Input'
export function AdminSuggestionsPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState('pending')
  const action = useAction()
  const resource = useResource(async () => {
    const [suggestions, categories, neighborhoods] = await Promise.all([
      all('suggestions'),
      all('categories'),
      all('neighborhoods'),
    ])
    return {
      suggestions: suggestions.sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
      categories,
      neighborhoods,
    }
  })
  const d = resource.data
  const rows = d?.suggestions.filter((s) => !status || s.status === status)
  return (
    <PageContent title="Indicações">
      <Feedback action={action} />
      <ResourceState resource={resource}>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="pending">Pendentes</option>
            <option value="registration_created">Cadastros criados</option>
            <option value="archived">Arquivadas</option>
          </Select>
        </Field>
        {!rows?.length && <EmptyState title="Nenhuma indicação neste filtro" />}
        {rows?.map((s) => (
          <Card key={s.id} className="p-5 space-y-3">
            <div className="flex justify-between gap-2">
              <h2 className="font-bold text-lg">{s.business_name}</h2>
              <Status value={s.status} />
            </div>
            <p>
              {d?.categories.find((c) => c.id === s.category_id)?.name} ·{' '}
              {d?.neighborhoods.find((n) => n.id === s.neighborhood_id)?.name}
            </p>
            <p>Telefone: {s.phone || 'Não informado'}</p>
            <p className="whitespace-pre-wrap">{s.notes}</p>
            <p className="text-sm text-muted">
              Indicação de {s.suggester_name || 'Visitante'} ·{' '}
              {s.suggester_contact || 'Sem contato'} ·{' '}
              {new Date(s.created_at).toLocaleDateString('pt-BR')}
            </p>
            {s.created_business_id && (
              <a
                className="text-brand font-bold"
                href={`/guia-local/admin/empresas?id=${s.created_business_id}`}
              >
                Ver cadastro criado
              </a>
            )}
            {s.status === 'pending' && (
              <div className="flex gap-2">
                <Button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      const fresh = await checked(
                        supabase
                          .from('suggestions')
                          .select('*')
                          .eq('id', s.id)
                          .single(),
                      )
                      if (fresh.status !== 'pending')
                        throw new Error(
                          'Esta indicação já foi processada. Atualize a página.',
                        )
                      const created = await checked(
                        supabase
                          .from('businesses')
                          .insert({
                            name: s.business_name,
                            slug: `${slugify(s.business_name)}-${crypto.randomUUID().slice(0, 8)}`,
                            category_id: s.category_id,
                            neighborhood_id: s.neighborhood_id,
                            phone: s.phone,
                            whatsapp: s.phone,
                            description: s.notes,
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
                            .eq('id', s.id)
                            .eq('status', 'pending')
                            .select('id')
                            .single(),
                        )
                      } catch (error) {
                        await supabase
                          .from('businesses')
                          .delete()
                          .eq('id', created.id)
                        throw error
                      }
                      await audit(
                        user!.id,
                        'suggestion_registration_created',
                        'suggestions',
                        s.id,
                        { business_id: created.id },
                      )
                      resource.reload()
                    })
                  }
                >
                  Criar cadastro
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
                          .eq('id', s.id),
                      )
                      await audit(
                        user!.id,
                        'suggestion_archived',
                        'suggestions',
                        s.id,
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
        ))}
      </ResourceState>
    </PageContent>
  )
}
