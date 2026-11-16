import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Home, ImagePlus, X } from 'lucide-react'
import { useAuth } from '@/context/AuthProvider'
import { isReceivingNow } from '@/lib/utils'
import { catalog, useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { PageContent, Notice } from '@/components/PageContent'
import { Card } from '@/components/ui/Card'
import { Field, Select, Textarea, Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Photo } from '@/components/Photo'
import { Rating, ratingView } from '@/components/business/BusinessIdentity'
import { checked, useAction, upload } from '@/lib/management'
import {
  BusinessGate,
  ResourceState,
  Feedback,
  TextField,
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
  const refs = useResource(async () => ({
    ...(await catalog()),
    areas: await checked(
      supabase
        .from('business_service_areas')
        .select('*')
        .eq('business_id', business!.id),
    ),
    stats: await checked(
      supabase
        .from('business_stats')
        .select('*')
        .eq('business_id', business!.id)
        .maybeSingle(),
    ),
    settings: await checked(
      supabase.from('site_settings').select('*').single(),
    ),
  }))
  const [areas, setAreas] = useState<string[] | null>(null)
  const action = useAction()
  function set(key: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  return (
    <PageContent
      title="Meu perfil"
      description="Mantenha as informações do seu negócio atualizadas."
    >
      <Feedback action={action} />
      {business?.status === 'adjustments_requested' && (
        <Notice>
          <strong>Ajustes solicitados pela administração</strong>
          <p className="mt-2 whitespace-pre-wrap">
            {business.adjustment_notes}
          </p>
        </Notice>
      )}
      <ResourceState resource={refs}>
        <form
          id="business-profile"
          onSubmit={(e) => {
            e.preventDefault()
            void action.run(async () => {
              const selected =
                areas ?? refs.data!.areas.map((a) => a.neighborhood_id)
              await checked(
                supabase
                  .from('businesses')
                  .update({
                    name: form.name.trim(),
                    description: form.description,
                    category_id: form.category_id || null,
                    whatsapp: form.whatsapp,
                    instagram: form.instagram,
                    attendance_type: form.attendance_type,
                    home_service: form.attendance_type !== 'business_address',
                    logo_url: form.logo_url,
                    ...(business!.status === 'adjustments_requested'
                      ? { status: 'pending' as const }
                      : {}),
                  })
                  .eq('id', form.id)
                  .select('id')
                  .single(),
              )
              for (const area of refs.data!.areas.filter(
                (a) => !selected.includes(a.neighborhood_id),
              ))
                await checked(
                  supabase
                    .from('business_service_areas')
                    .delete()
                    .eq('business_id', form.id)
                    .eq('neighborhood_id', area.neighborhood_id),
                )
              const added = selected.filter(
                (id) => !refs.data!.areas.some((a) => a.neighborhood_id === id),
              )
              if (added.length)
                await checked(
                  supabase.from('business_service_areas').upsert(
                    added.map((id) => ({
                      business_id: form.id,
                      neighborhood_id: id,
                    })),
                    { onConflict: 'business_id,neighborhood_id' },
                  ),
                )
              await refreshProfile()
              refs.reload()
            })
          }}
        >
          <div className="management-actions mb-6">
            <Link className="btn-outline" to={`/empresa/${form.slug}`}>
              Ver perfil público
            </Link>
            <Button disabled={action.busy} type="submit">
              Salvar alterações
            </Button>
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className="space-y-5">
              <Card className="p-6 space-y-5">
                <h2 className="border-b border-line pb-3">
                  Informações do negócio
                </h2>
                <div className="flex items-center gap-5">
                  <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-rose-400 text-white">
                    {form.logo_url ? (
                      <img
                        className="h-full w-full object-cover"
                        src={form.logo_url}
                        alt="Logo"
                      />
                    ) : (
                      <Home size={56} />
                    )}
                  </span>
                  <div>
                    <label className="btn-outline cursor-pointer">
                      <ImagePlus size={20} />
                      Alterar logo
                      <Input
                        className="hidden"
                        type="file"
                        accept="image/jpeg,image/png"
                        disabled={action.busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file)
                            void action.run(async () => {
                              if (file.size > 2 * 1024 * 1024)
                                throw new Error('O logo deve ter até 2 MB.')
                              const image = await upload(
                                file,
                                'business-photos',
                                form.id,
                              )
                              set('logo_url', image.url)
                            })
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs text-muted">
                      Formatos aceitos: JPG, PNG. Tamanho máximo de 2 MB.
                    </p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField
                    label="Nome do negócio *"
                    required
                    value={form.name}
                    onChange={(v) => set('name', v)}
                  />
                  <Field label="Categoria principal *">
                    <Select
                      required
                      value={form.category_id || ''}
                      onChange={(e) => set('category_id', e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {refs.data?.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Descrição *">
                  <Textarea
                    required
                    rows={3}
                    value={form.description || ''}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </Field>
                <Field label="Forma de atendimento *">
                  <Select
                    value={form.attendance_type}
                    onChange={(e) => set('attendance_type', e.target.value)}
                  >
                    <option value="client_address">
                      No endereço do cliente
                    </option>
                    <option value="business_address">
                      No endereço do negócio
                    </option>
                    <option value="both">Ambos</option>
                  </Select>
                </Field>
              </Card>
              <Card className="p-6 space-y-5">
                <h2 className="border-b border-line pb-3">Contatos e região</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField
                    label="WhatsApp comercial *"
                    required
                    value={form.whatsapp}
                    onChange={(v) => set('whatsapp', v)}
                  />
                  <TextField
                    label="Instagram (opcional)"
                    value={form.instagram}
                    onChange={(v) => set('instagram', v)}
                  />
                  <Field label="Cidade *">
                    <Input
                      readOnly
                      value={`${refs.data?.settings.city_name || 'Uberaba'}, ${refs.data?.settings.state_code || 'MG'}`}
                    />
                  </Field>
                  <Field label="Bairros atendidos *">
                    <div className="flex flex-wrap gap-2 rounded-lg border border-line p-2">
                      {(
                        areas ??
                        refs.data?.areas.map((a) => a.neighborhood_id) ??
                        []
                      ).map((id) => (
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs"
                          key={id}
                          onClick={() =>
                            setAreas(
                              (
                                areas ??
                                refs.data!.areas.map((a) => a.neighborhood_id)
                              ).filter((a) => a !== id),
                            )
                          }
                        >
                          {
                            refs.data?.neighborhoods.find((n) => n.id === id)
                              ?.name
                          }
                          <X size={13} />
                        </button>
                      ))}
                      <Select
                        aria-label="Adicionar bairro"
                        value=""
                        onChange={(e) =>
                          setAreas([
                            ...new Set([
                              ...(areas ??
                                refs.data!.areas.map((a) => a.neighborhood_id)),
                              e.target.value,
                            ]),
                          ])
                        }
                      >
                        <option value="">+ Adicionar bairro</option>
                        {refs.data?.neighborhoods
                          .filter(
                            (n) =>
                              !(
                                areas ??
                                refs.data!.areas.map((a) => a.neighborhood_id)
                              ).includes(n.id),
                          )
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.name}
                            </option>
                          ))}
                      </Select>
                    </div>
                    <p className="text-xs text-muted">
                      Seu endereço residencial não precisa aparecer no perfil.
                    </p>
                  </Field>
                </div>
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="p-3">
                <h2 className="p-2 pb-4">Prévia do perfil público</h2>
                <div className="business-card">
                  <Photo
                    src={form.cover_url || ''}
                    alt="Capa do negócio"
                    className="h-40 w-full object-cover"
                  />
                  <div className="p-3 space-y-4">
                    <div className="flex gap-4">
                      <span
                        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white"
                        style={{ background: form.brand_color || '#ff7d85' }}
                      >
                        {form.logo_url ? (
                          <img
                            src={form.logo_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Home size={48} />
                        )}
                      </span>
                      <div className="space-y-1">
                        <h2>{form.name}</h2>
                        <p className="text-muted">
                          {
                            refs.data?.categories.find(
                              (c) => c.id === form.category_id,
                            )?.name
                          }
                        </p>
                        <Rating
                          {...ratingView({
                            business_stats: refs.data?.stats,
                            google_rating: form.google_rating,
                            google_review_count: form.google_review_count,
                          })}
                        />
                      </div>
                    </div>
                    <p className="leading-relaxed text-muted">
                      {form.description}
                    </p>
                    <p className="text-muted">
                      ⌖ {refs.data?.settings.city_name},{' '}
                      {refs.data?.settings.state_code}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {form.attendance_type !== 'business_address' && (
                        <span className="status-chip receiving">
                          ⌂ Em domicílio
                        </span>
                      )}
                      <span className="status-chip receiving">
                        ●{' '}
                        {isReceivingNow(form)
                          ? 'Recebendo pedidos'
                          : 'Consultar disponibilidade'}
                      </span>
                    </div>
                    <Link
                      className="btn-primary w-full"
                      to={`/empresa/${form.slug}`}
                    >
                      Chamar no WhatsApp
                    </Link>
                    <Link
                      className="btn-outline w-full"
                      to={`/empresa/${form.slug}/avaliar`}
                    >
                      ☆ Avaliar experiência
                    </Link>
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="font-bold">Seu perfil é sua vitrine</h3>
                <p className="mt-2 text-sm text-muted">
                  Fotos, serviços e informações atualizadas ajudam o cliente a
                  escolher.
                </p>
              </Card>
            </div>
          </div>
        </form>
      </ResourceState>
    </PageContent>
  )
}
