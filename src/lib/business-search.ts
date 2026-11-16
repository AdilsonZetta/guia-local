import { supabase } from './supabase'
import type { BusinessStatus, Database, Json, Tables } from './database.types'
import { catalog } from './public-data'

export const BUSINESS_PAGE_SIZE = 20

export type ListedBusiness = Tables<'businesses'> & {
  categories: Pick<Tables<'categories'>, 'id' | 'name' | 'slug' | 'icon'> | null
  neighborhoods: Pick<Tables<'neighborhoods'>, 'id' | 'name' | 'slug'> | null
  business_stats: Database['public']['Views']['business_stats']['Row'] | null
}

export type BusinessListParams = {
  query?: string
  category?: string | null
  neighborhood?: string | null
  homeService?: boolean
  receiving?: boolean
  minRating?: number
  sort?: 'relevance' | 'rating' | 'recent'
  status?: string | null
  includeInactive?: boolean
  ids?: string[] | null
  limit?: number
  offset?: number
}

export type BusinessListResult = {
  total: number
  rows: ListedBusiness[]
}

export type CategoryCount = {
  category_id: string
  slug?: string
  name?: string
  icon?: string
  count: number
}

export type HomeSnapshot = {
  business_count: number
  review_count: number
  google_review_count: number
  google_avg_rating: number | null
  platform_avg_rating: number | null
  category_counts: CategoryCount[]
  highlighted: ListedBusiness[]
}

