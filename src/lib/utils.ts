import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return null
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatPhone(phone: string | null | undefined) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return phone
}

/**
 * Brazilian phone as `55` + DDD + subscriber, or null when it is not a
 * callable national number. Strips formatting, a leading trunk 0, and a
 * duplicated country code. DDD 55 (Santa Maria) is kept as an area code.
 */
export function brazilPhoneDigits(value: string | null | undefined) {
  if (!value) return null
  let digits = value.replace(/\D/g, '').replace(/^0+/, '')
  if (!digits) return null

  // Country code written with the national trunk prefix: 55 0 34 ...
  if (digits.startsWith('550') && (digits.length === 13 || digits.length === 14)) {
    digits = `55${digits.slice(3)}`
  }
  // Country code typed twice: 55 55 34 99999-9999.
  if (/^5555\d{10,11}$/.test(digits)) digits = digits.slice(2)

  const international =
    digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
  if (!international) {
    if (digits.length !== 10 && digits.length !== 11) return null
    digits = `55${digits}`
  }

  const national = digits.slice(2)
  if (!/^[1-9]{2}(?:9\d{8}|\d{8})$/.test(national)) return null
  return digits
}

export function isBrazilMobile(digits: string) {
  return /^55[1-9]{2}9\d{8}$/.test(digits)
}

export function whatsappGreeting(businessName: string) {
  const name = businessName.trim()
  return name
    ? `Olá! Vi ${name} no Guia Local e gostaria de mais informações.`
    : 'Olá! Vi vocês no Guia Local e gostaria de mais informações.'
}

export function whatsappLink(
  whatsapp: string | null | undefined,
  message?: string,
) {
  const phone = brazilPhoneDigits(whatsapp)
  if (!phone || !isBrazilMobile(phone)) return null
  const url = `https://wa.me/${phone}`
  return message ? `${url}?text=${encodeURIComponent(message)}` : url
}

export function telLink(value: string | null | undefined) {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  const service = digits.replace(/^0+/, '')
  if (/^(?:800\d{7}|300\d{7}|4004\d{4})$/.test(service)) return `tel:0${service}`
  const phone = brazilPhoneDigits(value)
  return phone ? `tel:+${phone}` : null
}

export function businessWhatsappHref(business: {
  name: string
  phone?: string | null
  whatsapp?: string | null
  show_whatsapp?: boolean | null
}) {
  if (business.show_whatsapp === false) return null
  const message = whatsappGreeting(business.name)
  return (
    whatsappLink(business.whatsapp, message) ??
    whatsappLink(business.phone, message)
  )
}

export function businessTelHref(business: {
  phone?: string | null
  whatsapp?: string | null
}) {
  return telLink(business.phone) ?? telLink(business.whatsapp)
}

export function isReceivingNow(business: {
  receiving_orders: boolean
  receiving_orders_until: string | null
  is_paused: boolean
  status: string
}) {
  if (
    !business.receiving_orders ||
    business.is_paused ||
    business.status !== 'active'
  )
    return false
  if (!business.receiving_orders_until) return true
  const until = business.receiving_orders_until
  if (/^\d{4}-\d{2}-\d{2}$/.test(until))
    return until >= new Date().toLocaleDateString('en-CA')
  return new Date(until).getTime() >= Date.now()
}

export function profileCompleteness(input: {
  logo_url?: string | null
  cover_url?: string | null
  description?: string | null
  phone?: string | null
  whatsapp?: string | null
  address?: string | null
  category_id?: string | null
  neighborhood_id?: string | null
  servicesCount?: number
  photosCount?: number
  hoursCount?: number
}) {
  const checks = [
    Boolean(input.logo_url),
    Boolean(input.cover_url),
    Boolean(input.description && input.description.length > 40),
    Boolean(input.phone || input.whatsapp),
    Boolean(input.address),
    Boolean(input.category_id),
    Boolean(input.neighborhood_id),
    (input.servicesCount ?? 0) > 0,
    (input.photosCount ?? 0) > 0,
    (input.hoursCount ?? 0) > 0,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8',
) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const WEEKDAYS = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
]

export const BASE_PATH = '/guia-local'

export function businessLocation(
  business: {
    location_display: string
    neighborhoods?: { name: string } | null
    serviceAreas?: { name: string }[]
  },
  city = 'Uberaba',
) {
  const areas = business.serviceAreas?.map((n) => n.name).join(', ')
  if (business.location_display === 'city_only') return `Atende em ${city}`
  if (business.location_display === 'hidden') return `Atende em ${city}`
  if (
    business.location_display &&
    !['city_regions', 'neighborhood', 'address'].includes(
      business.location_display,
    )
  )
    return business.location_display
  return areas || business.neighborhoods?.name || `Atende em ${city}`
}
