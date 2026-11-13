import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Photo } from '@/components/Photo'
import { Heart, MapPin } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { logWhatsAppClick } from '@/lib/analytics'
import { useResource } from '@/lib/public-data'
import type { PublicBusiness } from '@/lib/public-data'
import { businessLocation, whatsappLink } from '@/lib/utils'
import { useAuth } from '@/context/AuthProvider'
import { supabase } from '@/lib/supabase'
import { BrandTile, Rating, ReceivingChip } from './BusinessIdentity'
export function BusinessCard({
  business,
  source = 'search',
  wide = false,
  city = 'Uberaba',
}: {
  business: Omit<
    PublicBusiness,
    'categories' | 'neighborhoods' | 'business_stats'
  > & {
    categories?: PublicBusiness['categories']
    neighborhoods?: PublicBusiness['neighborhoods']
    business_stats?: PublicBusiness['business_stats']
  }
  source?: string
  city?: string
  wide?: boolean
}) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const favorite = useResource(async () => {
    if (!user) return false
    const result = await supabase
      .from('favorites')
      .select('business_id')
      .eq('user_id', user.id)
      .eq('business_id', business.id)
      .maybeSingle()
    if (result.error) throw result.error
    return Boolean(result.data)
  }, [user?.id, business.id])
  const wa =
    business.show_whatsapp !== false
      ? whatsappLink(business.whatsapp || business.phone)
      : null
  const href = `/empresa/${business.slug}?src=${encodeURIComponent(source)}`
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
    const result = favorite.data
      ? await supabase
          .from('favorites')
          .delete()
          .eq('business_id', business.id)
          .eq('user_id', user.id)
      : await supabase
          .from('favorites')
          .insert({ business_id: business.id, user_id: user.id })
    if (result.error) setError('Não foi possível atualizar o favorito.')
    else favorite.reload()
    setBusy(false)
  }
  return (
    <article className={`business-card ${wide ? 'business-card-wide' : ''}`}>
      <div className="relative business-cover">
        <Link to={href} className="block h-full">
          {business.cover_url ? (
            <Photo
              src={business.cover_url}
              alt={business.name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-brand-soft text-brand">
              <BrandTile business={business} />
            </div>
          )}
        </Link>
        <button
          aria-label={
            favorite.data ? 'Remover dos favoritos' : 'Salvar nos favoritos'
          }
          disabled={busy || favorite.loading}
          onClick={() => void toggle()}
          className="absolute right-3 top-3 rounded-full bg-white p-2 text-ink shadow-sm"
        >
          <Heart
            size={19}
            className={favorite.data ? 'fill-brand text-brand' : ''}
          />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-4">
          <BrandTile business={business} className="card-brand" />
          <div className="min-w-0">
            <Link to={href} className="text-lg font-extrabold leading-tight">
              {business.name}
            </Link>
            <p className="mb-1 text-sm text-muted">
              {business.categories?.name}
            </p>
            <Rating
              rating={business.business_stats?.avg_rating}
              count={business.business_stats?.review_count}
            />
          </div>
        </div>
        <p className="mb-2 mt-3 flex items-center gap-2 text-sm text-muted">
          <MapPin size={17} />
          {source === 'home'
            ? `Atende em ${city}`
            : businessLocation(business, city)}
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
                className="btn-primary h-10 text-sm"
                onClick={() =>
                  void logWhatsAppClick({
                    businessId: business.id,
                    source:
                      new URLSearchParams(window.location.search).get('src') ||
                      source,
                    userId: user?.id,
                  })
                }
              >
                <WhatsAppIcon size={20} />
                Contato
              </a>
            )}
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </article>
  )
}