export type AdminBusinessCounts = {
  total: number
  active: number
  pending: number
  paused: number
  owners: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function num(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseListed(value: unknown): ListedBusiness | null {
  const row = asRecord(value)
  if (!row || typeof row.id !== 'string' || typeof row.name !== 'string') return null
  const categories = asRecord(row.categories)
  const neighborhoods = asRecord(row.neighborhoods)
  const stats = asRecord(row.business_stats)
  return {
    ...(row as unknown as Tables<'businesses'>),
    categories:
      categories && typeof categories.id === 'string'
        ? {
            id: categories.id,
            name: String(categories.name ?? ''),
            slug: String(categories.slug ?? ''),
            icon: String(categories.icon ?? 'tag'),
          }
        : null,
    neighborhoods:
      neighborhoods && typeof neighborhoods.id === 'string'
        ? {
            id: neighborhoods.id,
            name: String(neighborhoods.name ?? ''),
            slug: String(neighborhoods.slug ?? ''),
          }
        : null,
    business_stats: stats
      ? {
          business_id: String(stats.business_id ?? row.id),
          avg_rating: stats.avg_rating == null ? null : num(stats.avg_rating),
          review_count: stats.review_count == null ? 0 : num(stats.review_count),
          awaiting_reply_count:
            stats.awaiting_reply_count == null ? 0 : num(stats.awaiting_reply_count),
        }
      : null,
  }
}

function missingRpc(error: { code?: string; message?: string } | null) {
  if (!error) return false
  return (
    error.code === 'PGRST202' ||
    /could not find the function|schema cache/i.test(error.message ?? '')
  )
}

function fail(error: { message?: string }) {
  if (/policy|permission|JWT/i.test(error.message ?? '')) {
    throw new Error('Sua conta não tem permissão para ver estes dados.')
  }
  throw new Error('Não foi possível carregar os dados. Tente novamente.')
}

async function attachRefs(rows: Tables<'businesses'>[]): Promise<ListedBusiness[]> {
  if (!rows.length) return []
  const categoryIds = [
    ...new Set(rows.map((row) => row.category_id).filter((id): id is string => Boolean(id))),
  ]
  const neighborhoodIds = [
    ...new Set(
      rows.map((row) => row.neighborhood_id).filter((id): id is string => Boolean(id)),
    ),
  ]
  const [categories, neighborhoods, stats] = await Promise.all([
    categoryIds.length
      ? supabase.from('categories').select('id,name,slug,icon').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
    neighborhoodIds.length
      ? supabase.from('neighborhoods').select('id,name,slug').in('id', neighborhoodIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('business_stats')
      .select('*')
      .in(
        'business_id',
        rows.map((row) => row.id),
      ),
  ])
  if (categories.error) throw categories.error
  if (neighborhoods.error) throw neighborhoods.error
  if (stats.error) throw stats.error
  return rows.map((row) => ({
    ...row,
    categories: categories.data?.find((item) => item.id === row.category_id) ?? null,
    neighborhoods:
      neighborhoods.data?.find((item) => item.id === row.neighborhood_id) ?? null,
    business_stats: stats.data?.find((item) => item.business_id === row.id) ?? null,
  }))
}

async function searchBusinessesFallback(
  params: BusinessListParams,
): Promise<BusinessListResult> {
  const limit = Math.min(Math.max(params.limit ?? BUSINESS_PAGE_SIZE, 1), 100)
  const offset = Math.max(params.offset ?? 0, 0)
  let query = supabase.from('businesses').select('*', { count: 'estimated' })
  if (!params.includeInactive) query = query.eq('status', 'active').eq('is_paused', false)
  if (params.status) query = query.eq('status', params.status as BusinessStatus)
  if (params.ids?.length) query = query.in('id', params.ids)
  if (params.homeService) query = query.eq('home_service', true)
  if (params.receiving) {
    query = query.eq('receiving_orders', true).eq('is_paused', false).eq('status', 'active')
  }
  if ((params.minRating ?? 0) > 0) query = query.gte('google_rating', params.minRating!)
  if (params.category) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(params.category)
    if (isUuid) query = query.eq('category_id', params.category)
    else {
      const category = await supabase
        .from('categories')
        .select('id')
        .eq('slug', params.category)
        .maybeSingle()
      if (category.error) fail(category.error)
      if (!category.data) return { total: 0, rows: [] }
      query = query.eq('category_id', category.data.id)
    }
  }
  if (params.neighborhood) {
    const hood = await supabase
      .from('neighborhoods')
      .select('id')
      .eq('slug', params.neighborhood)
      .maybeSingle()
    if (hood.error) fail(hood.error)
    if (!hood.data) return { total: 0, rows: [] }
    const areas = await supabase
      .from('business_service_areas')
      .select('business_id')
      .eq('neighborhood_id', hood.data.id)
      .limit(150)
    if (areas.error) fail(areas.error)
    const extra = (areas.data ?? []).map((row) => row.business_id)
    if (extra.length) {
      query = query.or(
        `neighborhood_id.eq.${hood.data.id},id.in.(${extra.join(',')})`,
      )
    } else {
      query = query.eq('neighborhood_id', hood.data.id)
    }
  }
  const term = params.query?.trim().replace(/[%_,.()]/g, '') ?? ''
  if (term) {
    const pattern = `%${term}%`
    query = query.or(
      `name.ilike.${pattern},google_category.ilike.${pattern},address.ilike.${pattern}`,
    )
  }
  if (params.sort === 'recent') query = query.order('created_at', { ascending: false })
  else if (params.sort === 'rating') {
    query = query.order('google_rating', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('featured', { ascending: false }).order('name', { ascending: true })
  }
  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) fail(error)
  const rows = await attachRefs(data ?? [])
  return { total: count ?? offset + rows.length, rows }
}

export async function searchBusinesses(
  params: BusinessListParams = {},
): Promise<BusinessListResult> {
  const limit = Math.min(Math.max(params.limit ?? BUSINESS_PAGE_SIZE, 1), 100)
  const offset = Math.max(params.offset ?? 0, 0)
  if (params.ids && params.ids.length === 0) return { total: 0, rows: [] }
  const { data, error } = await supabase.rpc('search_businesses', {
    p_query: params.query?.trim() || null,
    p_category: params.category || null,
    p_neighborhood: params.neighborhood || null,
    p_home_service: Boolean(params.homeService),
    p_receiving: Boolean(params.receiving),
    p_min_rating: params.minRating || 0,
    p_sort: params.sort || 'relevance',
    p_status: params.status || null,
    p_include_inactive: Boolean(params.includeInactive),
    p_ids: params.ids ?? null,
    p_limit: limit,
    p_offset: offset,
  })
  if (missingRpc(error)) return searchBusinessesFallback({ ...params, limit, offset })
  if (error) fail(error)
  const payload = asRecord(data as Json)
  const rows = Array.isArray(payload?.rows)
    ? payload.rows.map(parseListed).filter((row): row is ListedBusiness => Boolean(row))
    : []
  return { total: num(payload?.total), rows }
}

export async function collectBusinesses(params: BusinessListParams) {
  const rows: ListedBusiness[] = []
  const limit = 100
  for (let offset = 0; offset < 20000; offset += limit) {
    const page = await searchBusinesses({ ...params, limit, offset })
    rows.push(...page.rows)
    if (page.rows.length < limit) break
  }
  return rows
}

function parseCategoryCounts(value: unknown): CategoryCount[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const row = asRecord(item)
    if (!row || typeof row.category_id !== 'string') return []
    return [
      {
        category_id: row.category_id,
        slug: row.slug == null ? undefined : String(row.slug),
        name: row.name == null ? undefined : String(row.name),
        icon: row.icon == null ? undefined : String(row.icon),
        count: num(row.count),
      },
    ]
  })
}

