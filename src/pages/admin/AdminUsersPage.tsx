import { Link, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProvider'
import { useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { all, checked, useAction, csv, audit } from '@/lib/management'
import { businessesForOwners, loadAdminBusinessCounts } from '@/lib/business-search'
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
import { Field, Select, Textarea } from '@/components/ui/Input'
export function AdminUsersPage() {
  const { user } = useAuth()
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [params] = useSearchParams()
  const [selected, setSelected] = useState<string | null>(params.get('id'))
  const [page, setPage] = useState(1)
  const [reason, setReason] = useState('')
  const action = useAction()
  const resource = useResource(() => all('profiles'))
  const counts = useQuery({
    queryKey: ['admin-counts'],
    queryFn: loadAdminBusinessCounts,
    staleTime: 60_000,
  })
  const related = useResource(async () => {
    const [reviews, favorites] = await Promise.all([
      all('reviews'),
      all('favorites'),
    ])
    return { reviews, favorites }
  })
  const rows = resource.data?.filter(
    (p) =>
      (!role || p.role === role) &&
      (!status || p.status === status) &&
      `${p.full_name ?? ''} ${p.email} ${p.phone ?? ''}`
        .toLocaleLowerCase('pt-BR')
        .includes(search.toLocaleLowerCase('pt-BR')),
  )
  const pageRows = rows?.slice((page - 1) * 10, page * 10) ?? []
  const owned = useQuery({
    queryKey: ['admin-owned', pageRows.map((profile) => profile.id).join(',')],
    enabled: pageRows.length > 0,
    queryFn: () => businessesForOwners(pageRows.map((profile) => profile.id)),
  })
  const current = resource.data?.find((p) => p.id === selected)
  return (
    <PageContent title="Usuários">
      <Feedback action={action} />
      <ResourceState resource={resource}>
        {resource.data && (
          <Metrics
            items={[
              ['Usuários', resource.data.length],
              [
                'Ativos',
                resource.data.filter((p) => p.status === 'active').length,
              ],
              [
                'Suspensos',
                resource.data.filter((p) => p.status === 'suspended').length,
              ],
              [
                'Responsáveis por negócios',
                counts.data?.owners ?? 0,
              ],
            ]}
          />
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField
            label="Buscar nome, e-mail ou telefone"
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
          />
          <Field label="Papel">
            <Select
              value={role}
              onChange={(e) => {
                setRole(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos</option>
              <option value="admin">Administrador</option>
              <option value="business">Empresa</option>
              <option value="client">Morador</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos</option>
              <option value="active">Ativo</option>
              <option value="suspended">Suspenso</option>
            </Select>
          </Field>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            csv('usuarios.csv', rows ?? [], [
              'id',
              'full_name',
              'email',
              'phone',
              'role',
              'status',
              'suspension_reason',
              'deletion_requested_at',
              'created_at',
            ])
          }
        >
          Exportar usuários filtrados em CSV
        </Button>
        {!rows?.length && <EmptyState title="Nenhum usuário encontrado" />}
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-canvas">
              <tr>
                <th className="p-4">Nome e e-mail</th>
                <th className="p-4">Papel</th>
                <th className="p-4">Status</th>
                <th className="p-4">Negócio vinculado</th>
                <th className="p-4">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr className="border-t border-line" key={p.id}>
                  <td className="p-4">
                    <p className="font-bold">{p.full_name || 'Sem nome'}</p>
                    <p className="text-muted">{p.email}</p>
                    {p.deletion_requested_at && (
                      <p className="text-danger">Exclusão solicitada</p>
                    )}
                  </td>
                  <td className="p-4">
                    <Status value={p.role} />
                  </td>
                  <td className="p-4">
                    <Status value={p.status} />
                  </td>
                  <td className="p-4">
                    {owned.data
                      ?.filter((business) => business.owner_id === p.id)
                      .map((business) => business.name)
                      .join(', ') || '—'}
                  </td>
                  <td className="p-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelected(p.id)
                        setReason(p.suspension_reason ?? '')
                      }}
                    >
                      Ver detalhes
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
          <span className="text-muted text-sm">Página {page}</span>
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
            aria-label="Detalhes do usuário"
            className="ml-auto h-full w-full max-w-lg overflow-y-auto bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <h2 className="text-xl font-bold">
                {current.full_name || 'Usuário'}
              </h2>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Fechar
              </Button>
            </div>
            <Feedback action={action} />
            <p>{current.email}</p>
            <p>Telefone: {current.phone || 'Não informado'}</p>
            <div className="flex gap-2">
              <Status value={current.role} />
              <Status value={current.status} />
            </div>
            <p className="text-muted">
              Cadastro: {new Date(current.created_at).toLocaleString('pt-BR')}
            </p>
            {current.deletion_requested_at && (
              <p className="text-danger">
                Pedido de exclusão:{' '}
                {new Date(current.deletion_requested_at).toLocaleString(
                  'pt-BR',
                )}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-brand-soft p-4">
                <strong>
                  {related.data?.reviews.filter((r) => r.user_id === current.id)
                    .length ?? 0}
                </strong>
                <p>Avaliações</p>
              </div>
              <div className="rounded-xl bg-canvas p-4">
                <strong>
                  {related.data?.favorites.filter(
                    (f) => f.user_id === current.id,
                  ).length ?? 0}
                </strong>
                <p>Favoritos</p>
              </div>
            </div>
            <Link
              className="text-brand"
              to={`/admin/avaliacoes?user=${current.id}`}
            >
              Ver avaliações →
            </Link>
            <Field label="Motivo da alteração">
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Button
              variant={current.status === 'active' ? 'danger' : 'primary'}
              disabled={action.busy || current.id === user?.id}
              onClick={() =>
                void action.run(async () => {
                  if (current.id === user?.id)
                    throw new Error(
                      'Você não pode suspender sua própria conta.',
                    )
                  const next =
                    current.status === 'active' ? 'suspended' : 'active'
                  if (next === 'suspended' && !reason.trim())
                    throw new Error('Informe o motivo da suspensão.')
                  await checked(
                    supabase
                      .from('profiles')
                      .update({
                        status: next,
                        suspension_reason:
                          next === 'suspended' ? reason.trim() : null,
                      })
                      .eq('id', current.id)
                      .select('id')
                      .single(),
                  )
                  await audit(
                    user!.id,
                    `user_${next}`,
                    'profiles',
                    current.id,
                    { reason },
                  )
                  resource.reload()
                })
              }
            >
              {current.status === 'active'
                ? 'Suspender acesso'
                : 'Reativar usuário'}
            </Button>
            {current.id === user?.id && (
              <p className="text-sm text-muted">
                Sua conta não pode ser suspensa por você.
              </p>
            )}
          </aside>
        </div>
      )}
    </PageContent>
  )
}
