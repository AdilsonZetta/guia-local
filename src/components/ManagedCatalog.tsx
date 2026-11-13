import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import type { Tables } from '@/lib/database.types'
import { slugify } from '@/lib/utils'
import { CategoryIcon } from '@/components/CategoryIcon'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Field, Select } from '@/components/ui/Input'
import { all, checked, useAction } from '@/lib/management'
import {
  Feedback,
  TextField,
  Toggle,
  Reorder,
  ResourceState,
} from '@/components/Management'

const icons = [
  'utensils',
  'sparkles',
  'heart-pulse',
  'hammer',
  'car',
  'graduation-cap',
  'paw-print',
  'smartphone',
  'party-popper',
  'home',
  'tag',
]
export function ManagedCatalog({
  table,
  title,
}: {
  table: 'categories' | 'neighborhoods'
  title: string
}) {
  const resource = useResource(
    async () =>
      (await all(table)).sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
      ),
    [table],
  )
  const [edit, setEdit] = useState<Partial<Tables<'categories'>> | null>(null)
  const action = useAction()
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <Feedback action={action} />
      <ResourceState resource={resource}>
        <Button
          onClick={() =>
            setEdit({
              name: '',
              slug: '',
              active: true,
              show_on_home: true,
              icon: 'tag',
              sort_order: resource.data?.length ?? 0,
            })
          }
        >
          Adicionar {table === 'categories' ? 'categoria' : 'bairro'}
        </Button>
        {resource.data?.map((row, i) => (
          <Card className="p-4 flex flex-wrap items-center gap-3" key={row.id}>
            {'icon' in row && <CategoryIcon name={row.icon} />}
            <div className="flex-1">
              <p className="font-bold">{row.name}</p>
              <p className="text-sm text-muted">
                {row.slug} · {row.active ? 'Ativo' : 'Inativo'} · Ordem{' '}
                {row.sort_order}
                {'show_on_home' in row && row.show_on_home
                  ? ' · Exibe na home'
                  : ''}
              </p>
            </div>
            <Button variant="outline" onClick={() => setEdit(row)}>
              Editar
            </Button>
            <Reorder
              disabled={action.busy}
              index={i}
              total={resource.data!.length}
              onMove={(dir) =>
                void action.run(async () => {
                  const rows = resource.data!
                  const other = rows[i + dir]!
                  if (row.sort_order === other.sort_order) {
                    for (let j = 0; j < rows.length; j++)
                      await checked(
                        supabase
                          .from(table)
                          .update({ sort_order: j })
                          .eq('id', rows[j]!.id),
                      )
                    await checked(
                      supabase
                        .from(table)
                        .update({ sort_order: i + dir })
                        .eq('id', row.id),
                    )
                    await checked(
                      supabase
                        .from(table)
                        .update({ sort_order: i })
                        .eq('id', other.id),
                    )
                  } else {
                    await checked(
                      supabase
                        .from(table)
                        .update({ sort_order: other.sort_order })
                        .eq('id', row.id),
                    )
                    await checked(
                      supabase
                        .from(table)
                        .update({ sort_order: row.sort_order })
                        .eq('id', other.id),
                    )
                  }
                  resource.reload()
                })
              }
            />
            <Button
              variant="danger"
              disabled={action.busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Excluir ${row.name}? Prefira desativar se houver cadastros associados.`,
                  )
                )
                  void action.run(async () => {
                    await checked(
                      supabase.from(table).delete().eq('id', row.id),
                    )
                    resource.reload()
                  })
              }}
            >
              Excluir
            </Button>
          </Card>
        ))}
        {resource.data?.length === 0 && (
          <p className="text-muted">Nenhum registro cadastrado.</p>
        )}
      </ResourceState>
      {edit && (
        <Modal
          title={edit.id ? 'Editar registro' : 'Novo registro'}
          onClose={() => setEdit(null)}
        >
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void action.run(async () => {
                const common = {
                  name: edit.name!.trim(),
                  slug: slugify(edit.slug || edit.name!),
                  active: edit.active,
                  sort_order: edit.sort_order,
                }
                const values =
                  table === 'categories'
                    ? {
                        ...common,
                        icon: edit.icon,
                        show_on_home: edit.show_on_home,
                      }
                    : common
                if (edit.id)
                  await checked(
                    supabase.from(table).update(values).eq('id', edit.id),
                  )
                else await checked(supabase.from(table).insert(values))
                setEdit(null)
                resource.reload()
              })
            }}
          >
            <Feedback action={action} />
            <TextField
              label="Nome"
              required
              value={edit.name}
              onChange={(v) => setEdit({ ...edit, name: v, slug: slugify(v) })}
            />
            <TextField
              label="Identificador (slug)"
              required
              value={edit.slug}
              onChange={(v) => setEdit({ ...edit, slug: slugify(v) })}
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
            {table === 'categories' && (
              <>
                <Toggle
                  label="Exibir na página inicial"
                  checked={edit.show_on_home ?? true}
                  onChange={(v) => setEdit({ ...edit, show_on_home: v })}
                />
                <Field label="Ícone">
                  <Select
                    value={edit.icon ?? 'tag'}
                    onChange={(e) => setEdit({ ...edit, icon: e.target.value })}
                  >
                    {icons.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
            <Button disabled={action.busy} type="submit">
              Salvar
            </Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
