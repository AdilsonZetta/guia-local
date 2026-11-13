export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'business' | 'client'
export type UserStatus = 'active' | 'suspended'
export type BusinessStatus =
  'pending' | 'adjustments_requested' | 'active' | 'rejected' | 'archived'
export type ReviewStatus =
  'pending' | 'published' | 'adjustment_requested' | 'removed' | 'flagged'
export type SuggestionStatus = 'pending' | 'registration_created' | 'archived'

type Table<T> = {
  Row: T
  Insert: Partial<T>
  Update: Partial<T>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      activity_log: Table<{
        id: string
        actor_id: string | null
        action: string
        entity_type: string
        entity_id: string | null
        metadata: Json
        created_at: string
      }>
      business_hours: Table<{
        id: string
        business_id: string
        weekday: number
        open_time: string | null
        close_time: string | null
        is_closed: boolean
      }>
      business_photos: Table<{
        id: string
        business_id: string
        url: string
        storage_path: string | null
        is_cover: boolean
        sort_order: number
        alt: string | null
        created_at: string
      }>
      business_service_areas: Table<{
        business_id: string
        neighborhood_id: string
      }>
      businesses: Table<{
        id: string
        owner_id: string | null
        name: string
        slug: string
        tagline: string | null
        description: string | null
        category_id: string | null
        neighborhood_id: string | null
        address: string | null
        phone: string | null
        whatsapp: string | null
        email: string | null
        website: string | null
        instagram: string | null
        logo_url: string | null
        cover_url: string | null
        status: BusinessStatus
        adjustment_notes: string | null
        is_paused: boolean
        home_service: boolean
        receiving_orders: boolean
        receiving_orders_until: string | null
        featured: boolean
        created_at: string
        updated_at: string
        approved_at: string | null
        approved_by: string | null
        attendance_type: string
        show_whatsapp: boolean
        brand_color: string
        brand_icon: string
        location_display: string
        contact_verified: boolean
        owner_verified: boolean
      }>
      categories: Table<{
        id: string
        name: string
        slug: string
        icon: string
        description: string | null
        active: boolean
        show_on_home: boolean
        sort_order: number
        created_at: string
        updated_at: string
      }>
      favorites: Table<{
        user_id: string
        business_id: string
        created_at: string
      }>
      link_in_bio: Table<{
        id: string
        business_id: string
        slug: string
        theme: string
        enabled: boolean
        headline: string | null
        bio: string | null
        created_at: string
        updated_at: string
      }>
      link_in_bio_buttons: Table<{
        id: string
        link_id: string
        label: string
        url: string
        icon: string
        sort_order: number
        enabled: boolean
      }>
      neighborhoods: Table<{
        id: string
        name: string
        slug: string
        active: boolean
        sort_order: number
        created_at: string
      }>
      profile_visits: Table<{
        id: string
        business_id: string
        visitor_id: string | null
        source: string | null
        created_at: string
      }>
      profiles: Table<{
        id: string
        email: string
        full_name: string | null
        phone: string | null
        avatar_url: string | null
        role: UserRole
        status: UserStatus
        suspension_reason: string | null
        notify_review_email: boolean
        notify_suggestion_email: boolean
        notify_availability: boolean
        notify_weekly_summary: boolean
        city_name: string | null
        notify_marketing_email: boolean
        deletion_requested_at: string | null
        created_at: string
        updated_at: string
      }>
      reviews: Table<{
        id: string
        business_id: string
        user_id: string
        rating: number
        title: string | null
        body: string
        status: ReviewStatus
        flag_reason: string | null
        moderation_notes: string | null
        reply_text: string | null
        replied_at: string | null
        reported_by_business: boolean
        report_reason: string | null
        reported_at: string | null
        created_at: string
        updated_at: string
        service_id: string | null
        experience_month: string | null
      }>
      searches: Table<{
        id: string
        query: string
        user_id: string | null
        results_count: number
        category_id: string | null
        neighborhood_id: string | null
        created_at: string
      }>
      services: Table<{
        id: string
        business_id: string
        name: string
        description: string | null
        price: number | null
        price_label: string | null
        sort_order: number
        active: boolean
        created_at: string
        icon: string
      }>
      site_settings: Table<{
        id: number
        site_name: string
        site_description: string
        logo_url: string | null
        city_name: string
        state_code: string
        availability_validity_days: number
        moderate_business_signups: boolean
        moderate_reviews: boolean
        link_in_bio_enabled: boolean
        updated_at: string
      }>
      suggestions: Table<{
        id: string
        suggested_by: string | null
        suggester_name: string | null
        suggester_contact: string | null
        business_name: string
        category_id: string | null
        neighborhood_id: string | null
        phone: string | null
        notes: string | null
        status: SuggestionStatus
        created_business_id: string | null
        created_at: string
        updated_at: string
      }>
      review_reports: Table<{
        id: string
        review_id: string
        user_id: string
        reason: string
        created_at: string
      }>
      review_photos: Table<{
        id: string
        review_id: string
        url: string
        storage_path: string | null
        sort_order: number
        created_at: string
      }>
      moderation_events: Table<{
        id: string
        review_id: string | null
        business_id: string | null
        actor_id: string | null
        action: string
        justification: string | null
        created_at: string
      }>
      notifications: Table<{
        id: string
        user_id: string
        type: string
        title: string
        body: string | null
        link: string | null
        read_at: string | null
        created_at: string
      }>
      whatsapp_clicks: Table<{
        id: string
        business_id: string
        source: string
        user_id: string | null
        created_at: string
      }>
    }
    Views: {
      business_stats: {
        Row: {
          business_id: string | null
          avg_rating: number | null
          review_count: number | null
          awaiting_reply_count: number | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          id: string | null
          full_name: string | null
          avatar_url: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
    }
    Enums: {
      business_status: BusinessStatus
      review_status: ReviewStatus
      suggestion_status: SuggestionStatus
      user_role: UserRole
      user_status: UserStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
