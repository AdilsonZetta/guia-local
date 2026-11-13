import type { SVGProps } from 'react'
export function WhatsAppIcon({
  size = 22,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21 11.5a9 9 0 0 1-13.3 8L3 21l1.5-4.7A9 9 0 1 1 21 11.5Z" />
      <path d="m8.1 6.9 1.5 2.4-1 1.3a8 8 0 0 0 4 4l1.3-1 2.4 1.5c-.3 1.6-1.4 2-2.8 1.7-3.9-.9-7-4-7.9-7.9-.3-1.4.1-2.5 1.7-2.8Z" />
    </svg>
  )
}
