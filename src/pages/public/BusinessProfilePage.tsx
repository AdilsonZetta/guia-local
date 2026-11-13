import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Photo } from '@/components/Photo'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Heart,
  Share2,
  Star,
  MapPin,
  Home,
  Images,
  ArrowRight,
  Clock,
  Map,
  Info,
  Search,
  X,
} from 'lucide-react'
import { publicBusiness, useResource } from '@/lib/public-data'
import { applySeo } from '@/lib/seo'
import { supabase } from '@/lib/supabase'
import { logVisit, logWhatsAppClick } from '@/lib/analytics'
import { WEEKDAYS, whatsappLink } from '@/lib/utils'
import { useAuth } from '@/context/AuthProvider'
import {
  BrandTile,
  Rating,
  ReceivingChip,
} from '@/components/business/BusinessIdentity'
import { CategoryIcon } from '@/components/CategoryIcon'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { LoadError, MissingBusiness, Notice } from '@/components/PageContent'

function visitSource() {
  const src = new URLSearchParams(window.location.search).get('src')
  if (src) return src
  const ref = document.referrer
  return /instagram/i.test(ref)
    ? 'instagram'
    : /google/i.test(ref)
      ? 'google'
      : ref && ref.includes(window.location.host)
        ? 'home'
        : 'direct'
}
export function BusinessProfilePage() {
  const { slug = '' } = useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [city, setCity] = useState('Uberaba')
  const [siteName,setSiteName]=useState('Guia Local')
  const [lightbox, setLightbox] = useState('')
  const [reviewSort, setReviewSort] = useState('recent')
  const [reviewRating, setReviewRating] = useState('')
  const [reporting, setReporting] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [tab, setTab] = useState(
    () =>
      ({ servicos: 'services', avaliacoes: 'reviews' })[
        new URLSearchParams(window.location.search).get('tab') || ''
      ] || 'overview',
  )
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
  useEffect(() => {
    if (!lightbox) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox('')
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [lightbox])
  const business = resource.data?.business
  useEffect(() => {
    void supabase
      .from('site_settings')
      .select('city_name,site_name')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.city_name) setCity(data.city_name)
        if(data?.site_name)setSiteName(data.site_name)
      })
  }, [])
  useEffect(() => {
    if (!business) return
    const previous = document.title
    const title = `${business.name} em ${city} | ${siteName}`
    const description =
      business.description ||
      business.tagline ||
      `Conheça ${business.name} em ${city}.`
    applySeo({
      title,
      description,
      image: business.cover_url || business.logo_url || undefined,
      url: window.location.href,
    })
    return () => {
      document.title = previous
    }
  }, [business, city, siteName])
  useEffect(() => {
    if (!business || authLoading || visited.current === business.id) return
    visited.current = business.id
    void logVisit({
      businessId: business.id,
      visitorId: user?.id,
      source: visitSource(),
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
  const reviewBusiness = business
  const wa = business.show_whatsapp
    ? whatsappLink(business.whatsapp || business.phone)
    : null
  const contact = wa && (
    <a
      href={wa}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-primary"
      onClick={() =>
        void logWhatsAppClick({
          businessId: business.id,
          userId: user?.id,
          source: visitSource(),
        })
      }
    >
      <WhatsAppIcon size={24} />
      Chamar no WhatsApp
    </a>
  )
  const reviewLink = (
    <Link to={`/empresa/${slug}/avaliar`} className="btn-outline">
      <Star size={23} />
      Escrever avaliação
    </Link>
  )
  const pictures = [
    ...(business.cover_url
      ? [{ url: business.cover_url, alt: business.name }]
      : []),
    ...data.photos.filter(
      (p) => p.url.split('?')[0] !== business.cover_url?.split('?')[0],
    ),
  ]
  function reviewCard(r: (typeof data.reviews)[number]) {
    const author =
      data.authors.find((a) => a.id === r.user_id)?.full_name || 'Morador'
    return (
      <article
        key={r.id}
        className="rounded-xl border border-line bg-white p-4"
      >
        <div className="flex gap-4">
          <span className="avatar !h-14 !w-14 !bg-indigo-50 !text-ink">
            {author
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0])
              .join('')}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-3">
              <h3 className="font-extrabold">{author}</h3>
              <button
                className="text-xs text-muted"
                onClick={() => {
                  if (!user) {
                    navigate('/entrar', {
                      state: { from: `/empresa/${slug}` },
                    })
                    return
                  }
                  setReporting(r.id)
                }}
              >
                Denunciar
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xl text-amber-500">
                {'★'.repeat(r.rating)}
                <span className="text-gray-300">
                  {'★'.repeat(5 - r.rating)}
                </span>
              </span>
              <span className="text-xs text-muted">
                {data.services.find((s) => s.id === r.service_id)?.name} ·{' '}
                {new Date(r.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap">{r.body}</p>
            {r.reply_text && (
              <div className="mt-4 flex gap-4 rounded-xl bg-canvas p-4">
                <BrandTile
                  business={reviewBusiness}
                  className="!h-12 !w-12 !rounded-lg"
                />
                <div>
                  <p className="text-sm font-extrabold">
                    Resposta de {reviewBusiness.name}
                  </p>
                  <p className="mt-1 text-muted">{r.reply_text}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>
    )
  }
  return (
    <div className="site-container space-y-5 py-5">
      <nav className="flex gap-3 text-sm text-muted">
        <Link to="/">Início</Link>
        <span>/</span>
        <Link to={`/busca?categoria=${business.categories?.slug || ''}`}>
          {business.categories?.name}
        </Link>
        <span>/</span>
        <span className="text-ink">{business.name}</span>
      </nav>
      <div className="flex flex-wrap items-center gap-5 py-2">
        <BrandTile business={business} className="!h-24 !w-24 !rounded-2xl" />
        <div>
          <h1 className="text-3xl font-extrabold md:text-4xl">
            {business.name}
          </h1>
          <p className="mb-1 text-lg text-muted">
            {business.categories?.name} • {city}, MG
          </p>
          <Rating
            rating={business.business_stats?.avg_rating}
            count={business.business_stats?.review_count}
          />
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={saving || favoriteLoading || authLoading}
            onClick={favorite}
          >
            <Heart size={21} className={saved ? 'fill-current' : ''} />
            {saved ? 'Salvo' : 'Salvar'}
          </Button>
          <Button variant="outline" onClick={share}>
            <Share2 size={20} />
            Compartilhar
          </Button>
          <Link to={`/empresa/${slug}/avaliar`} className="btn-outline">
            <Star size={22} />
            Avaliar
          </Link>
          {contact}
        </div>
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <div
        role="tablist"
        aria-label="Informações da empresa"
        className="flex gap-5 overflow-x-auto border-b border-line"
      >
        {[
          { id: 'overview', label: 'Visão geral', icon: Home },
          { id: 'services', label: 'Serviços e fotos', icon: Images },
          { id: 'reviews', label: 'Avaliações', icon: Star },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-3 border-b-[3px] px-5 py-3 text-lg ${tab === t.id ? 'border-brand font-bold text-brand' : 'border-transparent text-muted'}`}
          >
            <t.icon size={23} />
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'overview' && (
          <>
            <div className="mb-4 grid h-48 grid-cols-[2.3fr_1fr_1fr] gap-3 md:h-64">
              {pictures.slice(0, 3).map((p, i) => (
                <button
                  key={`${p.url}-${i}`}
                  onClick={() => setLightbox(p.url)}
                  className="overflow-hidden rounded-xl"
                >
                  <Photo
                    src={p.url}
                    alt={p.alt || business.name}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
            <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_1fr]">
              <Card className="space-y-4 p-6">
                <h2 className="text-2xl font-extrabold">Sobre o negócio</h2>
                <p className="whitespace-pre-wrap text-muted">
                  {business.description ||
                    'Conheça os serviços e fale diretamente com a empresa.'}
                </p>
                <div className="flex flex-wrap gap-3">
                  {data.services.map((s) => (
                    <span
                      key={s.id}
                      className="flex items-center gap-3 rounded-xl bg-brand-soft px-4 py-3 text-brand"
                    >
                      <CategoryIcon name={business.brand_icon} />
                      {s.name}
                    </span>
                  ))}
                </div>
                <section className="space-y-3 border-t border-line pt-4">
                  <h2 className="text-2xl font-extrabold">Quem já contratou</h2>
                  {data.reviews[0] ? (
                    reviewCard(data.reviews[0])
                  ) : (
                    <p className="text-muted">
                      Seja a primeira pessoa a contar sua experiência.
                    </p>
                  )}
                  <button
                    className="flex items-center gap-2 text-brand underline"
                    onClick={() => setTab('reviews')}
                  >
                    Ver todas as avaliações <ArrowRight size={19} />
                  </button>
                </section>
              </Card>
              <Card className="space-y-4 p-5">
                <div>
                  <h2 className="mb-2 text-2xl font-extrabold">
                    Fale com {business.name}
                  </h2>
                  <ReceivingChip business={business} />
                  <p className="mt-1 text-xs text-muted">
                    Atualizado em{' '}
                    {new Date(business.updated_at).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
                <dl className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <MapPin size={22} />
                    <dt>Atendimento</dt>
                    <dd className="ml-auto text-muted">
                      {business.attendance_type === 'client_address'
                        ? 'No endereço do cliente'
                        : business.attendance_type === 'both' ? 'No endereço do cliente e do negócio' : business.location_display === 'address' ? business.address || 'Consulte a empresa' : 'No endereço do negócio'}
                    </dd>
                  </div>
                  <div className="flex items-center gap-3">
                    <Map size={22} />
                    <dt>Regiões atendidas</dt>
                    <dd className="ml-auto flex flex-wrap gap-1">
                      {(['city','city_only'].includes(business.location_display) ? [] : data.neighborhoods).map((n) => (
                        <span
                          className="rounded-full bg-canvas px-3 py-1"
                          key={n.id}
                        >
                          {n.name}
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock size={22} />
                    <dt>Horário de contato</dt>
                    <dd className="ml-auto space-y-1 text-muted">
                      {data.hours.length ? (
                        <details>
                          <summary className="cursor-pointer">
                            {data.hours
                              .find((h) => !h.is_closed)
                              ?.open_time?.slice(0, 5) || 'Consultar'}{' '}
                            às{' '}
                            {data.hours
                              .find((h) => !h.is_closed)
                              ?.close_time?.slice(0, 5) || 'consultar'}{' '}
                            · Ver horários
                          </summary>
                          <div className="mt-2 space-y-1">
                            {data.hours.map((h) => (
                              <p key={h.id}>
                                {
                                  WEEKDAYS.find((d) => d.value === h.weekday)
                                    ?.label
                                }
                                :{' '}
                                {h.is_closed
                                  ? 'Fechado'
                                  : `${h.open_time?.slice(0, 5) || '—'} às ${h.close_time?.slice(0, 5) || '—'}`}
                              </p>
                            ))}
                          </div>
                        </details>
                      ) : (
                        'Consultar horários'
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="grid gap-2">
                  {contact}
                  {reviewLink}
                </div>
                <p className="flex gap-2 text-xs text-muted">
                  <Info size={18} className="shrink-0" />
                  Combine valores e disponibilidade diretamente com a empresa.
                </p>
              </Card>
            </div>
          </>
        )}
        {tab === 'services' && (
          <div className="grid items-start gap-5 lg:grid-cols-[.9fr_1.5fr]">
            <Card className="space-y-4 p-5">
              <h2 className="text-2xl font-extrabold">Serviços oferecidos</h2>
              {data.services.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-5 rounded-xl border border-line p-4"
                >
                  <span className="rounded-full bg-brand-soft p-5 text-brand">
                    <CategoryIcon
                      name={business.brand_icon}
                      className="h-9 w-9"
                    />
                  </span>
                  <div>
                    <h3 className="text-lg font-extrabold">{s.name}</h3>
                    <p className="text-muted">{s.description}</p>
                    {s.price_label && (
                      <p className="mt-1 text-sm text-brand">{s.price_label}</p>
                    )}
                  </div>
                </div>
              ))}
              {!data.services.length && (
                <p className="text-muted">
                  Fale com a empresa para conhecer os serviços disponíveis.
                </p>
              )}
              <div className="rounded-xl bg-brand-soft p-4">
                <h3 className="mb-2 font-bold">
                  Quer saber mais sobre um serviço?
                </h3>
                {contact}
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-4 flex justify-between">
                <h2 className="text-2xl font-extrabold">Fotos dos trabalhos</h2>
                <span className="text-muted">{data.photos.length} fotos</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.photos.map((p) => (
                  <figure key={p.id}>
                    <button
                      className="relative block w-full overflow-hidden rounded-lg"
                      onClick={() => setLightbox(p.url)}
                    >
                      <Photo
                        src={p.url}
                        alt={p.alt || business.name}
                        className="aspect-[1.45] w-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute right-2 top-2 rounded-full bg-white p-2">
                        <Search size={18} />
                      </span>
                    </button>
                    <figcaption className="mt-1 text-sm">
                      {p.alt || 'Trabalho realizado'}
                    </figcaption>
                  </figure>
                ))}
              </div>
              {!data.photos.length && (
                <p className="text-muted">
                  A empresa ainda não publicou fotos.
                </p>
              )}
              <p className="mt-5 text-xs text-muted">
                Fotos publicadas pela empresa.
              </p>
            </Card>
          </div>
        )}
        {tab === 'reviews' && (
          <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
            <Card className="space-y-5 p-6">
              <h2 className="border-b border-line pb-3 text-2xl font-extrabold">
                Avaliações dos clientes
              </h2>
              <div className="text-center">
                <strong className="text-7xl font-extrabold">
                  {business.business_stats?.avg_rating
                    ? Number(business.business_stats.avg_rating).toLocaleString(
                        'pt-BR',
                        { maximumFractionDigits: 1 },
                      )
                    : '—'}
                </strong>
                <p className="text-3xl text-amber-500">★★★★★</p>
                <p className="text-muted">{data.reviews.length} avaliações</p>
              </div>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = data.reviews.filter(
                    (r) => r.rating === n,
                  ).length
                  return (
                    <div key={n} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-muted">{n} estrelas</span>
                      <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="block h-full rounded-full bg-amber-400"
                          style={{
                            width: `${data.reviews.length ? (count / data.reviews.length) * 100 : 0}%`,
                          }}
                        />
                      </span>
                      <span>{count}</span>
                    </div>
                  )
                })}
              </div>
              <div className="grid">{reviewLink}</div>
              <p className="text-center text-sm text-muted">
                Conte como foi sua experiência.
              </p>
            </Card>
            <Card className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-extrabold">
                  Avaliações de clientes
                </h2>
                <div className="flex gap-2">
                  <select
                    aria-label="Ordenar avaliações"
                    className="rounded-lg border border-line p-2"
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value)}
                  >
                    <option value="recent">Mais recentes</option>
                    <option value="best">Melhores notas</option>
                  </select>
                  <select
                    aria-label="Filtrar notas"
                    className="rounded-lg border border-line p-2"
                    value={reviewRating}
                    onChange={(e) => setReviewRating(e.target.value)}
                  >
                    <option value="">Todas as notas</option>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} estrelas
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {data.reviews
                .filter(
                  (r) => !reviewRating || r.rating === Number(reviewRating),
                )
                .sort((a, b) =>
                  reviewSort === 'best'
                    ? b.rating - a.rating
                    : b.created_at.localeCompare(a.created_at),
                )
                .map(reviewCard)}
              {!data.reviews.length && (
                <p className="p-5 text-muted">
                  Seja a primeira pessoa a avaliar este negócio.
                </p>
              )}
            </Card>
          </div>
        )}
      </div>
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-8"
          onClick={() => setLightbox('')}
        >
          <button
            aria-label="Fechar foto"
            className="absolute right-5 top-5 rounded-full bg-white p-2"
          >
            <X />
          </button>
          <Photo
            src={lightbox}
            alt="Foto do trabalho ampliada"
            className="max-h-[85vh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}
      {reporting && (
        <Modal title="Denunciar avaliação" onClose={() => setReporting('')}>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!user) return
              setReportBusy(true)
              setError('')
              const result = await supabase.from('review_reports').insert({
                review_id: reporting,
                user_id: user.id,
                reason: reportReason.trim(),
              })
              setReportBusy(false)
              if (result.error) {
                setError('Não foi possível enviar a denúncia. Tente novamente.')
              } else {
                setMessage('Denúncia enviada para análise.')
                setReporting('')
                setReportReason('')
              }
            }}
          >
            {error && <Notice error>{error}</Notice>}
            <label className="block">
              Por que você está denunciando?
              <textarea
                className="mt-2 w-full rounded-xl border border-line p-3"
                value={reportReason}
                required
                minLength={10}
                maxLength={2000}
                onChange={(e) => setReportReason(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={reportBusy}>
              {reportBusy ? 'Enviando…' : 'Enviar denúncia'}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  )
}
