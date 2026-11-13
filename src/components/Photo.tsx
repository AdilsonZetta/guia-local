import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import type { ImgHTMLAttributes } from 'react'
export function Photo({
  className = '',
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false)
  return failed ? (
    <span
      role="img"
      aria-label={alt || 'Foto indisponível'}
      className={`flex items-center justify-center gap-2 bg-brand-soft text-brand ${className}`}
    >
      <ImageOff size={26} />
      <span className="text-sm">Foto indisponível</span>
    </span>
  ) : (
    <img
      {...props}
      alt={alt || ''}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
