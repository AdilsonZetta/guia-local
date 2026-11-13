import { useState } from 'react'
import { ArrowUpRight, MessageCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthProvider'
import { useResource, safeExternalUrl, isWhatsAppUrl } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'
import { slugify } from '@/lib/utils'
import { PageContent, Notice } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { checked, useAction, publicUrl } from '@/lib/management'
import {
  BusinessGate,
  ResourceState,
  Feedback,
  TextField,
  Toggle,
  Reorder,
} from '@/components/Management'

const themes = {
  forest: {
    name: 'Floresta',
    background: '#e8f3ed',
    card: '#0F7B5A',
    accent: '#164c39',
  },
  rose: {
    name: 'Rosa',
    background: '#fff0f3',
    card: '#a93862',
    accent: '#702844',
  },
  ocean: {
    name: 'Oceano',
    background: '#e9f5fc',
    card: '#126b91',
    accent: '#154b65',
  },
  sand: {
    name: 'Areia',
    background: '#faf2e5',
    card: '#876039',
    accent: '#62472c',
  },
}
export function BusinessLinkInBioPage() {
  return (
    <BusinessGate>
      <LinkEditor />
    </BusinessGate>
  )
}
function LinkEditor() {
  const { business: b } = useAuth()
  const resource = useResource(async () => {
    const link = await checked(
      supabase
        .from('link_in_bio')
        .select('*')
        .eq('business_id', b!.id)
        .maybeSingle(),
    )
    const buttons = link
      ? await checked(
          supabase
            .from('link_in_bio_buttons')
            .select('*')
            .eq('link_id', link.id)
            .order('sort_order')
            .order('id'),
        )
      : []
    const settings = await checked(
      supabase.from('site_settings').select('link_in_bio_enabled').single(),
    )
    return { link, buttons, settings }
  }, [b?.id])
  return (
    <PageContent title="Link na bio">
      <ResourceState resource={resource}>
        {resource.data && (
          <LinkForm
            business={b!}
            initial={resource.data}
            reload={resource.reload}
          />
        )}
      </ResourceState>
    </PageContent>
  )
}
function LinkForm({
  business: b,
  initial,
  reload,
}: {
  business: Tables<'businesses'>
  initial: {
    link: Tables<'link_in_bio'> | null
    buttons: Tables<'link_in_bio_buttons'>[]
    settings: { link_in_bio_enabled: boolean }
  }
  reload: () => void
}) {
  const [form, setForm] = useState(
    initial.link ?? {
      business_id: b.id,
      slug: b.slug,
      headline: b.name,
      bio: '',
      theme: 'forest',
      enabled: true,
    },
  )
  const [edit, setEdit] = useState<Partial<
    Tables<'link_in_bio_buttons'>
  > | null>(null)
  const action = useAction()
  const theme = themes[form.theme as keyof typeof themes] ?? themes.forest
  return (
    <>
      <Feedback action={action} />
      {!initial.settings.link_in_bio_enabled && (
        <Notice>
          O administrador desativou temporariamente o link na bio. Você ainda
          pode preparar sua página.
        </Notice>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <Card className="p-5">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void action.run(async () => {
                  if (!form.slug.trim()) throw new Error('Informe um endereço.')
                  await checked(
                    supabase
                      .from('link_in_bio')
                      .upsert(
                        { ...form, slug: slugify(form.slug) },
                        { onConflict: 'business_id' },
                      ),
                  )
                  reload()
                })
              }}
            >
              <TextField
                label="Endereço personalizado"
                required
                value={form.slug}
                onChange={(v) => setForm({ ...form, slug: slugify(v) })}
              />
              <p className="text-sm break-all text-brand">
                {publicUrl(`/l/${form.slug}`)}
              </p>
              <TextField
                label="Título"
                value={form.headline}
                onChange={(v) => setForm({ ...form, headline: v })}
              />
              <Field label="Apresentação">
                <Textarea
                  value={form.bio ?? ''}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </Field>
              <Field label="Tema">
                <Select
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                >
                  {Object.entries(themes).map(([key, t]) => (
                    <option value={key} key={key}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Toggle
                label="Página habilitada"
                checked={form.enabled}
                onChange={(v) => setForm({ ...form, enabled: v })}
              />
              <Button type="submit" disabled={action.busy}>
                Salvar página
              </Button>
            </form>
          </Card>
          <Button
            disabled={!initial.link}
            onClick={() =>
              setEdit({
                label: '',
                url: '',
                icon: 'link',
                enabled: true,
                sort_order: initial.buttons.length,
              })
            }
          >
            Adicionar botão
          </Button>
          {!initial.link && (
            <p className="text-muted">Salve a página para adicionar botões.</p>
          )}
          {initial.buttons.map((button, i) => (
            <Card className="p-4 space-y-2" key={button.id}>
              <p className="font-bold">
                {button.label} {!button.enabled && '(Desativado)'}
              </p>
              <p className="break-all text-sm text-muted">{button.url}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEdit(button)}>
                  Editar
                </Button>
                <Toggle
                  label="Habilitado"
                  checked={button.enabled}
                  disabled={action.busy}
                  onChange={(v) =>
                    void action.run(async () => {
                      await checked(
                        supabase
                          .from('link_in_bio_buttons')
                          .update({ enabled: v })
                          .eq('id', button.id),
                      )
                      reload()
                    })
                  }
                />
                <Reorder
                  index={i}
                  total={initial.buttons.length}
                  disabled={action.busy}
                  onMove={(dir) =>
                    void action.run(async () => {
                      const rows = [...initial.buttons]
                      ;[rows[i], rows[i + dir]] = [rows[i + dir]!, rows[i]!]
                      for (let j = 0; j < rows.length; j++)
                        await checked(
                          supabase
                            .from('link_in_bio_buttons')
                            .update({ sort_order: j })
                            .eq('id', rows[j]!.id),
                        )
                      reload()
                    })
                  }
                />
                <Button
                  variant="danger"
                  disabled={action.busy}
                  onClick={() => {
                    if (window.confirm('Excluir este botão?'))
                      void action.run(async () => {
                        await checked(
                          supabase
                            .from('link_in_bio_buttons')
                            .delete()
                            .eq('id', button.id),
                        )
                        reload()
                      })
                  }}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <div className="mx-auto w-full max-w-sm self-start lg:sticky lg:top-6">
          <h2 className="mb-3 font-bold">Prévia no celular</h2>
          <div
            className="min-h-[600px] rounded-[2.8rem] border-8 border-ink p-6 text-center"
            style={{ background: theme.background, color: theme.accent }}
          >
            {b.logo_url ? (
              <img
                src={b.logo_url}
                alt={b.name}
                className="mx-auto h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="mx-auto h-24 w-24 rounded-full bg-card grid place-items-center text-3xl">
                {b.name[0]}
              </div>
            )}
            <h2 className="mt-5 text-2xl font-bold">
              {form.headline || b.name}
            </h2>
            <p className="my-5 whitespace-pre-wrap">{form.bio}</p>
            {initial.buttons
              .filter((button) => button.enabled)
              .map((button) => (
                <div
                  key={button.id}
                  className="my-3 flex items-center gap-2 rounded-2xl p-4 text-white"
                  style={{ background: theme.card }}
                >
                  {isWhatsAppUrl(button.url) ? (
                    <MessageCircle size={20} />
                  ) : (
                    <ArrowUpRight size={20} />
                  )}
                  <span className="flex-1 font-bold">{button.label}</span>
                </div>
              ))}
            <p className="mt-8 underline">Ver perfil e avaliações</p>
            <p className="mt-12 text-xs">Feito para conectar · Guia Local</p>
          </div>
        </div>
      </div>
      {edit && (
        <Modal title="Editar botão" onClose={() => setEdit(null)}>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void action.run(async () => {
                if (!safeExternalUrl(edit.url ?? ''))
                  throw new Error(
                    'Use um endereço https://, http://, tel: ou mailto: válido.',
                  )
                const values = { ...edit, link_id: initial.link!.id }
                if (edit.id)
                  await checked(
                    supabase
                      .from('link_in_bio_buttons')
                      .update(values)
                      .eq('id', edit.id),
                  )
                else
                  await checked(
                    supabase.from('link_in_bio_buttons').insert(values),
                  )
                setEdit(null)
                reload()
              })
            }}
          >
            <TextField
              required
              label="Texto do botão"
              value={edit.label}
              onChange={(v) => setEdit({ ...edit, label: v })}
            />
            <TextField
              required
              label="Endereço (URL)"
              value={edit.url}
              onChange={(v) => setEdit({ ...edit, url: v })}
            />
            <TextField
              label="Ícone"
              value={edit.icon}
              onChange={(v) => setEdit({ ...edit, icon: v })}
            />
            <TextField
              label="Ordem"
              type="number"
              value={edit.sort_order}
              onChange={(v) => setEdit({ ...edit, sort_order: Number(v) })}
            />
            <Toggle
              label="Habilitado"
              checked={edit.enabled ?? true}
              onChange={(v) => setEdit({ ...edit, enabled: v })}
            />
            <Button disabled={action.busy} type="submit">
              Salvar botão
            </Button>
          </form>
        </Modal>
      )}
    </>
  )
}
