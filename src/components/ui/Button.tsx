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
        variant === 'primary' && 'bg-brand text-white hover:bg-brand-dark shadow-sm',
        variant === 'secondary' && 'bg-brand-soft text-brand-dark hover:bg-[#d7eee6]',
        variant === 'ghost' && 'bg-transparent text-ink hover:bg-brand-soft',
        variant === 'outline' && 'border border-brand bg-white text-brand hover:bg-brand-soft',
        variant === 'danger' && 'bg-danger text-white hover:bg-[#9a3412]',
        variant === 'whatsapp' && 'bg-brand text-white hover:bg-brand-dark',
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
