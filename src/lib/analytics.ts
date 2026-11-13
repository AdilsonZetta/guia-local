import { supabase } from './supabase'

export async function logSearch(params: {
  query: string
  resultsCount: number
  categoryId?: string | null
  neighborhoodId?: string | null
  userId?: string | null
}) {
  await supabase.from('searches').insert({
    query: params.query,
    results_count: params.resultsCount,
    category_id: params.categoryId ?? null,
    neighborhood_id: params.neighborhoodId ?? null,
    user_id: params.userId ?? null,
  })
}

export async function logVisit(params: {
  businessId: string
  source?: string
  visitorId?: string | null
}) {
  await supabase.from('profile_visits').insert({
    business_id: params.businessId,
    source: params.source ?? 'direct',
    visitor_id: params.visitorId ?? null,
  })
}

export async function logWhatsAppClick(params: {
  businessId: string
  source?: string
  userId?: string | null
}) {
  await supabase.from('whatsapp_clicks').insert({
    business_id: params.businessId,
    source: params.source ?? 'profile',
    user_id: params.userId ?? null,
  })
}
