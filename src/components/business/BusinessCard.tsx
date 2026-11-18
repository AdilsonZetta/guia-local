import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Photo } from '@/components/Photo'
import { Heart, MapPin, Phone } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { logWhatsAppClick } from '@/lib/analytics'
import type { PublicBusiness } from '@/lib/public-data'
import { businessLocation, cn, whatsappLink } from '@/lib/utils'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { BrandTile, Rating, ReceivingChip, ratingView } from './BusinessIdentity'

type CardBusiness = Omit<
  PublicBusiness,
  'categories' | 'neighborhoods' | 'business_stats'
> & {
  categories?: { name: string; slug?: string | null } | null
  neighborhoods?: { name: string } | null
  business_stats?: { avg_rating?: number | null; review_count?: number | null } | null
}

function FavoriteButton({
  saved,
  busy,
  className,
  onToggle,
}: {
  saved: boolean
  busy: boolean
  className?: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-label={saved ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
      aria-pressed={saved}
      disabled={busy}
      onClick={onToggle}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-sm',
        className,
      )}
    >
      <Heart aria-hidden="true" size={18} className={saved ? 'fill-brand text-brand' : ''} />
    </button>
  )
}

export function BusinessCard({
  business,
  source = 'search',
  wide = false,
  city = 'Uberaba',
}: {
  business: CardBusiness
  source?: string
  city?: string
  wide?: boolean
}) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const favorites = useQuery({
    queryKey: ['favorite-ids', user?.id],
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: async () => {
      const ids: string[] = []
      for (let offset = 0; offset < 5000; offset += 200) {
        const { data, error: favoriteError } = await supabase
          .from('favorites')
          .select('business_id')
          .eq('user_id', user!.id)
          .order('business_id')
          .range(offset, offset + 199)
        if (favoriteError) throw favoriteError
        ids.push(...data.map((row) => row.business_id))
        if (data.length < 200) break
      }
      return ids
    },
  })
  const saved = favorites.data?.includes(business.id) ?? false
  const viewed = ratingView(business)
  const wa =
    business.show_whatsapp !== false
      ? whatsappLink(business.whatsapp || business.phone)
      : null
  const telDigits = business.phone?.replace(/\D/g, '')
  const tel = telDigits ? `tel:+${telDigits.startsWith('55') ? telDigits : `55${telDigits}`}` : null
  const href = `/empresa/${business.slug}?src=${encodeURIComponent(source)}`
  const place = businessLocation(business, city)
  async function toggle() {
    if (!user) {
      navigate('/entrar', {
        state: {
          from:
            window.location.pathname.replace(/^\/guia-local/, '') +
            window.location.search,
        },
      })
      return
    }
    if (profile?.status === 'suspended') {
      setError('Conta suspensa. Entre em contato com a equipe do Guia Local.')
      return
    }
    setBusy(true)
    setError('')
    const result = saved
      ? await supabase
          .from('favorites')
          .delete()
          .eq('business_id', business.id)
          .eq('user_id', user.id)
      : await supabase
          .from('favorites')
          .insert({ business_id: business.id, user_id: user.id })
    if (result.error) setError('Não foi possível atualizar o favorito.')
    else {
      queryClient.setQueryData<string[]>(['favorite-ids', user.id], (current = []) =>
        saved ? current.filter((id) => id !== business.id) : [...current, business.id],
      )
      void queryClient.invalidateQueries({ queryKey: ['favorites', user.id] })
    }
    setBusy(false)
  }
  const favoriteBusy = busy || favorites.isLoading
  function trackWhatsApp() {
    void logWhatsAppClick({
      businessId: business.id,
      source: new URLSearchParams(window.location.search).get('src') || source,
      userId: user?.id,
    })
  }
  return (
    <article className={`business-card ${wide ? 'business-card-wide' : ''} ${business.cover_url ? 'business-card-photo' : 'business-card-plain'}`}>
      <MobileCard
        business={business}
        href={href}
        place={place}
        viewed={viewed}
        wa={wa}
        tel={tel}
        saved={saved}
        favoriteBusy={favoriteBusy}
        onToggle={() => void toggle()}
        onWhatsApp={trackWhatsApp}
        error={error}
      />
      <div className="desktop-card-layout">
        <div className="relative business-cover">
          <Link to={href} className="block h-full">
            {business.cover_url ? (
              <Photo
                src={business.cover_url}
                alt={business.name}
                width={640}
                height={360}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-brand-soft text-brand">
                <BrandTile business={business} />
              </div>
            )}
          </Link>
          <FavoriteButton
            saved={saved}
            busy={favoriteBusy}
            onToggle={() => void toggle()}
            className="absolute right-3 top-3"
          />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start gap-4">
            <BrandTile business={business} className="card-brand" />
            <div className="min-w-0">
              <Link to={href} className="text-lg font-extrabold leading-tight">
                {business.name}
              </Link>
              <p className="mb-1 text-sm text-muted">{business.categories?.name}</p>
              <Rating rating={viewed.rating} count={viewed.count} source={viewed.source} />
            </div>
          </div>
          <p className="mb-2 mt-3 flex items-center gap-2 text-sm text-muted">
            <MapPin aria-hidden="true" size={17} />
            {source === 'home' ? `Atende em ${city}` : place}
          </p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              <ReceivingChip business={business} />
              {business.home_service && source === 'home' && (
                <span className="status-chip receiving">Em domicílio</span>
              )}
            </div>
            <div className="flex gap-2">
              <Link to={href} className="btn-outline h-10 px-5 text-sm">
                Ver perfil
              </Link>
              {source !== 'home' && wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp h-10 text-sm"
                  onClick={trackWhatsApp}
                >
                  <WhatsAppIcon size={20} />
                  Contato
                </a>
              )}
            </div>
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function MobileCard({
  business,
  href,
  place,
  viewed,
  wa,
  tel,
  saved,
  favoriteBusy,
  onToggle,
  onWhatsApp,
  error,
}: {
  business: CardBusiness
  href: string
  place: string
  viewed: ReturnType<typeof ratingView>
  wa: string | null
  tel: string | null
  saved: boolean
  favoriteBusy: boolean
  onToggle: () => void
  onWhatsApp: () => void
  error: string
}) {
  return (
    <div className="mobile-card">
      {business.cover_url ? (
        <div className="relative">
          <Link to={href} className="relative block aspect-video overflow-hidden">
            <Photo
              src={business.cover_url}
              alt=""
              width={640}
              height={360}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </Link>
          <FavoriteButton
            saved={saved}
            busy={favoriteBusy}
            onToggle={onToggle}
            className="absolute right-2 top-2"
          />
        </div>
      ) : null}
      <div className="flex items-start gap-3 p-3">
        {business.cover_url ? null : <BrandTile business={business} className="card-avatar" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <Link to={href} className="min-w-0 flex-1 text-[15px] font-semibold leading-snug break-words">
              {business.name}
            </Link>
            {business.cover_url ? null : (
              <FavoriteButton saved={saved} busy={favoriteBusy} onToggle={onToggle} className="shadow-none" />
            )}
          </div>
          <p className="text-[13px] text-muted">{business.categories?.name}</p>
          <p className="mt-0.5 flex items-start gap-1 text-[13px] text-muted">
            <MapPin aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{place}</span>
          </p>
          <Rating
            className="rating-compact mt-1"
            rating={viewed.rating}
            count={viewed.count}
            source={viewed.source}
          />
        </div>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        <Link to={href} className="btn-outline min-h-11 flex-1 px-3 text-sm">
          Ver perfil
        </Link>
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp min-h-11 flex-1 px-3 text-sm"
            onClick={onWhatsApp}
          >
            <WhatsAppIcon size={18} />
            WhatsApp
          </a>
        ) : tel ? (
          <a href={tel} className="btn-outline min-h-11 flex-1 px-3 text-sm">
            <Phone aria-hidden="true" size={18} />
            Ligar
          </a>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="px-3 pb-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
