import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import type { BusinessStatus } from '@/lib/database.types'
import { slugify } from '@/lib/utils'
import { all, checked, useAction, audit } from '@/lib/management'
import {
  ResourceState,
  Status,
  Feedback,
  TextField,
  Metrics,
} from '@/components/Management'

import { PageContent, EmptyState } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Select, Textarea, Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
export function AdminBusinessesPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('status') ?? '')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(params.get('id'))
  const [notes, setNotes] = useState('')
  const [create, setCreate] = useState(false)
  const action = useAction()
  const resource = useResource(async () => {
    const [businesses, categories, neighborhoods, profiles, areas] =
      await Promise.all([
        all('businesses'),
        all('categories'),
        all('neighborhoods'),
        all('profiles'),
        all('business_service_areas'),
      ])
    return {
      businesses: businesses.sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ),
      categories,
      neighborhoods,
      profiles,
      areas,
    }
  })
  const d = resource.data
  const current = d?.businesses.find((b) => b.id === selected)
  const rows = d?.businesses.filter(
    (b) =>
      (!tab || b.status === tab) &&
      (!category || b.category_id === category) &&
      b.name
        .toLocaleLowerCase('pt-BR')
        .includes(search.toLocaleLowerCase('pt-BR')),
  )
  async function moderate(status: BusinessStatus) {
    if (!current) return
    if (['adjustments_requested', 'rejected'].includes(status) && !notes.trim())
      throw new Error('Informe as orientações ou o motivo da decisão.')
    await checked(
      supabase
        .from('businesses')
        .update({
          status,
          adjustment_notes: notes.trim() || null,
          ...(status === 'active'
            ? { approved_at: new Date().toISOString(), approved_by: user!.id }
            : {}),
        })
        .eq('id', current.id)
        .select('id')
        .single(),
    )
    await audit(user!.id, `business_${status}`, 'businesses', current.id, {
      notes,
    })
    resource.reload()
  }
  return (
    <PageContent
      title="Empresas"
      description="Gerencie os cadastros e conecte negócios aos moradores."
    >
      <Feedback action={action} />
      <ResourceState resource={resource}>
        {d && (
          <Metrics
            items={[
              ['Total', d.businesses.length],
              [
                'Ativos',
                d.businesses.filter(
                  (b) => b.status === 'active' && !b.is_paused,
                ).length,
              ],
              [
                'Pendentes',
                d.businesses.filter((b) => b.status === 'pending').length,
              ],
              ['Pausados', d.businesses.filter((b) => b.is_paused).length],
            ]}
          />
        )}
        <div className="management-actions">
          <Link className="btn-outline" to="/admin/empresas/indicacoes">
            Indicações
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ['', 'Todos'],
            ['pending', 'Pendentes'],
            ['active', 'Ativos'],
            ['adjustments_requested', 'Ajustes'],
          ].map(([key, label]) => (
            <Button
              key={key}
              variant={tab === key ? 'primary' : 'outline'}
              onClick={() => {
                setTab(key!)
                setPage(1)
              }}
            >
              {label}
              {key === 'pending'
                ? ` (${d?.businesses.filter((b) => b.status === 'pending').length ?? 0})`
                : ''}
            </Button>
          ))}
          <Button onClick={() => setCreate(true)}>+ Novo cadastro</Button>
        </div>
        <TextField
          label="Buscar por nome"
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
        />
        <Field label="Categoria">
          <Select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Todas as categorias</option>
            {d?.categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        {!rows?.length && <EmptyState title="Nenhuma empresa encontrada" />}
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="p-4">Empresa</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Região</th>
                <th className="p-4">Status</th>
                <th className="p-4">Análise</th>
              </tr>
            </thead>
            <tbody>
              {rows?.slice((page - 1) * 10, page * 10).map((b) => (
                <tr className="border-t border-line" key={b.id}>
                  <td className="p-4 font-bold">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-brand-soft text-brand">
                        {b.logo_url ? (
                          <img
                            className="h-full w-full object-cover"
                            src={b.logo_url}
                            alt=""
                          />
                        ) : (
                          b.name[0]
                        )}
                      </span>
                      <div>
                        {b.name}
                        <p className="max-w-60 truncate text-xs font-normal text-muted">
                          {b.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {d?.categories.find((c) => c.id === b.category_id)?.name ??
                      '—'}
                  </td>
                  <td className="p-4">
                    {d?.neighborhoods.find((n) => n.id === b.neighborhood_id)
                      ?.name || '—'}
                  </td>
                  <td className="p-4">
                    <Status value={b.status} />
                  </td>
                  <td className="p-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelected(b.id)
                        setNotes(b.adjustment_notes ?? '')
                      }}
                    >
                      Analisar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="flex justify-end items-center gap-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted">
            Página {page} de {Math.max(1, Math.ceil((rows?.length ?? 0) / 10))}
          </span>
          <Button
            variant="outline"
            disabled={page * 10 >= (rows?.length ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      </ResourceState>
      {current && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setSelected(null)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Analisar empresa"
            className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <h2 className="text-2xl font-bold">Analisar cadastro</h2>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Fechar
              </Button>
            </div>
            <Feedback action={action} />
            {current.cover_url && (
              <img
                className="h-40 w-full rounded-xl object-cover"
                src={current.cover_url}
                alt="Capa"
              />
            )}
            <h2>{current.name}</h2>
            <Status value={current.status} />
            {current.logo_url && (
              <img
                src={current.logo_url}
                alt="Logo"
                className="h-24 w-24 object-cover rounded-xl"
              />
            )}
            <dl className="space-y-2">
              {[
                [
                  'Categoria',
                  d?.categories.find((c) => c.id === current.category_id)?.name,
                ],
                [
                  'Bairro',
                  d?.neighborhoods.find((n) => n.id === current.neighborhood_id)
                    ?.name,
                ],
                ['Descrição', current.description],
                ['Endereço', current.address],
                [
                  'Atendimento',
                  current.attendance_type === 'client_address'
                    ? 'No endereço do cliente'
                    : current.attendance_type === 'both'
                      ? 'Ambos'
                      : 'No endereço do negócio',
                ],
                ['WhatsApp', current.whatsapp],
                ['Telefone', current.phone],
                ['E-mail', current.email],
                ['Site', current.website],
                [
                  'Responsável',
                  d?.profiles.find((p) => p.id === current.owner_id)
                    ?.full_name || 'Não vinculado',
                ],
                [
                  'Cadastro',
                  new Date(current.created_at).toLocaleString('pt-BR'),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-muted">{label}</dt>
                  <dd className="whitespace-pre-wrap break-words">
                    {value || '—'}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2">
              {d?.areas
                .filter((a) => a.business_id === current.id)
                .map((a) => (
                  <span
                    className="status-chip receiving"
                    key={a.neighborhood_id}
                  >
                    {
                      d.neighborhoods.find((n) => n.id === a.neighborhood_id)
                        ?.name
                    }
                  </span>
                ))}
            </div>
            {(['contact_verified', 'owner_verified'] as const).map((key) => (
              <label className="flex items-center gap-3" key={key}>
                <input
                  type="checkbox"
                  disabled={action.busy}
                  checked={current[key]}
                  onChange={(e) => {
                    const value = e.target.checked
                    void action.run(async () => {
                      await checked(
                        supabase
                          .from('businesses')
                          .update(
                            key === 'contact_verified'
                              ? { contact_verified: value }
                              : { owner_verified: value },
                          )
                          .eq('id', current.id),
                      )
                      resource.reload()
                    })
                  }}
                />
                {key === 'contact_verified'
                  ? 'Contato conferido'
                  : 'Responsável confirmado'}
              </label>
            ))}
            {current.adjustment_notes && (
              <p className="bg-brand-soft p-3 rounded-xl">
                Orientações atuais: {current.adjustment_notes}
              </p>
            )}
            <Field label="Orientações ou motivo da decisão">
              <Textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['active', 'Aprovar cadastro'],
                  ['adjustments_requested', 'Solicitar ajustes'],
                  ['rejected', 'Rejeitar'],
                  ['archived', 'Arquivar'],
                ] as const
              ).map(([status, label]) => (
                <Button
                  key={status}
                  disabled={action.busy}
                  variant={status === 'rejected' ? 'danger' : 'primary'}
                  onClick={() => void action.run(() => moderate(status))}
                >
                  {label}
                </Button>
              ))}
            </div>
          </aside>
        </div>
      )}
      {create && d && (
        <Modal
          title="Novo cadastro"
          onClose={() => {
            if (!action.busy) setCreate(false)
          }}
        >
          <form
            className="max-h-[75vh] overflow-y-auto space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              void action.run(async () => {
                const name = String(form.get('name')).trim()
                const email = String(form.get('owner_email')).trim()
                let owner_id: string | null = null
                if (email) {
                  const owner = await checked(
                    supabase
                      .from('profiles')
                      .select('id')
                      .eq('email', email.toLowerCase())
                      .maybeSingle(),
                  )
                  if (!owner)
                    throw new Error(
                      'O responsável precisa ter uma conta com esse e-mail.',
                    )
                  owner_id = owner.id
                }
                const status = String(form.get('status')) as BusinessStatus
                const business = await checked(
                  supabase
                    .from('businesses')
                    .insert({
                      name,
                      slug: `${slugify(name)}-${crypto.randomUUID().slice(0, 8)}`,
                      owner_id,
                      category_id: String(form.get('category')) || null,
                      neighborhood_id: String(form.get('neighborhood')) || null,
                      whatsapp: String(form.get('whatsapp')),
                      status,
                      ...(status === 'active'
                        ? {
                            approved_at: new Date().toISOString(),
                            approved_by: user!.id,
                          }
                        : {}),
                    })
                    .select('id')
                    .single(),
                )
                await audit(
                  user!.id,
                  'business_created',
                  'businesses',
                  business.id,
                  { status },
                )
                setCreate(false)
                resource.reload()
              })
            }}
          >
            <Feedback action={action} />
            <Field label="Nome">
              <Input required name="name" />
            </Field>
            <Field label="Categoria">
              <Select name="category" required>
                <option value="">Selecione</option>
                {d.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bairro">
              <Select name="neighborhood" required>
                <option value="">Selecione</option>
                {d.neighborhoods.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="WhatsApp">
              <Input name="whatsapp" type="tel" required />
            </Field>
            <Field label="E-mail do responsável (opcional)">
              <Input name="owner_email" type="email" />
            </Field>
            <Field label="Status inicial">
              <Select name="status">
                <option value="pending">Pendente</option>
                <option value="active">Ativo</option>
              </Select>
            </Field>
            <Button disabled={action.busy} type="submit">
              Criar cadastro
            </Button>
          </form>
        </Modal>
      )}
    </PageContent>
  )
}