export async function loadHomeSnapshot(): Promise<HomeSnapshot> {
  const { data, error } = await supabase.rpc('home_snapshot')
  if (!error) {
    const payload = asRecord(data as Json)
    const highlighted = Array.isArray(payload?.highlighted)
      ? payload.highlighted
          .map(parseListed)
          .filter((row): row is ListedBusiness => Boolean(row))
      : []
    return {
      business_count: num(payload?.business_count),
      review_count: num(payload?.review_count),
      google_review_count: num(payload?.google_review_count),
      google_avg_rating:
        payload?.google_avg_rating == null ? null : num(payload.google_avg_rating),
      platform_avg_rating:
        payload?.platform_avg_rating == null ? null : num(payload.platform_avg_rating),
      category_counts: parseCategoryCounts(payload?.category_counts),
      highlighted,
    }
  }
  if (!missingRpc(error)) fail(error)
  const [businesses, reviews, highlighted] = await Promise.all([
    supabase
      .from('businesses')
      .select('id', { count: 'estimated', head: true })
      .eq('status', 'active')
      .eq('is_paused', false),
    supabase
      .from('reviews')
      .select('id', { count: 'estimated', head: true })
      .eq('status', 'published'),
    supabase
      .from('businesses')
      .select('*')
      .eq('status', 'active')
      .eq('is_paused', false)
      .order('google_rating', { ascending: false, nullsFirst: false })
      .limit(6),
  ])
  if (businesses.error) fail(businesses.error)
  if (reviews.error) fail(reviews.error)
  if (highlighted.error) fail(highlighted.error)
  const rows = await attachRefs(highlighted.data ?? [])
  const refs = await catalog()
  const category_counts = await Promise.all(
    refs.categories
      .filter((category) => category.show_on_home)
      .map(async (category) => {
        const result = await supabase
          .from('businesses')
          .select('id', { count: 'estimated', head: true })
          .eq('category_id', category.id)
          .eq('status', 'active')
          .eq('is_paused', false)
        if (result.error) fail(result.error)
        return {
          category_id: category.id,
          slug: category.slug,
          name: category.name,
          icon: category.icon,
          count: result.count ?? 0,
        }
      }),
  )
  return {
    business_count: businesses.count ?? 0,
    review_count: reviews.count ?? 0,
    google_review_count: 0,
    google_avg_rating: null,
    platform_avg_rating: null,
    category_counts,
    highlighted: rows,
  }
}

async function countWhere(status?: BusinessStatus, paused?: boolean, withOwner = false) {
  let query = supabase.from('businesses').select('id', { count: 'estimated', head: true })
  if (status) query = query.eq('status', status)
  if (paused != null) query = query.eq('is_paused', paused)
  if (withOwner) query = query.not('owner_id', 'is', null)
  const { count, error } = await query
  if (error) fail(error)
  return count ?? 0
}

export async function loadAdminBusinessCounts(): Promise<AdminBusinessCounts> {
  const { data, error } = await supabase.rpc('business_admin_counts')
  if (!error) {
    const payload = asRecord(data as Json)
    return {
      total: num(payload?.total),
      active: num(payload?.active),
      pending: num(payload?.pending),
      paused: num(payload?.paused),
      owners: num(payload?.owners),
    }
  }
  if (!missingRpc(error)) fail(error)
  const [total, active, pending, paused, owners] = await Promise.all([
    countWhere(),
    countWhere('active', false),
    countWhere('pending'),
    countWhere(undefined, true),
    countWhere(undefined, undefined, true),
  ])
  return { total, active, pending, paused, owners }
}

export async function loadCategoryCounts(): Promise<CategoryCount[]> {
  const { data, error } = await supabase.rpc('business_category_counts')
  if (!error) return parseCategoryCounts(data as Json)
  if (!missingRpc(error)) fail(error)
  const categories = await supabase.from('categories').select('id')
  if (categories.error) fail(categories.error)
  return Promise.all(
    (categories.data ?? []).map(async (category) => {
      const result = await supabase
        .from('businesses')
        .select('id', { count: 'estimated', head: true })
        .eq('category_id', category.id)
      if (result.error) fail(result.error)
      return { category_id: category.id, count: result.count ?? 0 }
    }),
  )
}

export async function businessNames(ids: string[]) {
  const unique = [...new Set(ids)]
  const rows: { id: string; name: string }[] = []
  for (let index = 0; index < unique.length; index += 80) {
    const chunk = unique.slice(index, index + 80)
    if (!chunk.length) continue
    const { data, error } = await supabase.from('businesses').select('id,name').in('id', chunk)
    if (error) fail(error)
    rows.push(...(data ?? []))
  }
  return rows
}

export async function businessesForOwners(ownerIds: string[]) {
  const unique = [...new Set(ownerIds)]
  if (!unique.length) return [] as Pick<Tables<'businesses'>, 'id' | 'name' | 'owner_id'>[]
  const { data, error } = await supabase
    .from('businesses')
    .select('id,name,owner_id')
    .in('owner_id', unique)
  if (error) fail(error)
  return data ?? []
}
