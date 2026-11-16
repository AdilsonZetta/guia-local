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
export async function publicBusiness(slug: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .eq('is_paused', false)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const [category, neighborhood, stats] = await Promise.all([
    data.category_id
      ? supabase.from('categories').select('*').eq('id', data.category_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    data.neighborhood_id
      ? supabase
          .from('neighborhoods')
          .select('*')
          .eq('id', data.neighborhood_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('business_stats').select('*').eq('business_id', data.id).maybeSingle(),
  ])
  if (category.error) throw category.error
  if (neighborhood.error) throw neighborhood.error
  if (stats.error) throw stats.error
  return {
    ...data,
    categories: category.data,
    neighborhoods: neighborhood.data,
    business_stats: stats.data,
  }
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
