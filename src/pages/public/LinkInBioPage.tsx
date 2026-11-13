import { MeshBackground } from '@/components/layout/MeshBackground'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Share2, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  isWhatsAppUrl,
  publicBusiness,
  safeExternalUrl,
  useResource,
} from '@/lib/public-data'
import { logWhatsAppClick } from '@/lib/analytics'
import { useAuth } from '@/context/AuthProvider'
import { CategoryIcon } from '@/components/CategoryIcon'
import {
  BrandTile,
  Rating,
  ReceivingChip,
} from '@/components/business/BusinessIdentity'
import { useState } from 'react'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, LoadError } from '@/components/PageContent'

const themes: Record<
  string,
  { background: string; card: string; accent: string }
> = {
  dark: { background: '#053e30', card: '#0F7B5A', accent: '#ffffff' },
  forest: { background: '#e8f3ed', card: '#0F7B5A', accent: '#164c39' },
  rose: { background: '#fff0f3', card: '#a93862', accent: '#702844' },
  ocean: { background: '#e9f5fc', card: '#126b91', accent: '#154b65' },
  sand: { background: '#faf2e5', card: '#876039', accent: '#62472c' },
}
export function LinkInBioPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const [shareMessage, setShareMessage] = useState('')
  const resource = useResource(async () => {
    const [settings, link] = await Promise.all([
      supabase
        .from('site_settings')
        .select('link_in_bio_enabled')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('link_in_bio')
        .select('*')
        .eq('slug', slug)
        .eq('enabled', true)
        .maybeSingle(),
    ])
    if (settings.error) throw settings.error
    if (link.error) throw link.error
    if (!settings.data?.link_in_bio_enabled || !link.data) return null
    const { data: raw, error } = await supabase
      .from('businesses')
      .select('slug')
      .eq('id', link.data.business_id)
      .eq('status', 'active')
      .eq('is_paused', false)
      .maybeSingle()
    if (error) throw error
    if (!raw) return null
    const [business, buttons] = await Promise.all([
      publicBusiness(raw.slug),
      supabase
        .from('link_in_bio_buttons')
        .select('*')
        .eq('link_id', link.data.id)
        .eq('enabled', true)
        .order('sort_order'),
    ])
    if (buttons.error) throw buttons.error
    if (!business) return null
    return { link: link.data, business, buttons: buttons.data }
  }, [slug])
  if (resource.loading) return <Spinner />
  if (resource.error)
    return (
      <div className="mx-auto max-w-md p-6">
        <LoadError message={resource.error} retry={resource.reload} />
      </div>
    )
  if (!resource.data)
    return (
      <div className="mx-auto max-w-md p-6">
        <EmptyState title="Página indisponível">
          <Link to="/" className="text-brand">
            Conhecer o Guia Local
          </Link>
        </EmptyState>
      </div>
    )
  const { link, business, buttons } = resource.data
  const theme = themes[link.theme] ?? themes.forest
  return (
    <main
      className="bio-page mesh-shell relative flex min-h-svh justify-center overflow-hidden px-5 py-12 text-ink"
    >
      <MeshBackground />
      <div className="relative z-10 w-full max-w-xl py-8 text-center">
        <button
          aria-label="Compartilhar página"
          className="bio-share"
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({
                  title: business.name,
                  url: window.location.href,
                })
              else {
                await navigator.clipboard.writeText(window.location.href)
                setShareMessage('Link copiado!')
              }
            } catch (err) {
              if (!(err instanceof DOMException && err.name === 'AbortError'))
                setShareMessage(
                  'Copie o endereço desta página para compartilhar.',
                )
            }
          }}
        >
          <Share2 size={28} />
        </button>
        {shareMessage && (
          <p role="status" className="mb-4 text-sm">
            {shareMessage}
          </p>
        )}
        <BrandTile business={business} className="bio-logo" />
        <h1 className="mt-5 text-4xl font-extrabold text-ink md:text-5xl">
          {link.headline || business.name}
        </h1>
        {link.bio && (
          <p className="mt-3 whitespace-pre-wrap text-2xl leading-snug text-muted">
            {link.bio}
          </p>
        )}
        <div className="mt-5 text-xl">
          <Rating
            rating={business.business_stats?.avg_rating}
            count={business.business_stats?.review_count}
          />
        </div>
        <div className="mt-3">
          <ReceivingChip business={business} />
        </div>
        <div className="mt-8 space-y-3">
          {buttons.map((button) => {
            const url = safeExternalUrl(
              button.url.startsWith('/')
                ? new URL(button.url, window.location.origin).href
                : button.url,
            )
            if (!url) return null
            const whatsapp = isWhatsAppUrl(url)
            return (
              <a
                key={button.id}
                href={url}
                target={
                  url.startsWith(window.location.origin + '/')
                    ? undefined
                    : '_blank'
                }
                rel="noopener noreferrer"
                style={{
                  backgroundColor: whatsapp ? theme.card : 'var(--glass-fill)',
                  color: whatsapp ? 'white' : link.theme === 'dark' ? '#0e1536' : theme.accent,
                  borderColor: theme.card,
                }}
                className="bio-link flex min-h-20 items-center justify-between gap-4 rounded-2xl border-2 px-6 py-5 text-xl font-extrabold shadow-sm transition hover:-translate-y-0.5"
                onClick={() => {
                  if (whatsapp)
                    void logWhatsAppClick({
                      businessId: business.id,
                      source: 'link_in_bio',
                      userId: user?.id,
                    })
                }}
              >
                {whatsapp ? (
                  <WhatsAppIcon size={20} />
                ) : (
                  <CategoryIcon name={button.icon} className="h-7 w-7" />
                )}
                <span className="flex-1">{button.label}</span>
                <ChevronRight size={25} />
              </a>
            )
          })}
        </div>
        <Link
          to={`/empresa/${business.slug}`}
          className="mt-8 inline-block text-xl font-bold underline underline-offset-4"
        >
          Ver perfil completo
        </Link>
        <Link
          to="/"
          className="mt-12 flex items-center justify-center gap-2 text-2xl font-extrabold"
        >
          <MapPin size={32} className="fill-brand text-brand" /> Guia Local
        </Link>
      </div>
    </main>
  )
}
