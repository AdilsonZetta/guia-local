import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tone === 'neutral' && 'bg-canvas text-muted',
        tone === 'success' && 'bg-brand-soft text-brand-dark',
        tone === 'warning' && 'bg-amber-100 text-warning',
        tone === 'danger' && 'bg-orange-100 text-danger',
        tone === 'brand' && 'bg-brand text-white',
        className,
      )}
      {...props}
    />
  )
}
