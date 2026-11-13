import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Heart, Share2, MessageCircle, Star, MapPin } from 'lucide-react'
import { publicBusiness, useResource } from '@/lib/public-data'
import { supabase } from '@/lib/supabase'
import { logVisit, logWhatsAppClick } from '@/lib/analytics'
import {
  formatCurrency,
  formatPhone,
  isReceivingNow,
  WEEKDAYS,
  whatsappLink,
} from '@/lib/utils'
import { useAuth } from '@/context/AuthProvider'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { LoadError, MissingBusiness, Notice } from '@/components/PageContent'

export function BusinessProfilePage() {
  const { slug = '' } = useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const visited = useRef('')
  const resource = useResource(async () => {
    const business = await publicBusiness(slug)
    if (!business) return null
    const [hours, areas, services, photos, reviews] = await Promise.all([
      supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', business.id)
        .order('weekday'),
      supabase
        .from('business_service_areas')
        .select('*')
        .eq('business_id', business.id),
      supabase
        .from('services')
        .select('*')
        .eq('business_id', business.id)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('business_photos')
        .select('*')
        .eq('business_id', business.id)
        .order('sort_order'),
      supabase
        .from('reviews')
        .select('*')
        .eq('business_id', business.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
    ])
    for (const result of [hours, areas, services, photos, reviews])
      if (result.error) throw result.error
    const authors = reviews.data?.length
      ? await supabase
          .from('public_profiles')
          .select('*')
          .in('id', [...new Set(reviews.data.map((r) => r.user_id))])
      : { data: [], error: null }
    if (authors.error) throw authors.error
    const neighborhoods = areas.data?.length
      ? await supabase
          .from('neighborhoods')
          .select('*')
          .in(
            'id',
            areas.data.map((a) => a.neighborhood_id),
          )
      : { data: [], error: null }
    if (neighborhoods.error) throw neighborhoods.error
    return {
      business,
      hours: hours.data ?? [],
      services: services.data ?? [],
      photos: photos.data ?? [],
      reviews: reviews.data ?? [],
      authors: authors.data ?? [],
      neighborhoods: neighborhoods.data ?? [],
    }
  }, [slug])
  const business = resource.data?.business
  useEffect(() => {
    if (!business || authLoading || visited.current === business.id) return
    visited.current = business.id
    void logVisit({
      businessId: business.id,
      visitorId: user?.id,
      source: 'profile',
    })
  }, [business, user?.id, authLoading])
  useEffect(() => {
    let active = true
    setSaved(false)
    setFavoriteLoading(Boolean(business && user))
    setError('')
    setMessage('')
    if (business && user)
      supabase
        .from('favorites')
        .select('business_id')
        .eq('business_id', business.id)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (active) {
            setFavoriteLoading(false)
            setSaved(Boolean(data))
            if (error) setError('Não foi possível consultar seus favoritos.')
          }
        })
    return () => {
      active = false
    }
  }, [business, user])
  async function favorite() {
    if (!business) return
    if (!user) {
      navigate('/entrar', { state: { from: `/empresa/${slug}` } })
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = saved
        ? await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('business_id', business.id)
        : await supabase
            .from('favorites')
            .insert({ user_id: user.id, business_id: business.id })
      if (result.error) throw result.error
      setSaved(!saved)
    } catch {
      setError('Não foi possível atualizar seus favoritos. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }
  async function share() {
    try {
      if (navigator.share)
        await navigator.share({
          title: business?.name,
          url: window.location.href,
        })
      else {
        await navigator.clipboard.writeText(window.location.href)
        setMessage('Link copiado! Compartilhe com quem precisa.')
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setError(
          'Não foi possível compartilhar. Copie o endereço desta página.',
        )
    }
  }
  if (resource.loading) return <Spinner />
  if (resource.error)
    return (
      <div className="mx-auto max-w-6xl p-6">
        <LoadError message={resource.error} retry={resource.reload} />
      </div>
    )
  if (!business || !resource.data) return <MissingBusiness />
  const data = resource.data
  const wa = whatsappLink(business.whatsapp || business.phone)
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Link to="/busca" className="text-sm font-bold text-brand">
        ← Voltar à busca
      </Link>
      <Card className="overflow-hidden">
        {business.cover_url ? (
          <img
            src={business.cover_url}
            alt={`Capa de ${business.name}`}
            className="h-48 w-full object-cover md:h-72"
          />
        ) : (
          <div className="h-28 bg-brand-soft" />
        )}
        <div className="space-y-5 p-6">
          <div className="flex items-start gap-4">
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt={`Logo de ${business.name}`}
                className="h-20 w-20 rounded-2xl border border-line bg-white object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-extrabold">{business.name}</h1>
              <p className="mt-1 text-muted">{business.tagline}</p>
              <p className="mt-2 text-sm text-muted">
                {business.categories?.name}
                {business.neighborhoods && ` · ${business.neighborhoods.name}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 inline-flex items-center gap-1 text-sm font-bold">
              <Star size={17} className="fill-amber-400 text-amber-400" />
              {business.business_stats?.avg_rating
                ? Number(business.business_stats.avg_rating).toFixed(1)
                : 'Sem nota'}{' '}
              <span className="font-normal text-muted">
                ({business.business_stats?.review_count ?? 0} avaliações)
              </span>
            </span>
            {business.home_service && <Badge>Atende em casa</Badge>}
            {isReceivingNow(business) && (
              <Badge tone="success">Recebendo pedidos</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1f9e54] px-4 text-sm font-bold text-white"
                onClick={() => {
                  void logWhatsAppClick({
                    businessId: business.id,
                    userId: user?.id,
                    source: 'profile',
                  })
                }}
              >
                <MessageCircle size={18} /> Chamar no WhatsApp
              </a>
            )}
            <Button
              variant={saved ? 'secondary' : 'outline'}
              disabled={saving || favoriteLoading || authLoading}
              onClick={favorite}
            >
              <Heart size={18} className={saved ? 'fill-current' : ''} />
              {saved ? 'Salvo' : 'Salvar'}
            </Button>
            <Button variant="outline" onClick={share}>
              <Share2 size={18} /> Compartilhar
            </Button>
            <Link
              to={`/empresa/${slug}/avaliar`}
              className="inline-flex h-11 items-center rounded-xl bg-brand px-4 text-sm font-bold text-white"
            >
              Avaliar
            </Link>
          </div>
          {error && <Notice error>{error}</Notice>}
          {message && <Notice>{message}</Notice>}
        </div>
      </Card>
      <div
        role="tablist"
        aria-label="Informações da empresa"
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {[
          { id: 'overview', label: 'Visão geral' },
          { id: 'services', label: 'Serviços e fotos' },
          { id: 'reviews', label: 'Avaliações' },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 border-b-2 px-4 py-3 font-bold ${tab === t.id ? 'border-brand text-brand' : 'border-transparent text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <Card className="space-y-6 p-6">
              <section>
                <h2 className="mb-3 text-xl font-bold">Sobre a empresa</h2>
                <p className="whitespace-pre-wrap text-muted">
                  {business.description ||
                    'A empresa ainda não informou uma descrição.'}
                </p>
              </section>
              <section>
                <h2 className="mb-3 font-bold">Endereço e contato</h2>
                <p className="flex items-center gap-2 text-muted">
                  <MapPin size={17} />
                  {business.address ||
                    business.neighborhoods?.name ||
                    'Endereço não informado'}
                </p>
                {business.phone && (
                  <a
                    className="mt-2 block text-brand"
                    href={`tel:${business.phone.replace(/[^+\d]/g, '')}`}
                  >
                    {formatPhone(business.phone)}
                  </a>
                )}
              </section>
              <section>
                <h2 className="mb-3 font-bold">Bairros atendidos</h2>
                <div className="flex flex-wrap gap-2">
                  {data.neighborhoods.length ? (
                    data.neighborhoods.map((n) => (
                      <Badge key={n.id}>{n.name}</Badge>
                    ))
                  ) : (
                    <p className="text-muted">
                      Consulte a empresa sobre a sua região.
                    </p>
                  )}
                </div>
              </section>
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 text-lg font-bold">
                Horários de atendimento
              </h2>
              {data.hours.length ? (
                <dl className="space-y-3 text-sm">
                  {WEEKDAYS.map((day) => {
                    const h = data.hours.find((h) => h.weekday === day.value)
                    return (
                      <div
                        className="flex justify-between gap-3"
                        key={day.value}
                      >
                        <dt>{day.label}</dt>
                        <dd className="text-muted">
                          {!h
                            ? 'Não informado'
                            : h.is_closed
                              ? 'Fechado'
                              : h.open_time && h.close_time
                                ? `${h.open_time.slice(0, 5)}–${h.close_time.slice(0, 5)}`
                                : 'Consultar'}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              ) : (
                <p className="text-sm text-muted">
                  Confirme os horários diretamente com a empresa.
                </p>
              )}
            </Card>
          </div>
        )}
        {tab === 'services' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-bold">Serviços</h2>
              {data.services.length ? (
                <div className="divide-y divide-line">
                  {data.services.map((s) => (
                    <div key={s.id} className="flex justify-between gap-4 py-4">
                      <div>
                        <h3 className="font-bold">{s.name}</h3>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                          {s.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-brand">
                        {s.price_label ||
                          formatCurrency(s.price) ||
                          'Sob consulta'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">
                  Consulte a empresa para conhecer os serviços disponíveis.
                </p>
              )}
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-bold">Fotos</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.photos.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={p.url}
                      alt={p.alt || business.name}
                      loading="lazy"
                      className="aspect-square w-full rounded-xl object-cover"
                    />
                  </a>
                ))}
              </div>
              {!data.photos.length && (
                <p className="text-muted">
                  A empresa ainda não adicionou fotos.
                </p>
              )}
            </Card>
          </div>
        )}
        {tab === 'reviews' && (
          <Card className="p-6">
            <h2 className="mb-5 text-xl font-bold">
              Experiências da comunidade
            </h2>
            {!data.reviews.length && (
              <p className="text-muted">
                Seja a primeira pessoa a avaliar esta empresa.
              </p>
            )}
            <div className="space-y-5">
              {data.reviews.map((r) => (
                <article
                  key={r.id}
                  className="border-b border-line pb-5 last:border-0"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-bold">
                      {data.authors.find((a) => a.id === r.user_id)
                        ?.full_name || 'Morador'}
                    </h3>
                    <span className="text-sm text-muted">
                      {new Date(r.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p
                    aria-label={`${r.rating} de 5 estrelas`}
                    className="mt-1 text-amber-500"
                  >
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)}
                  </p>
                  {r.title && <p className="mt-3 font-bold">{r.title}</p>}
                  <p className="mt-2 whitespace-pre-wrap text-muted">
                    {r.body}
                  </p>
                  {r.reply_text && (
                    <div className="mt-4 rounded-xl bg-brand-soft p-4">
                      <p className="text-sm font-bold text-brand-dark">
                        Resposta da empresa
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {r.reply_text}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
