import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Tables, UserRole } from '@/lib/database.types'

export type Profile = Tables<'profiles'>
export type Business = Tables<'businesses'>

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: Profile | null
  business: Business | null
  loading: boolean
  isAdmin: boolean
  isBusiness: boolean
  isClient: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error(error)
      return
    }
    setProfile(profileData)
    if (profileData?.role === 'business' || profileData?.role === 'admin') {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      setBusiness(biz ?? null)
    } else {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle()
      setBusiness(biz ?? null)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next?.user) {
        setLoading(true)
        loadProfile(next.user.id).finally(() => setLoading(false))
      } else {
        setProfile(null)
        setBusiness(null)
        setLoading(false)
      }
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  useEffect(() => {
    const id=session?.user.id
    if(!id)return
    const refresh=()=>{void loadProfile(id)}
    const channel=supabase.channel(`profile-status-${id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:`id=eq.${id}`},refresh).subscribe()
    const timer=window.setInterval(refresh,60000)
    window.addEventListener('focus',refresh)
    return ()=>{clearInterval(timer);window.removeEventListener('focus',refresh);void supabase.removeChannel(channel)}
  },[session?.user.id,loadProfile])

  const value = useMemo<AuthContextValue>(() => {
    const role: UserRole | undefined = profile?.role
    return {
      session,
      user: session?.user ?? null,
      profile,
      business,
      loading,
      isAdmin: role === 'admin',
      isBusiness: role === 'business' || Boolean(business),
      isClient: role === 'client' || role === 'admin' || Boolean(session?.user),
      refreshProfile: async () => {
        if (session?.user) await loadProfile(session.user.id)
      },
      signOut: async () => {
        await supabase.auth.signOut()
        setProfile(null)
        setBusiness(null)
      },
    }
  }, [session, profile, business, loading, loadProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
