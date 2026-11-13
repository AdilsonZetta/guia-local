import { MapPin, MessageCircle, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { logWhatsAppClick } from '@/lib/analytics'
import type { Tables } from '@/lib/database.types'
import { isReceivingNow, whatsappLink } from '@/lib/utils'
import { useAuth } from '@/context/AuthProvider'

type Business = Tables<'businesses'> & {
  categories?: { name: string; slug: string } | null
  neighborhoods?: { name: string } | null
  business_stats?: {
    avg_rating: number | null
    review_count: number | null
  } | null
}

export function BusinessCard({
  business,
  source = 'search',
}: {
  business: Business
  source?: string
}) {
  const { user } = useAuth()
  const receiving = isReceivingNow(business)
  const rating = business.business_stats?.avg_rating
  const count = business.business_stats?.review_count ?? 0
  const wa = whatsappLink(
    business.whatsapp || business.phone,
    `Olá, vi o perfil de ${business.name} no Guia Local e gostaria de mais informações.`,
  )

  return (
    <Card className="flex flex-col overflow-hidden sm:flex-row">
      <Link
        to={`/empresa/${business.slug}`}
        className="block h-40 w-full shrink-0 bg-brand-soft sm:h-auto sm:w-48"
      >
        {business.cover_url || business.logo_url ? (
          <img
            src={business.cover_url || business.logo_url || ''}
            alt={business.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand">
            Sem foto
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link
              to={`/empresa/${business.slug}`}
              className="text-lg font-extrabold text-ink hover:text-brand"
            >
              {business.name}
            </Link>
            <p className="text-sm text-muted">{business.tagline}</p>
          </div>
          <div className="flex items-center gap-1 text-sm font-bold text-ink">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {rating ? Number(rating).toFixed(1) : '—'}
            <span className="font-medium text-muted">({count})</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {business.categories?.name && (
            <Badge tone="brand">{business.categories.name}</Badge>
          )}
          {business.neighborhoods?.name && (
            <Badge>
              <MapPin className="mr-1 h-3 w-3" />
              {business.neighborhoods.name}
            </Badge>
          )}
          {business.home_service && (
            <Badge tone="neutral">Atende em casa</Badge>
          )}
          {receiving ? (
            <Badge tone="success">Recebendo pedidos</Badge>
          ) : (
            <Badge>Agenda fechada</Badge>
          )}
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          <Link to={`/empresa/${business.slug}`}>
            <Button variant="outline" size="sm">
              Ver perfil
            </Button>
          </Link>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#1f9e54] px-3 text-sm font-semibold text-white hover:bg-[#188447]"
              onClick={() => {
                void logWhatsAppClick({
                  businessId: business.id,
                  source,
                  userId: user?.id,
                })
              }}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </Card>
  )
}
