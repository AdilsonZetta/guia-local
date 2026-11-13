import { CategoryIcon } from '@/components/CategoryIcon'
import { Photo } from '@/components/Photo'
import { Pencil, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'
import { useResource } from '@/lib/public-data'
import { PageContent, EmptyState } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { checked, businessRows, useAction, upload } from '@/lib/management'
import {
  BusinessGate,
  ResourceState,
  Feedback,
  TextField,
  Toggle,
  Reorder,
} from '@/components/Management'

import { formatCurrency } from '@/lib/utils'
export function BusinessServicesPage() {
  return (
    <BusinessGate>
      <Services />
    </BusinessGate>
  )
}
function Services() {
  const { business: b, refreshProfile } = useAuth()
  const action = useAction()
  const [edit, setEdit] = useState<Partial<Tables<'services'>> | null>(null)
  const resource = useResource(async () => {
    const [services, photos] = await Promise.all([
      businessRows('services', b!.id),
      businessRows('business_photos', b!.id),
    ])
    services.sort(
      (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
    )
    photos.sort(
      (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id),
    )
    return { services, photos }
  }, [b?.id])
  const d = resource.data
  async function move(
    table: 'services' | 'business_photos',
    index: number,
    dir: number,
  ) {
    const rows = table === 'services' ? d!.services : d!.photos
    const ordered = [...rows]
    ;[ordered[index], ordered[index + dir]] = [
      ordered[index + dir]!,
      ordered[index]!,
    ]
    for (let i = 0; i < ordered.length; i++)
      await checked(
        supabase
          .from(table)
          .update({ sort_order: i })
          .eq('id', ordered[i]!.id)
          .eq('business_id', b!.id),
      )
    resource.reload()
  }
  async function uploadPhotos(files: File[]) {
    await action.run(async () => {
      for (let i = 0; i < files.length; i++) {
        const image = await upload(files[i]!, 'business-photos', b!.id)
        try {
          await checked(
            supabase.from('business_photos').insert({
              business_id: b!.id,
              url: image.url,
              storage_path: image.path,
              sort_order: (d?.photos.length ?? 0) + i,
              alt: files[i]!.name,
            }),
          )
        } catch (error) {
          await supabase.storage.from('business-photos').remove([image.path])
          throw error
        }
      }
      resource.reload()
    })
  }
  return (
    <PageContent
      title="Serviços e fotos"
      description="Mostre o que você faz e os resultados do seu trabalho."
    >
      <Feedback action={action} />
      <ResourceState resource={resource}>
        <div className="management-actions">
          <Button
            onClick={() =>
              setEdit({
                name: '',
                description: '',
                price: null,
                price_label: '',
                active: true,
                sort_order: d?.services.length ?? 0,
              })
            }
          >
            + Adicionar serviço
          </Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-[.85fr_1.1fr]">
          <section className="management-section space-y-4">
            <h2>Serviços oferecidos</h2>
            <p className="text-muted">
              {d?.services.length ?? 0} serviços cadastrados
            </p>
            {!d?.services.length && (
              <EmptyState title="Nenhum serviço cadastrado" />
            )}
            {d?.services.map((s, i) => (
              <Card key={s.id} className="service-row p-4 space-y-2">
                <span className="metric-icon">
                  <CategoryIcon name={s.icon || 'home'} />
                </span>
                <div>
                  <h2 className="font-bold">{s.name}</h2>
                  <p>{s.description}</p>
                  <p className="text-sm text-muted">
                    {s.price_label || formatCurrency(s.price)}
                  </p>
                </div>
                <span className="status-chip receiving">
                  ● {s.active ? 'Ativo' : 'Inativo'}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setEdit(s)}>
                    <Pencil size={19} />
                    <span className="sr-only">Editar</span>
                  </Button>
                  <details>
                    <summary className="text-xs text-muted cursor-pointer">
                      Mais
                    </summary>
                    <Reorder
                      index={i}
                      total={d.services.length}
                      disabled={action.busy}
                      onMove={(dir) =>
                        void action.run(() => move('services', i, dir))
                      }
                    />
                    <Button
                      disabled={action.busy}
                      variant="danger"
                      onClick={() => {
                        if (window.confirm('Excluir este serviço?'))
                          void action.run(async () => {
                            await checked(
                              supabase
                                .from('services')
                                .delete()
                                .eq('id', s.id)
                                .eq('business_id', b!.id),
                            )
                            resource.reload()
                          })
                      }}
                    >
                      Excluir
                    </Button>
                  </details>
                </div>
              </Card>
            ))}
            <Button
              className="w-full"
              variant="outline"
              onClick={() =>
                setEdit({
                  name: '',
                  description: '',
                  active: true,
                  sort_order: d?.services.length ?? 0,
                })
              }
            >
              + Adicionar outro serviço
            </Button>
          </section>
          <section className="management-section space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h2>Fotos dos trabalhos</h2>
              <label
                className="btn-outline cursor-pointer text-sm"
                htmlFor="business-photo-upload"
              >
                + Adicionar fotos
              </label>
            </div>
            <p className="text-muted">
              {d?.photos.length ?? 0} fotos • organize a ordem de exibição
            </p>
            <div
              className="photo-upload order-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (!action.busy)
                  void uploadPhotos(Array.from(e.dataTransfer.files))
              }}
            >
              <UploadCloud size={36} />
              <Field label="Arraste fotos aqui">
                <label
                  className="cursor-pointer font-bold text-brand"
                  htmlFor="business-photo-upload"
                >
                  ou selecione arquivos
                </label>
                <Input
                  className="hidden"
                  id="business-photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={action.busy}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    e.target.value = ''
                    void uploadPhotos(files)
                  }}
                />
              </Field>
              <p className="text-xs text-muted">
                JPG, PNG ou WebP • até 5 MB por imagem
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {d?.photos.map((p, i) => (
                <Card key={p.id} className="overflow-hidden relative">
                  {p.is_cover && (
                    <span className="absolute left-2 top-2 rounded-md bg-brand px-3 py-1 text-xs text-white">
                      Capa
                    </span>
                  )}
                  <Photo
                    src={p.url}
                    alt={p.alt ?? 'Foto da empresa'}
                    className="h-44 w-full object-cover"
                  />
                  <p className="px-2 pt-2 text-xs text-muted">
                    {p.alt || 'Foto do trabalho'}
                  </p>
                  <details className="p-2">
                    <summary className="cursor-pointer text-sm text-brand">
                      ••• Opções
                    </summary>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Field label="Legenda">
                        <Input
                          defaultValue={p.alt || ''}
                          onBlur={(e) => {
                            const alt = e.target.value
                            if (alt !== (p.alt || ''))
                              void action.run(async () => {
                                await checked(
                                  supabase
                                    .from('business_photos')
                                    .update({ alt })
                                    .eq('id', p.id)
                                    .eq('business_id', b!.id),
                                )
                                resource.reload()
                              })
                          }}
                        />
                      </Field>
                      <Button
                        disabled={action.busy}
                        variant={p.is_cover ? 'primary' : 'outline'}
                        onClick={() =>
                          void action.run(async () => {
                            await checked(
                              supabase
                                .from('business_photos')
                                .update({ is_cover: false })
                                .eq('business_id', b!.id),
                            )
                            await checked(
                              supabase
                                .from('business_photos')
                                .update({ is_cover: true })
                                .eq('id', p.id),
                            )
                            await checked(
                              supabase
                                .from('businesses')
                                .update({ cover_url: p.url })
                                .eq('id', b!.id),
                            )
                            await refreshProfile()
                            resource.reload()
                          })
                        }
                      >
                        {p.is_cover ? 'Capa atual' : 'Definir capa'}
                      </Button>
                      <Reorder
                        index={i}
                        total={d.photos.length}
                        disabled={action.busy}
                        onMove={(dir) =>
                          void action.run(() => move('business_photos', i, dir))
                        }
                      />
                      <Button
                        variant="danger"
                        disabled={action.busy}
                        onClick={() => {
                          if (window.confirm('Excluir esta foto?'))
                            void action.run(async () => {
                              if (p.storage_path)
                                await checked(
                                  supabase.storage
                                    .from('business-photos')
                                    .remove([p.storage_path]),
                                )
                              await checked(
                                supabase
                                  .from('business_photos')
                                  .delete()
                                  .eq('id', p.id),
                              )
                              if (b!.cover_url === p.url) {
                                await checked(
                                  supabase
                                    .from('businesses')
                                    .update({ cover_url: null })
                                    .eq('id', b!.id),
                                )
                                await refreshProfile()
                              }
                              resource.reload()
                            })
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </details>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted order-3">
              Publique fotos dos seus próprios trabalhos. As alterações são
              salvas automaticamente.
            </p>
          </section>
        </div>
        <div className="management-actions management-footer-actions">
          <Button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                for (const [table, rows] of [
                  ['services', d?.services ?? []],
                  ['business_photos', d?.photos ?? []],
                ] as const) {
                  for (let i = 0; i < rows.length; i++)
                    await checked(
                      supabase
                        .from(table)
                        .update({ sort_order: i })
                        .eq('id', rows[i]!.id)
                        .eq('business_id', b!.id),
                    )
                }
                await refreshProfile()
                resource.reload()
              })
            }
          >
            Salvar alterações
          </Button>
        </div>
      </ResourceState>
      {edit && (
        <Modal
          title={edit.id ? 'Editar serviço' : 'Novo serviço'}
          onClose={() => setEdit(null)}
        >
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void action.run(async () => {
                const values = { ...edit, business_id: b!.id }
                if (edit.id)
                  await checked(
                    supabase
                      .from('services')
                      .update(values)
                      .eq('id', edit.id)
                      .eq('business_id', b!.id),
                  )
                else await checked(supabase.from('services').insert(values))
                setEdit(null)
                resource.reload()
              })
            }}
          >
            <TextField
              label="Nome"
              required
              value={edit.name}
              onChange={(v) => setEdit({ ...edit, name: v })}
            />
            <Field label="Descrição">
              <Textarea
                value={edit.description ?? ''}
                onChange={(e) =>
                  setEdit({ ...edit, description: e.target.value })
                }
              />
            </Field>
            <Field label="Preço (R$)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={edit.price ?? ''}
                onChange={(e) =>
                  setEdit({
                    ...edit,
                    price:
                      e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <TextField
              label="Texto do preço (ex.: a partir de R$ 50)"
              value={edit.price_label}
              onChange={(v) => setEdit({ ...edit, price_label: v })}
            />
            <TextField
              label="Ordem"
              type="number"
              value={edit.sort_order}
              onChange={(v) => setEdit({ ...edit, sort_order: Number(v) })}
            />
            <Toggle
              label="Ativo"
              checked={edit.active ?? true}
              onChange={(v) => setEdit({ ...edit, active: v })}
            />
            <Button type="submit" disabled={action.busy}>
              Salvar serviço
            </Button>
          </form>
        </Modal>
      )}
    </PageContent>
  )
}
