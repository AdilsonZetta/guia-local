import { Link, useParams } from 'react-router-dom'
import { ArrowUpRight, MapPin, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  isWhatsAppUrl,
  publicBusiness,
  safeExternalUrl,
  useResource,
} from '@/lib/public-data'
import { logWhatsAppClick } from '@/lib/analytics'
import { useAuth } from '@/context/AuthProvider'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState, LoadError } from '@/components/PageContent'

const themes: Record<
  string,
  { background: string; card: string; accent: string }
> = {
  forest: { background: '#e8f3ed', card: '#0F7B5A', accent: '#164c39' },
  rose: { background: '#fff0f3', card: '#a93862', accent: '#702844' },
  ocean: { background: '#e9f5fc', card: '#126b91', accent: '#154b65' },
  sand: { background: '#faf2e5', card: '#876039', accent: '#62472c' },
}
export function LinkInBioPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
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
      className="flex min-h-svh justify-center px-5 py-12"
      style={{ backgroundColor: theme.background, color: theme.accent }}
    >
      <div className="w-full max-w-sm text-center">
        {business.logo_url ? (
          <img
            src={business.logo_url}
            alt={business.name}
            className="mx-auto mb-5 h-24 w-24 rounded-full border-4 border-white object-cover shadow-sm"
          />
        ) : (
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-extrabold shadow-sm">
            {business.name.slice(0, 1)}
          </div>
        )}
        <h1 className="text-2xl font-extrabold">
          {link.headline || business.name}
        </h1>
        {link.bio && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
            {link.bio}
          </p>
        )}
        {business.neighborhoods && (
          <p className="mt-4 flex items-center justify-center gap-1 text-xs">
            <MapPin size={14} />
            {business.neighborhoods.name} · Uberaba
          </p>
        )}
        <div className="mt-8 space-y-3">
          {buttons.map((button) => {
            const url = safeExternalUrl(button.url)
            if (!url) return null
            const whatsapp = isWhatsAppUrl(url)
            return (
              <a
                key={button.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: theme.card }}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl px-5 py-4 font-bold text-white shadow-sm transition hover:-translate-y-0.5"
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
                  <MessageCircle size={20} />
                ) : (
                  <ArrowUpRight size={20} />
                )}
                <span className="flex-1">{button.label}</span>
                <ArrowUpRight size={16} />
              </a>
            )
          })}
        </div>
        <Link
          to={`/empresa/${business.slug}`}
          className="mt-8 inline-block text-sm font-bold underline underline-offset-4"
        >
          Ver perfil e avaliações
        </Link>
        <Link to="/" className="mt-12 block text-xs opacity-75">
          Feito para conectar · Guia Local
        </Link>
      </div>
    </main>
  )
}
