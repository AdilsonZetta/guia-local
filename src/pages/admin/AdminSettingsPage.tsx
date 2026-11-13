import { useState } from 'react'
import { useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'
import { all, checked, useAction, upload } from '@/lib/management'
import {
  ResourceState,
  Feedback,
  TextField,
  Toggle,
} from '@/components/Management'

import { PageContent } from '@/components/PageContent'
import { slugify } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
export function AdminSettingsPage() {
  const resource = useResource(() =>
    checked(supabase.from('site_settings').select('*').eq('id', 1).single()),
  )
  return (
    <PageContent
      title="Configurações"
      description="Gerencie a identidade, a cidade e as regras da plataforma."
    >
      <ResourceState resource={resource}>
        {resource.data && <SettingsForm initial={resource.data} />}
      </ResourceState>
    </PageContent>
  )
}
function SettingsForm({ initial }: { initial: Tables<'site_settings'> }) {
  const [form, setForm] = useState(initial)
  const action = useAction()
  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  return (
    <>
      <Feedback action={action} />
      <Card className="p-5">
        <form
          className="admin-settings-form space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void action.run(async () => {
              if (
                !Number.isInteger(form.availability_validity_days) ||
                form.availability_validity_days < 1
              )
                throw new Error('Informe uma validade de pelo menos um dia.')
              await checked(
                supabase
                  .from('site_settings')
                  .update({
                    site_name: form.site_name,
                    site_description: form.site_description,
                    logo_url: form.logo_url,
                    city_name: form.city_name,
                    state_code: form.state_code.toUpperCase(),
                    moderate_business_signups: form.moderate_business_signups,
                    moderate_reviews: form.moderate_reviews,
                    link_in_bio_enabled: form.link_in_bio_enabled,
                    availability_validity_days: form.availability_validity_days,
                  })
                  .eq('id', form.id)
                  .select('id')
                  .single(),
              )
            })
          }}
        >
          <section className="space-y-4">
            <h2>Identidade do site</h2>
            <TextField
              label="Nome do site"
              required
              value={form.site_name}
              onChange={(v) => set('site_name', v)}
            />
            <Field label="Descrição do site">
              <Textarea
                required
                value={form.site_description}
                onChange={(e) => set('site_description', e.target.value)}
              />
            </Field>
            <TextField
              label="URL do logo"
              type="url"
              value={form.logo_url}
              onChange={(v) => set('logo_url', v || null)}
            />
            <Field label="Enviar logo">
              <Input
                type="file"
                accept="image/*"
                disabled={action.busy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file)
                    void action.run(async () => {
                      const image = await upload(file, 'site-assets', 'logos')
                      set('logo_url', image.url)
                    })
                }}
              />
            </Field>
            {form.logo_url && (
              <img
                src={form.logo_url}
                className="h-20 max-w-48 object-contain"
                alt="Logo do site"
              />
            )}
          </section>
          <section className="space-y-4">
            <h2>Cidade e bairros</h2>
            <TextField
              label="Cidade"
              required
              value={form.city_name}
              onChange={(v) => set('city_name', v)}
            />
            <Field label="UF">
              <Input
                required
                minLength={2}
                maxLength={2}
                pattern="[A-Za-z]{2}"
                value={form.state_code}
                onChange={(e) =>
                  set('state_code', e.target.value.toUpperCase())
                }
              />
            </Field>
          </section>
          <section className="space-y-4">
            <h2>Publicação e moderação</h2>
            <Toggle
              label="Moderar cadastros de empresas"
              checked={form.moderate_business_signups}
              onChange={(v) => set('moderate_business_signups', v)}
            />
            <Toggle
              label="Moderar avaliações"
              checked={form.moderate_reviews}
              onChange={(v) => set('moderate_reviews', v)}
            />
          </section>
          <section className="space-y-4">
            <h2>Recursos</h2>
            <Toggle
              label="Habilitar link na bio"
              checked={form.link_in_bio_enabled}
              onChange={(v) => set('link_in_bio_enabled', v)}
            />
            <Field label="Validade da disponibilidade (dias)">
              <Input
                required
                type="number"
                min={1}
                step={1}
                value={form.availability_validity_days}
                onChange={(e) =>
                  set('availability_validity_days', Number(e.target.value))
                }
              />
            </Field>
          </section>
          <Button disabled={action.busy} type="submit">
            Salvar configurações
          </Button>
        </form>
      </Card>
      <NeighborhoodSettings city={form.city_name} />
    </>
  )
}

function NeighborhoodSettings({ city }: { city: string }) {
  const resource = useResource(() => all('neighborhoods'))
  const action = useAction()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  return (
    <Card className="space-y-4 p-6">
      <h2>Bairros de {city}</h2>
      <Feedback action={action} />
      <ResourceState resource={resource}>
        <div className="flex flex-wrap gap-3">
          {resource.data?.map((n) => (
            <span className="status-chip bg-slate-100" key={n.id}>
              {n.name}
              <button
                type="button"
                aria-label={`Remover ${n.name}`}
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    await checked(
                      supabase.from('neighborhoods').delete().eq('id', n.id),
                    )
                    resource.reload()
                  })
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {adding ? (
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void action.run(async () => {
                if (!name.trim()) throw new Error('Informe o nome do bairro.')
                await checked(
                  supabase
                    .from('neighborhoods')
                    .insert({
                      name: name.trim(),
                      slug: slugify(name),
                      active: true,
                      sort_order: resource.data?.length ?? 0,
                    }),
                )
                setName('')
                setAdding(false)
                resource.reload()
              })
            }}
          >
            <Input
              aria-label="Nome do bairro"
              className="max-w-xs"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={action.busy}>
              Adicionar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdding(false)}
            >
              Cancelar
            </Button>
          </form>
        ) : (
          <button
            type="button"
            className="w-full rounded-lg border border-dashed border-brand p-4 text-brand"
            onClick={() => setAdding(true)}
          >
            + Adicionar bairro
          </button>
        )}
      </ResourceState>
    </Card>
  )
}
