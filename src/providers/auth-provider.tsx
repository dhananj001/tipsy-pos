'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type AuthContextType, type UserProfile, type UserRole } from '@/types/auth'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  role: null,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const isFirstAuthCall = useRef(true)
  const router = useRouter()
 
  useEffect(() => {
    let active = true
    setLoading(true)

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (!active) return

      if (session) {
        setUser(session.user)
        
        const fetchProfile = async () => {
          try {
            const { data: dbProfile, error: profileErr } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (!active) return

            if (dbProfile) {
              setProfile({
                id: dbProfile.id,
                email: dbProfile.email,
                role: dbProfile.role as UserRole,
                name: dbProfile.name,
                restaurant_id: dbProfile.restaurant_id,
                created_at: dbProfile.created_at
              })
            } else {
              const userRole = (session.user.user_metadata?.role as UserRole) || 'captain'
              setProfile({
                id: session.user.id,
                email: session.user.email || '',
                role: userRole,
                name: session.user.user_metadata?.name || 'Staff User',
                restaurant_id: session.user.user_metadata?.restaurant_id || '00000000-0000-0000-0000-000000000000',
                created_at: session.user.created_at,
              })
            }
          } catch (err) {
            if (active) {
              const userRole = (session.user.user_metadata?.role as UserRole) || 'captain'
              setProfile({
                id: session.user.id,
                email: session.user.email || '',
                role: userRole,
                name: session.user.user_metadata?.name || 'Staff User',
                restaurant_id: session.user.user_metadata?.restaurant_id || '00000000-0000-0000-0000-000000000000',
                created_at: session.user.created_at,
              })
            }
          } finally {
            if (active) {
              setLoading(false)
            }
          }
        }

        fetchProfile()
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }

      if (active) {
        const isFirst = isFirstAuthCall.current
        isFirstAuthCall.current = false

        if (!isFirst) {
          if (event === 'SIGNED_IN') {
            router.refresh()
          }
          if (event === 'SIGNED_OUT') {
            router.push('/login')
            router.refresh()
          }
        }
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setLoading(false)
    router.push('/login')
  }

  const value = React.useMemo(() => ({
    user,
    profile,
    loading,
    role: profile?.role || null,
    signOut,
  }), [user, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
