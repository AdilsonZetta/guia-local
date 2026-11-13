import { useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { catalog, useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { PageContent } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Field, Select, Textarea, Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { BusinessCard } from '@/components/business/BusinessCard'
import { checked, useAction, upload } from '@/lib/management'
import {
  BusinessGate,
  ResourceState,
  Feedback,
  TextField,
  Toggle,
} from '@/components/Management'

export function BusinessProfileEditPage() {
  return (
    <BusinessGate>
      <Editor />
    </BusinessGate>
  )
}
function Editor() {
  const { business, refreshProfile } = useAuth()
  const [form, setForm] = useState(business!)
  const refs = useResource(catalog)
  const action = useAction()
  function set(key: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  return (
    <PageContent title="Editar perfil">
      <Feedback action={action} />
      <ResourceState resource={refs}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                void action.run(async () => {
                  await checked(
                    supabase
                      .from('businesses')
                      .update({
                        name: form.name.trim(),
                        tagline: form.tagline,
                        description: form.description,
                        category_id: form.category_id || null,
                        neighborhood_id: form.neighborhood_id || null,
                        address: form.address,
                        phone: form.phone,
                        whatsapp: form.whatsapp,
                        email: form.email || null,
                        website: form.website || null,
                        instagram: form.instagram,
                        home_service: form.home_service,
                        logo_url: form.logo_url || null,
                        cover_url: form.cover_url || null,
                      })
                      .eq('id', form.id)
                      .select('id')
                      .single(),
                  )
                  await refreshProfile()
                })
              }}
            >
              {(
                [
                  ['name', 'Nome'],
                  ['tagline', 'Frase de apresentação'],
                  ['address', 'Endereço'],
                  ['phone', 'Telefone'],
                  ['whatsapp', 'WhatsApp'],
                  ['email', 'E-mail'],
                  ['website', 'Site'],
                  ['instagram', 'Instagram'],
                ] as const
              ).map(([key, label]) => (
                <TextField
                  key={key}
                  label={label}
                  value={form[key]}
                  required={key === 'name'}
                  type={key === 'email' ? 'email' : 'text'}
                  onChange={(v) => set(key, v)}
                />
              ))}
              <Field label="Descrição">
                <Textarea
                  value={form.description ?? ''}
                  onChange={(e) => set('description', e.target.value)}
                />
              </Field>
              {(['category_id', 'neighborhood_id'] as const).map((key) => (
                <Field
                  key={key}
                  label={key === 'category_id' ? 'Categoria' : 'Bairro'}
                >
                  <Select
                    value={form[key] ?? ''}
                    onChange={(e) => set(key, e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {(key === 'category_id'
                      ? refs.data?.categories
                      : refs.data?.neighborhoods
                    )?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
              <Toggle
                label="Atende em domicílio"
                checked={form.home_service}
                onChange={(v) => set('home_service', v)}
              />
              {(['logo_url', 'cover_url'] as const).map((key) => (
                <div key={key} className="space-y-2">
                  <TextField
                    label={key === 'logo_url' ? 'URL do logo' : 'URL da capa'}
                    value={form[key]}
                    type="url"
                    onChange={(v) => set(key, v)}
                  />
                  <Field label="Enviar imagem">
                    <Input
                      type="file"
                      accept="image/*"
                      disabled={action.busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file)
                          void action.run(async () => {
                            const image = await upload(
                              file,
                              'business-photos',
                              form.id,
                            )
                            set(key, image.url)
                          })
                      }}
                    />
                  </Field>
                </div>
              ))}
              <Button disabled={action.busy} type="submit">
                Salvar perfil
              </Button>
            </form>
          </Card>
          <div className="lg:sticky lg:top-6 self-start space-y-3">
            <h2 className="font-bold">Prévia do perfil</h2>
            <BusinessCard
              business={{
                ...form,
                categories: refs.data?.categories.find(
                  (c) => c.id === form.category_id,
                ),
                neighborhoods: refs.data?.neighborhoods.find(
                  (n) => n.id === form.neighborhood_id,
                ),
              }}
            />
          </div>
        </div>
      </ResourceState>
    </PageContent>
  )
}
