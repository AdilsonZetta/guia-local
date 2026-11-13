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
  return (
    <PageContent title="Serviços e fotos">
      <Feedback action={action} />
      <ResourceState resource={resource}>
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
          Novo serviço
        </Button>
        {!d?.services.length && (
          <EmptyState title="Nenhum serviço cadastrado" />
        )}
        {d?.services.map((s, i) => (
          <Card key={s.id} className="p-4 space-y-2">
            <h2 className="font-bold">
              {s.name} {!s.active && '(Inativo)'}
            </h2>
            <p>{s.description}</p>
            <p>{s.price_label || formatCurrency(s.price) || 'Sob consulta'}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEdit(s)}>
                Editar
              </Button>
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
            </div>
          </Card>
        ))}
        <h2 className="text-xl font-bold">Galeria de fotos</h2>
        <Field label="Enviar fotos (até 5 MB por imagem)">
          <Input
            type="file"
            accept="image/*"
            multiple
            disabled={action.busy}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              e.target.value = ''
              void action.run(async () => {
                for (let i = 0; i < files.length; i++) {
                  const image = await upload(
                    files[i]!,
                    'business-photos',
                    b!.id,
                  )
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
                    await supabase.storage
                      .from('business-photos')
                      .remove([image.path])
                    throw error
                  }
                }
                resource.reload()
              })
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {d?.photos.map((p, i) => (
            <Card key={p.id} className="overflow-hidden">
              <img
                src={p.url}
                alt={p.alt ?? 'Foto da empresa'}
                className="h-44 w-full object-cover"
              />
              <div className="p-3 flex flex-wrap gap-2">
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
            </Card>
          ))}
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
