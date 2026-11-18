import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import {
  GripVertical,
  Pencil,
  Plus,
  Home,
  Star,
  MapPin,
  Link2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthProvider'
import { useResource, safeExternalUrl, isWhatsAppUrl } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'
import { slugify, isReceivingNow } from '@/lib/utils'
import { PageContent, Notice } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { CategoryIcon } from '@/components/CategoryIcon'
import { checked, useAction, publicUrl, upload } from '@/lib/management'
import { tileTone } from '@/components/business/BusinessIdentity'
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
    name: 'Claro',
    background: 'var(--color-canvas)',
    card: 'var(--color-green)',
    accent: 'var(--color-ink)',
  },
  dark: {
    name: 'Escuro',
    background: 'var(--color-ink)',
    card: 'var(--color-green)',
    accent: 'var(--color-canvas)',
  },
  rose: {
    name: 'Laranja',
    background: 'var(--color-brand-soft)',
    card: 'var(--color-orange)',
    accent: 'var(--color-ink)',
  },
  ocean: {
    name: 'Verde',
    background: 'var(--color-green-wash)',
    card: 'var(--color-green-strong)',
    accent: 'var(--color-ink)',
  },
  sand: {
    name: 'Suave',
    background: 'var(--color-canvas)',
    card: 'var(--color-orange-soft)',
    accent: 'var(--color-ink)',
  },
}
type DraftButton = {
  id?: string
  key: string
  label: string
  url: string
  icon: string
  enabled: boolean
  sort_order: number
}
function ButtonIcon({ button }: { button: Pick<DraftButton, 'icon' | 'url'> }) {
  return isWhatsAppUrl(button.url) ? (
    <WhatsAppIcon size={24} />
  ) : button.icon === 'instagram' ? (
    <span className="text-xl text-orange">◎</span>
  ) : button.icon === 'star' ? (
    <Star size={24} />
  ) : button.icon === 'link' ? (
    <Link2 size={24} />
  ) : (
    <CategoryIcon name={button.icon} />
  )
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
    const [link, settings, stats] = await Promise.all([
      checked(
        supabase
          .from('link_in_bio')
          .select('*')
          .eq('business_id', b!.id)
          .maybeSingle(),
      ),
      checked(
        supabase.from('site_settings').select('link_in_bio_enabled').single(),
      ),
      checked(
        supabase
          .from('business_stats')
          .select('*')
          .eq('business_id', b!.id)
          .maybeSingle(),
      ),
    ])
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
    return { link, buttons, settings, stats }
  }, [b?.id])
  return (
    <PageContent
      title="Link na bio"
      description="Seus contatos, serviços e avaliações em um único link."
    >
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
    stats: { avg_rating: number | null; review_count: number | null } | null
  }
  reload: () => void
}) {
  const { refreshProfile } = useAuth()
  const [form, setForm] = useState({
    slug: initial.link?.slug || b.slug,
    headline: initial.link?.headline || b.name,
    bio: initial.link?.bio || '',
    theme: initial.link?.theme || 'forest',
    enabled: initial.link?.enabled ?? true,
  })
  const [logo, setLogo] = useState(b.logo_url)
  const [buttons, setButtons] = useState<DraftButton[]>(
    initial.buttons.map((button) => ({ ...button, key: button.id })),
  )
  const [edit, setEdit] = useState<DraftButton | null>(null)
  const [qr, setQr] = useState(false)
  const action = useAction()
  const theme = themes[form.theme as keyof typeof themes] ?? themes.forest
  function move(index: number, dir: number) {
    setButtons((rows) => {
      const next = [...rows]
      ;[next[index], next[index + dir]] = [next[index + dir]!, next[index]!]
      return next
    })
  }
  const logoTile = (
    <span
      className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
      style={tileTone(b.name || 'guia')}
    >
      {logo ? (
        <img src={logo} alt="Logo" className="h-full w-full object-cover" />
      ) : (
        <Home size={52} />
      )}
    </span>
  )
  return (
    <>
      <Feedback action={action} />
      {!initial.settings.link_in_bio_enabled && (
        <Notice>
          O link na bio está temporariamente desativado. Você pode preparar sua
          página.
        </Notice>
      )}
      <div className="management-actions">
        <Link className="btn-outline" to={`/l/${form.slug}`}>
          Ver página
        </Link>
        <Button type="submit" form="bio-form" disabled={action.busy}>
          <Pencil size={18} />
          Publicar alterações
        </Button>
      </div>
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <strong>Seu endereço personalizado</strong>
        <div className="flex min-w-40 flex-1 items-center rounded-lg border border-line bg-canvas px-4">
          <span>/l/</span>
          <input
            aria-label="Endereço personalizado"
            className="min-w-0 flex-1 bg-transparent py-3 outline-none"
            value={form.slug}
            onChange={(e) =>
              setForm({ ...form, slug: slugify(e.target.value) })
            }
          />
          <Pencil size={17} />
        </div>
        <Button
          variant="outline"
          onClick={() =>
            void action.run(() =>
              navigator.clipboard.writeText(publicUrl(`/l/${form.slug}`)),
            )
          }
        >
          Copiar link
        </Button>
        <Button variant="outline" onClick={() => setQr(true)}>
          QR Code
        </Button>
      </Card>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <form
            id="bio-form"
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              void action.run(async () => {
                if (!form.slug.trim() || !form.headline.trim())
                  throw new Error('Informe o endereço e o nome da página.')
                const link = await checked(
                  supabase
                    .from('link_in_bio')
                    .upsert(
                      { ...form, slug: slugify(form.slug), business_id: b.id },
                      { onConflict: 'business_id' },
                    )
                    .select('id')
                    .single(),
                )
                const removed = initial.buttons.filter(
                  (button) => !buttons.some((draft) => draft.id === button.id),
                )
                for (const button of removed)
                  await checked(
                    supabase
                      .from('link_in_bio_buttons')
                      .delete()
                      .eq('id', button.id)
                      .eq('link_id', link.id),
                  )
                for (let i = 0; i < buttons.length; i++) {
                  const button = buttons[i]!
                  const values = {
                    link_id: link.id,
                    label: button.label,
                    url: button.url,
                    icon: button.icon,
                    enabled: button.enabled,
                    sort_order: i,
                  }
                  if (button.id)
                    await checked(
                      supabase
                        .from('link_in_bio_buttons')
                        .update(values)
                        .eq('id', button.id)
                        .eq('link_id', link.id),
                    )
                  else {
                    const created = await checked(
                      supabase
                        .from('link_in_bio_buttons')
                        .insert(values)
                        .select('id')
                        .single(),
                    )
                    setButtons((rows) =>
                      rows.map((row) =>
                        row.key === button.key
                          ? { ...row, id: created.id }
                          : row,
                      ),
                    )
                  }
                }
                if (logo !== b.logo_url) {
                  await checked(
                    supabase
                      .from('businesses')
                      .update({ logo_url: logo })
                      .eq('id', b.id),
                  )
                  await refreshProfile()
                }
                reload()
              }, 'Página publicada.')
            }}
          >
            <h2>Personalize sua página</h2>
            <div className="flex gap-6">
              <div className="space-y-2">
                {logoTile}
                <label className="cursor-pointer text-xs text-brand">
                  Alterar imagem
                  <Input
                    className="hidden"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={action.busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file)
                        void action.run(async () => {
                          const image = await upload(
                            file,
                            'business-photos',
                            b.id,
                          )
                          setLogo(image.url)
                        }, 'Imagem preparada. Publique para salvar.')
                    }}
                  />
                </label>
              </div>
              <div className="flex-1 space-y-4">
                <TextField
                  label="Nome"
                  required
                  value={form.headline}
                  onChange={(v) => setForm({ ...form, headline: v })}
                />
                <TextField
                  label="Descrição curta"
                  value={form.bio}
                  onChange={(v) => setForm({ ...form, bio: v })}
                />
              </div>
            </div>
            <div>
              <h2>Botões da página</h2>
              <p className="mb-3 text-sm text-muted">
                Use as setas para reorganizar.
              </p>
              <div className="space-y-2">
                {buttons.map((button, i) => (
                  <div
                    key={button.key}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2"
                  >
                    <GripVertical size={18} className="text-muted" />
                    <span className="text-brand">
                      <ButtonIcon button={button} />
                    </span>
                    <span className="flex-1 text-sm">{button.label}</span>
                    <button
                      type="button"
                      aria-label={`Editar ${button.label}`}
                      onClick={() => setEdit({ ...button })}
                    >
                      <Pencil size={17} />
                    </button>
                    <Reorder
                      index={i}
                      total={buttons.length}
                      onMove={(dir) => move(i, dir)}
                    />
                    <Toggle
                      label=""
                      checked={button.enabled}
                      onChange={(value) =>
                        setButtons((rows) =>
                          rows.map((row) =>
                            row.key === button.key
                              ? { ...row, enabled: value }
                              : row,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full"
                onClick={() =>
                  setEdit({
                    key: crypto.randomUUID(),
                    label: '',
                    url: '',
                    icon: 'link',
                    enabled: true,
                    sort_order: buttons.length,
                  })
                }
              >
                <Plus size={20} />
                Adicionar botão
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <div>
                <h2>Aparência</h2>
                <p className="mt-1 text-sm text-muted">
                  Escolha as cores que combinam com seu negócio.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['forest', 'dark', 'rose'] as const).map((key) => (
                  <button
                    type="button"
                    key={key}
                    className={`rounded-lg border p-1.5 text-left ${form.theme === key ? 'border-brand' : 'border-transparent'}`}
                    onClick={() => setForm({ ...form, theme: key })}
                  >
                    <span
                      className="bio-page block h-14 rounded-md"
                      style={{ backgroundColor: themes[key].background }}
                    />
                    <span className="text-xs">
                      {themes[key].name} {form.theme === key ? '✓' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Toggle
              label="Página habilitada"
              checked={form.enabled}
              onChange={(v) => setForm({ ...form, enabled: v })}
            />
          </form>
        </Card>
        <Card className="p-5 self-start">
          <h2 className="mb-4">Prévia no celular</h2>
          <div
            className="phone-preview bio-page relative mx-auto max-w-76 rounded-[2.8rem] border-8 border-neutral-800 px-3 pb-6 pt-11 text-center"
            style={{ backgroundColor: theme.background, color: theme.accent }}
          >
            <div className="flex justify-center">{logoTile}</div>
            <h3 className="mt-3 text-xl font-extrabold">
              {form.headline || b.name}
            </h3>
            <p className="mt-1 text-sm opacity-80">{form.bio}</p>
            <p className="mt-2 text-xs">
              ⭐{' '}
              {Number(initial.stats?.avg_rating ?? 0)
                .toFixed(1)
                .replace('.', ',')}{' '}
              · {initial.stats?.review_count ?? 0} avaliações
            </p>
            <p className="mt-2 text-xs">
              ●{' '}
              {isReceivingNow(b)
                ? 'Recebendo pedidos'
                : 'Consultar disponibilidade'}
            </p>
            <div className="mt-5 space-y-3">
              {buttons
                .filter((button) => button.enabled)
                .map((button, i) => (
                  <div
                    key={button.key}
                    className="flex items-center gap-3 rounded-lg border px-3 py-3 text-sm font-bold"
                    style={{
                      background:
                        i === 0
                          ? theme.card
                          : form.theme === 'dark'
                            ? '#ffffff10'
                            : 'white',
                      color:
                        i === 0
                          ? 'white'
                          : form.theme === 'dark'
                            ? 'white'
                            : theme.card,
                      borderColor: theme.card,
                    }}
                  >
                    <ButtonIcon button={button} />
                    <span className="flex-1">{button.label}</span>
                  </div>
                ))}
            </div>
            <p className="my-5 text-xs underline">Ver perfil completo</p>
            <p className="flex items-center justify-center gap-2 pt-4 text-sm font-bold">
              <MapPin size={24} className="text-brand" />
              Guia Local
            </p>
          </div>
        </Card>
      </div>
      {edit && (
        <Modal
          title={edit.id ? 'Editar botão' : 'Adicionar botão'}
          onClose={() => setEdit(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              const url = edit.url.startsWith('/')
                ? new URL(edit.url, window.location.origin).href
                : edit.url
              if (!safeExternalUrl(url)) {
                void action.run(async () => {
                  throw new Error(
                    'Informe um endereço https://, http://, tel: ou mailto: válido.',
                  )
                })
                return
              }
              setButtons((rows) =>
                rows.some((row) => row.key === edit.key)
                  ? rows.map((row) => (row.key === edit.key ? edit : row))
                  : [...rows, edit],
              )
              setEdit(null)
            }}
          >
            <Feedback action={action} />
            <TextField
              label="Texto do botão"
              required
              value={edit.label}
              onChange={(v) => setEdit({ ...edit, label: v })}
            />
            <TextField
              label="Endereço (URL)"
              required
              value={edit.url}
              onChange={(v) => setEdit({ ...edit, url: v })}
            />
            <TextField
              label="Ícone"
              value={edit.icon}
              onChange={(v) => setEdit({ ...edit, icon: v })}
            />
            <div className="flex gap-3">
              <Button type="submit">Aplicar</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setButtons((rows) =>
                    rows.filter((row) => row.key !== edit.key),
                  )
                  setEdit(null)
                }}
              >
                Remover botão
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {qr && (
        <Modal title="QR Code da sua página" onClose={() => setQr(false)}>
          <div id="bio-qr" className="flex justify-center">
            <QRCodeCanvas
              value={publicUrl(`/l/${form.slug}`)}
              size={280}
              marginSize={4}
            />
          </div>
          <Button
            className="mt-5 w-full"
            onClick={() => {
              const canvas =
                document.querySelector<HTMLCanvasElement>('#bio-qr canvas')
              if (canvas) {
                const a = document.createElement('a')
                a.href = canvas.toDataURL()
                a.download = `${form.slug}-qr.png`
                a.click()
              }
            }}
          >
            Baixar QR Code
          </Button>
        </Modal>
      )}
    </>
  )
}
