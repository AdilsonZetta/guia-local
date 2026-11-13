import { useEffect, useEffectEvent, useState } from 'react'
import { supabase } from './supabase'
import type { Tables, Database } from './database.types'

export type PublicBusiness = Tables<'businesses'> & {
  serviceAreas?: Tables<'neighborhoods'>[]
  categories: Tables<'categories'> | null
  neighborhoods: Tables<'neighborhoods'> | null
  business_stats: Database['public']['Views']['business_stats']['Row'] | null
}
export async function catalog() {
  const [categories, neighborhoods] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .order('name'),
    supabase
      .from('neighborhoods')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .order('name'),
  ])
  if (categories.error) throw categories.error
  if (neighborhoods.error) throw neighborhoods.error
  return { categories: categories.data, neighborhoods: neighborhoods.data }
}
export async function enrichBusinesses(
  rows: Tables<'businesses'>[],
): Promise<PublicBusiness[]> {
  if (!rows.length) return []
  const [refs, stats, areas] = await Promise.all([
    catalog(),
    supabase
      .from('business_stats')
      .select('*')
      .in(
        'business_id',
        rows.map((row) => row.id),
      ),
    supabase
      .from('business_service_areas')
      .select('*')
      .in(
        'business_id',
        rows.map((r) => r.id),
      ),
  ])
  if (areas.error) throw areas.error
  if (stats.error) throw stats.error
  return rows.map((row) => ({
    ...row,
    serviceAreas: refs.neighborhoods.filter((n) =>
      areas.data.some(
        (a) => a.business_id === row.id && a.neighborhood_id === n.id,
      ),
    ),
    categories: refs.categories.find((c) => c.id === row.category_id) ?? null,
    neighborhoods:
      refs.neighborhoods.find((n) => n.id === row.neighborhood_id) ?? null,
    business_stats: stats.data.find((s) => s.business_id === row.id) ?? null,
  }))
}
export async function publicBusinesses(featured = false) {
  const rows: Tables<'businesses'>[] = []
  for (let offset = 0; ; offset += 500) {
    let query = supabase
      .from('businesses')
      .select('*')
      .eq('status', 'active')
      .eq('is_paused', false)
      .order('id')
      .range(offset, offset + 499)
    if (featured) query = query.eq('featured', true)
    const { data, error } = await query
    if (error) throw error
    rows.push(...data)
    if (data.length < 500) break
  }
  // Chunk stats lookups to keep request URLs small.
  const result: PublicBusiness[] = []
  for (let i = 0; i < rows.length; i += 100)
    result.push(...(await enrichBusinesses(rows.slice(i, i + 100))))
  return result
}
export async function publicBusiness(slug: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .eq('is_paused', false)
    .maybeSingle()
  if (error) throw error
  return data ? (await enrichBusinesses([data]))[0] : null
}
export function useResource<T>(
  loader: () => Promise<T>,
  dependencies: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const load = useEffectEvent(loader)
  const dependencyKey = JSON.stringify(dependencies)
  useEffect(() => {
    let active = true
    void (async () => {
      await Promise.resolve()
      if (!active) return
      setLoading(true)
      setError('')
      try {
        const result = await load()
        if (active) setData(result)
      } catch {
        if (active)
          setError('Não foi possível carregar os dados. Tente novamente.')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [dependencyKey, version])
  return { data, error, loading, reload: () => setVersion((v) => v + 1) }
}
export function safeExternalUrl(value: string) {
  try {
    const url = new URL(value)
    return ['https:', 'http:', 'tel:', 'mailto:'].includes(url.protocol)
      ? url.href
      : null
  } catch {
    return null
  }
}
export function isWhatsAppUrl(value: string) {
  try {
    const url = new URL(value)
    return [
      'wa.me',
      'api.whatsapp.com',
      'web.whatsapp.com',
      'whatsapp.com',
    ].includes(url.hostname.toLowerCase())
  } catch {
    return false
  }
}
