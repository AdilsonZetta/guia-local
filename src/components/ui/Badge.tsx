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
        tone === 'success' && 'bg-green-soft text-ink',
        tone === 'warning' && 'bg-orange-soft text-ink',
        tone === 'danger' && 'bg-brand-soft text-danger',
        tone === 'brand' && 'bg-brand text-white',
        className,
      )}
      {...props}
    />
  )
}
