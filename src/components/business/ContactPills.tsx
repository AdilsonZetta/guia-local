import { Phone } from 'lucide-react'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { cn } from '@/lib/utils'

export function WhatsAppPill({
  href,
  label,
  className,
  onClick,
}: {
  href: string
  label: string
  className?: string
  onClick?: () => void
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('btn-whatsapp', className)}
      onClick={onClick}
    >
      <WhatsAppIcon size={18} />
      <span className="btn-label">{label}</span>
    </a>
  )
}

export function CallPill({
  href,
  label = 'Ligar',
  className,
}: {
  href: string
  label?: string
  className?: string
}) {
  return (
    <a href={href} className={cn('btn-outline', className)}>
      <Phone aria-hidden="true" size={18} />
      <span className="btn-label">{label}</span>
    </a>
  )
}
