import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'whatsapp'
type Size = 'sm' | 'md' | 'lg'

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children?: ReactNode
}) {
  return (
    <button
      className={cn(
        'glass-button inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variant === 'primary' && 'btn-primary text-white',
        variant === 'secondary' && 'bg-green-wash text-ink hover:bg-green-soft',
        variant === 'ghost' && 'bg-transparent text-ink hover:bg-brand-soft',
        variant === 'outline' && 'btn-outline',
        variant === 'danger' && 'bg-danger text-white hover:bg-orange-deep',
        variant === 'whatsapp' && 'btn-whatsapp text-white',
        size === 'sm' && 'h-9 px-3 text-sm',
        size === 'md' && 'h-11 px-4 text-sm',
        size === 'lg' && 'h-12 px-5 text-base',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
