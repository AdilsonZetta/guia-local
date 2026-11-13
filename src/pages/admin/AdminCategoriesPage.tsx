import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useResource } from '@/lib/public-data'
import type { Tables } from '@/lib/database.types'
import { slugify } from '@/lib/utils'
import { all, checked, useAction } from '@/lib/management'
import {
  Metrics,
  ResourceState,
  Feedback,
  TextField,
  Toggle,
  Reorder,
  Status,
} from '@/components/Management'
import { CategoryIcon } from '@/components/CategoryIcon'
import { PageContent } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Input'
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
export function AdminCategoriesPage() {
  const action = useAction()
  const [edit, setEdit] = useState<Partial<Tables<'categories'>> | null>(null)
  const resource = useResource(async () => {
    const [categories, businesses] = await Promise.all([
      all('categories'),
      all('businesses'),
    ])
    return {
      categories: categories.sort((a, b) => a.sort_order - b.sort_order),
      businesses,
    }
  })
  const d = resource.data
  return (
    <PageContent
      title="Categorias"
      description="Organize os serviços e escolha o que aparece na página inicial."
    >
      <Feedback action={action} />
      <div className="management-actions">
        <Button
          onClick={() =>
            setEdit({
              name: '',
              slug: '',
              description: '',
              icon: 'tag',
              active: true,
              show_on_home: true,
              sort_order: d?.categories.length ?? 0,
            })
          }
        >
          + Nova categoria
        </Button>
      </div>
      <ResourceState resource={resource}>
        {d && (
          <>
            <Metrics
              items={[
                ['Categorias', d.categories.length],
                ['Ativas', d.categories.filter((c) => c.active).length],
                [
                  'Na página inicial',
                  d.categories.filter((c) => c.show_on_home).length,
                ],
                [
                  'Negócios vinculados',
                  d.businesses.filter((b) => b.category_id).length,
                ],
              ]}
            />
            <div
              className={`grid gap-5 ${edit ? 'xl:grid-cols-[1.6fr_1fr]' : ''}`}
            >
              <Card className="p-5 self-start overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>Ordem</th>
                      <th>Categoria</th>
                      <th>Negócios</th>
                      <th>Na página inicial</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {d.categories.map((c, i) => (
                      <tr key={c.id} className="border-t border-line">
                        <td>
                          <Reorder
                            index={i}
                            total={d.categories.length}
                            disabled={action.busy}
                            onMove={(dir) =>
                              void action.run(async () => {
                                const rows = [...d.categories]
                                ;[rows[i], rows[i + dir]] = [
                                  rows[i + dir]!,
                                  rows[i]!,
                                ]
                                for (let j = 0; j < rows.length; j++)
                                  await checked(
                                    supabase
                                      .from('categories')
                                      .update({ sort_order: j })
                                      .eq('id', rows[j]!.id),
                                  )
                                resource.reload()
                              })
                            }
                          />
                        </td>
                        <td>
                          <div className="flex gap-3 items-center">
                            <span className="metric-icon h-10 w-10">
                              <CategoryIcon name={c.icon} />
                            </span>
                            <div>
                              <strong>{c.name}</strong>
                              <p className="text-xs text-muted">{c.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {
                            d.businesses.filter((b) => b.category_id === c.id)
                              .length
                          }
                        </td>
                        <td>
                          <input
                            aria-label={`Exibir ${c.name} na página inicial`}
                            type="checkbox"
                            checked={c.show_on_home}
                            disabled={action.busy}
                            onChange={(e) => {
                              const value = e.target.checked
                              void action.run(async () => {
                                await checked(
                                  supabase
                                    .from('categories')
                                    .update({ show_on_home: value })
                                    .eq('id', c.id),
                                )
                                resource.reload()
                              })
                            }}
                          />
                        </td>
                        <td>
                          <Status value={c.active ? 'active' : 'archived'} />
                        </td>
                        <td>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEdit(c)}
                          >
                            Editar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              {edit && (
                <Card className="p-5 space-y-4">
                  <h2>{edit.id ? 'Editar categoria' : 'Nova categoria'}</h2>
                  <form
                    className="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void action.run(async () => {
                        const values = {
                          name: edit.name!.trim(),
                          slug: slugify(edit.slug || edit.name!),
                          description: edit.description,
                          icon: edit.icon,
                          active: edit.active,
                          show_on_home: edit.show_on_home,
                          sort_order: edit.sort_order,
                        }
                        if (edit.id)
                          await checked(
                            supabase
                              .from('categories')
                              .update(values)
                              .eq('id', edit.id),
                          )
                        else
                          await checked(
                            supabase.from('categories').insert(values),
                          )
                        setEdit(null)
                        resource.reload()
                      })
                    }}
                  >
                    <Field label="Ícone">
                      <div className="flex flex-wrap gap-2">
                        {icons.map((icon) => (
                          <button
                            type="button"
                            aria-label={icon}
                            key={icon}
                            className={`rounded-lg border p-3 ${edit.icon === icon ? 'border-brand bg-brand-soft' : 'border-line'}`}
                            onClick={() => setEdit({ ...edit, icon })}
                          >
                            <CategoryIcon name={icon} />
                          </button>
                        ))}
                      </div>
                    </Field>
                    <TextField
                      label="Nome"
                      required
                      value={edit.name}
                      onChange={(v) =>
                        setEdit({
                          ...edit,
                          name: v,
                          slug: edit.id ? edit.slug : slugify(v),
                        })
                      }
                    />
                    <TextField
                      label="Slug"
                      required
                      value={edit.slug}
                      onChange={(v) => setEdit({ ...edit, slug: slugify(v) })}
                    />
                    <Field label="Descrição">
                      <Textarea
                        value={edit.description || ''}
                        onChange={(e) =>
                          setEdit({ ...edit, description: e.target.value })
                        }
                      />
                    </Field>
                    <Toggle
                      label="Categoria ativa"
                      checked={edit.active ?? true}
                      onChange={(v) => setEdit({ ...edit, active: v })}
                    />
                    <Toggle
                      label="Exibir na página inicial"
                      checked={edit.show_on_home ?? true}
                      onChange={(v) => setEdit({ ...edit, show_on_home: v })}
                    />
                    <div className="rounded-xl bg-brand-soft p-4 flex gap-3">
                      <CategoryIcon name={edit.icon || 'tag'} />
                      <strong>{edit.name || 'Prévia da categoria'}</strong>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" disabled={action.busy}>
                        Salvar
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setEdit(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>
          </>
        )}
      </ResourceState>
    </PageContent>
  )
}
