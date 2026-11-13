import { Star } from 'lucide-react'
import { CategoryIcon } from '@/components/CategoryIcon'
import type { Tables } from '@/lib/database.types'
import { isReceivingNow } from '@/lib/utils'
export function BrandTile({
  business,
  className = '',
}: {
  business: Pick<Tables<'businesses'>, 'brand_color' | 'brand_icon' | 'name'>
  className?: string
}) {
  return (
    <span
      className={`brand-tile ${className}`}
      style={{ backgroundColor: business.brand_color || '#0F7B5A' }}
      aria-label={business.name}
    >
      <CategoryIcon name={business.brand_icon} className="h-3/5 w-3/5" />
    </span>
  )
}
export function Rating({
  rating,
  count = 0,
}: {
  rating?: number | null
  count?: number | null
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
      <strong>
        {rating
          ? Number(rating).toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          : 'Sem nota'}
      </strong>
      <span className="text-sm font-normal text-muted">
        ({count ?? 0} avaliações)
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
