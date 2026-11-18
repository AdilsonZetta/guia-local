import { Star } from 'lucide-react'
import { CategoryIcon } from '@/components/CategoryIcon'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/database.types'
import { isReceivingNow } from '@/lib/utils'

/** Alternating Ubox tints. Ignores stored pink brand colors without writing to the database. */
export function tileTone(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0
  return hash % 2 === 0
    ? { background: 'var(--color-green-soft)', color: 'var(--color-ink)' }
    : { background: 'var(--color-orange-soft)', color: 'var(--color-ink)' }
}

export function BrandTile({
  business,
  className = '',
}: {
  business: Pick<Tables<'businesses'>, 'brand_color' | 'brand_icon' | 'name'>
  className?: string
}) {
  const tone = tileTone(business.name || 'guia')
  return (
    <span
      className={`brand-tile ${className}`}
      style={{ backgroundColor: tone.background, color: tone.color }}
      aria-label={business.name}
    >
      <CategoryIcon name={business.brand_icon} className="h-3/5 w-3/5" />
    </span>
  )
}
export function ratingView(business: {
  business_stats?: { avg_rating?: number | null; review_count?: number | null } | null
  google_rating?: number | string | null
  google_review_count?: number | null
}) {
  const count = Number(business.business_stats?.review_count ?? 0)
  const rating = Number(business.business_stats?.avg_rating ?? 0)
  if (count > 0 && rating > 0) {
    return { rating, count, source: 'platform' as const }
  }
  const googleRating = Number(business.google_rating ?? 0)
  const googleCount = Number(business.google_review_count ?? 0)
  if (googleRating > 0) {
    return { rating: googleRating, count: googleCount, source: 'google' as const }
  }
  return { rating: null, count: 0, source: 'none' as const }
}
export function Rating({
  rating,
  count = 0,
  source = 'platform',
  className = '',
}: {
  rating?: number | null
  count?: number | null
  source?: 'platform' | 'google' | 'none'
  className?: string
}) {
  const reviews = count ?? 0
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      <Star aria-hidden="true" className="h-5 w-5 fill-green-strong text-green-strong" />
      <strong className="tabular-nums">
        {rating
          ? Number(rating).toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          : 'Sem nota'}
      </strong>
      <span className="text-sm font-normal text-muted">
        {source === 'google'
          ? `(${reviews.toLocaleString('pt-BR')} no Google)`
          : `(${reviews.toLocaleString('pt-BR')} avaliações)`}
      </span>
    </span>
  )
}
export function ReceivingChip({
  business,
}: {
  business: Tables<'businesses'>
}) {
  const receiving = isReceivingNow(business)
  return (
    <span className={`status-chip ${receiving ? 'receiving' : 'unavailable'}`}>
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
      {receiving ? 'Recebendo pedidos' : 'Consultar disponibilidade'}
    </span>
  )
}
