import { useState } from 'react'
import { useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'
import { checked, useAction, upload } from '@/lib/management'
import {
  ResourceState,
  Feedback,
  TextField,
  Toggle,
} from '@/components/Management'

import { PageContent } from '@/components/PageContent'
import { ManagedCatalog } from '@/components/ManagedCatalog'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Input'
export function AdminSettingsPage() {
  const resource = useResource(() =>
    checked(supabase.from('site_settings').select('*').eq('id', 1).single()),
  )
  return (
    <PageContent title="Configurações do guia">
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
          className="space-y-4 max-w-2xl"
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
              onChange={(e) => set('state_code', e.target.value.toUpperCase())}
            />
          </Field>
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
          <Button disabled={action.busy} type="submit">
            Salvar configurações
          </Button>
        </form>
      </Card>
      <ManagedCatalog
        table="neighborhoods"
        title={`Bairros de ${form.city_name} / ${form.state_code}`}
      />
    </>
  )
}
