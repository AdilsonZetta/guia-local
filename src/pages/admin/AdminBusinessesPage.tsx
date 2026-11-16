import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { BusinessStatus } from '@/lib/database.types'
import { slugify } from '@/lib/utils'
import { checked, useAction, audit, csv } from '@/lib/management'
import {
  Status,
  Feedback,
  TextField,
  Metrics,
} from '@/components/Management'
import {
  BUSINESS_PAGE_SIZE,
  collectBusinesses,
  loadAdminBusinessCounts,
  searchBusinesses,
} from '@/lib/business-search'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

import { PageContent, EmptyState, LoadError } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Select, Textarea, Input } from '@/components/ui/Input'
import { NeighborhoodSelect } from '@/components/ui/NeighborhoodSelect'
import { Modal } from '@/components/ui/Modal'
import { CardSkeleton } from '@/components/ui/Skeleton'
const PAGE_SIZE = BUSINESS_PAGE_SIZE
export function AdminBusinessesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('status') ?? '')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 350)
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(params.get('id'))
  const [notes, setNotes] = useState('')
  const [create, setCreate] = useState(false)
  const [draftNeighborhood, setDraftNeighborhood] = useState('')
  const [exporting, setExporting] = useState(false)
  const action = useAction()
  const categories = useQuery({
    queryKey: ['admin-categories'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order')
        .order('name')
      if (error) throw error
      return data
    },
  })
  const neighborhoods = useQuery({
    queryKey: ['admin-neighborhoods'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('neighborhoods')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
  const counts = useQuery({
    queryKey: ['admin-counts'],
    queryFn: loadAdminBusinessCounts,
    staleTime: 30_000,
  })
  const list = useQuery({
    queryKey: ['admin-businesses', tab, debouncedSearch, category, page],
    placeholderData: (previous) => previous,
    queryFn: () =>
      searchBusinesses({
        query: debouncedSearch,
        category: category || null,
        status: tab || null,
        includeInactive: true,
        sort: 'recent',
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
  })
  const detail = useQuery({
    queryKey: ['admin-business', selected],
    enabled: Boolean(selected),
    queryFn: async () => {
      const result = await searchBusinesses({
        ids: [selected!],
        includeInactive: true,
        limit: 1,
        offset: 0,
      })
      return result.rows[0] ?? null
    },
  })
  const areas = useQuery({
    queryKey: ['admin-business-areas', selected],
    enabled: Boolean(selected),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_service_areas')
        .select('*')
        .eq('business_id', selected!)
      if (error) throw error
      return data
    },
  })
  const current = detail.data ?? list.data?.rows.find((row) => row.id === selected) ?? null
  const owner = useQuery({
    queryKey: ['admin-owner', current?.owner_id],
    enabled: Boolean(current?.owner_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name')
        .eq('id', current!.owner_id!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
  const rows = list.data?.rows ?? []
  const total = list.data?.total ?? 0
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-counts'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-business', selected] }),
      queryClient.invalidateQueries({ queryKey: ['admin-business-areas', selected] }),
    ])
  }
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
    await refresh()
  }
  return (
    <PageContent
      title="Empresas"
      description="Gerencie os cadastros e conecte negócios aos moradores."
    >
      <Feedback action={action} />
      {counts.data && (
          <Metrics
            items={[
              ['Total', counts.data.total],
              ['Ativos', counts.data.active],
              ['Pendentes', counts.data.pending],
              ['Pausados', counts.data.paused],
            ]}
          />
        )}
        <div className="management-actions">
          <Link className="btn-outline" to="/admin/empresas/indicacoes">
            Indicações
          </Link>
          <Button
            variant="outline"
            disabled={exporting}
            onClick={() => {
              setExporting(true)
              void collectBusinesses({
                query: debouncedSearch,
                category: category || null,
                status: tab || null,
                includeInactive: true,
                sort: 'recent',
              })
                .then((exported) => {
                  csv(
                    'empresas.csv',
                    exported.map((business) => ({
                      id: business.id,
                      name: business.name,
                      slug: business.slug,
                      status: business.status,
                      category: business.categories?.name ?? '',
                      neighborhood: business.neighborhoods?.name ?? '',
                      phone: business.phone ?? '',
                      whatsapp: business.whatsapp ?? '',
                      address: business.address ?? '',
                      google_rating: business.google_rating ?? '',
                      google_review_count: business.google_review_count ?? '',
                      google_category: business.google_category ?? '',
                      created_at: business.created_at,
                    })),
                    [
                      'id',
                      'name',
                      'slug',
                      'status',
                      'category',
                      'neighborhood',
                      'phone',
                      'whatsapp',
                      'address',
                      'google_rating',
                      'google_review_count',
                      'google_category',
                      'created_at',
                    ],
                  )
                })
                .finally(() => setExporting(false))
            }}
          >
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </Button>
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
              {key === 'pending' ? ` (${counts.data?.pending ?? 0})` : ''}
            </Button>
          ))}
          <Button
            onClick={() => {
              setDraftNeighborhood('')
              setCreate(true)
            }}
          >
            + Novo cadastro
          </Button>
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
            {categories.data?.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        {list.isLoading ? (
          <CardSkeleton count={3} />
        ) : list.isError ? (
          <LoadError
            message="Não foi possível carregar os dados. Tente novamente."
            retry={() => void list.refetch()}
          />
        ) : (
          <>
        {!rows.length && <EmptyState title="Nenhuma empresa encontrada" />}
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
              {rows.map((b) => (
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
                    {b.categories?.name ?? '—'}
                  </td>
                  <td className="p-4">
                    {b.neighborhoods?.name || '—'}
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
            Página {page} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <Button
            variant="outline"
            disabled={page * PAGE_SIZE >= total}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
          </>
        )}
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
                  current.categories?.name,
                ],
                [
                  'Bairro',
                  current.neighborhoods?.name,
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
                  owner.data?.full_name || 'Não vinculado',
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
              {(areas.data ?? []).map((area) => (
                  <span className="status-chip receiving" key={area.neighborhood_id}>
                    {neighborhoods.data?.find((item) => item.id === area.neighborhood_id)?.name}
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
                      await refresh()
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
      {create && categories.data && neighborhoods.data && (
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
                await refresh()
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
                {categories.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bairro">
              <NeighborhoodSelect
                required
                name="neighborhood"
                placeholder="Selecione"
                ariaLabel="Bairro"
                neighborhoods={neighborhoods.data}
                value={draftNeighborhood}
                onChange={setDraftNeighborhood}
              />
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
