'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
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
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setUser(session.user)
          
          // Load real profile from database users table
          const { data: dbProfile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

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
            const userProfile: UserProfile = {
              id: session.user.id,
              email: session.user.email || '',
              role: userRole,
              name: session.user.user_metadata?.name || 'Staff User',
              restaurant_id: session.user.user_metadata?.restaurant_id || '00000000-0000-0000-0000-000000000000',
              created_at: session.user.created_at,
            }
            setProfile(userProfile)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('Error loading session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user)
        
        const { data: dbProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

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
          const userProfile: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            role: userRole,
            name: session.user.user_metadata?.name || 'Staff User',
            restaurant_id: session.user.user_metadata?.restaurant_id || '00000000-0000-0000-0000-000000000000',
            created_at: session.user.created_at,
          }
          setProfile(userProfile)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
      
      if (event === 'SIGNED_IN') {
        router.refresh()
      }
      if (event === 'SIGNED_OUT') {
        router.push('/login')
        router.refresh()
      }
    })

    return () => {
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

  const value: AuthContextType = {
    user,
    profile,
    loading,
    role: profile?.role || null,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
