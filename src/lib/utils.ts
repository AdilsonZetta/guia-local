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

export function whatsappLink(whatsapp: string | null | undefined, message?: string) {
  if (!whatsapp) return null
  const digits = whatsapp.replace(/\D/g, '')
  const phone = digits.startsWith('55') ? digits : `55${digits}`
  const url = `https://wa.me/${phone}`
  return message ? `${url}?text=${encodeURIComponent(message)}` : url
}

export function isReceivingNow(business: {
  receiving_orders: boolean
  receiving_orders_until: string | null
  is_paused: boolean
  status: string
}) {
  if (!business.receiving_orders || business.is_paused || business.status !== 'active') return false
  if (!business.receiving_orders_until) return true
  return business.receiving_orders_until >= new Date().toISOString().slice(0, 10)
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

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
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
