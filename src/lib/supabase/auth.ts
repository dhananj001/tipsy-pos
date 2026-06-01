import { createClient } from './server'
import { redirect } from 'next/navigation'
import { type UserProfile, type UserRole } from '@/types/auth'
import { type User } from '@supabase/supabase-js'

/**
 * Extracts and strongly types user metadata into a UserProfile structure.
 */
export function getUserProfile(user: User): UserProfile {
  const role = (user.user_metadata?.role as UserRole) || 'captain'
  return {
    id: user.id,
    email: user.email || '',
    role,
    name: user.user_metadata?.name || 'Staff User',
    restaurant_id: user.user_metadata?.restaurant_id || 'rest-123',
    created_at: user.created_at,
  }
}

/**
 * Server-side helper to fetch the current user and profile securely from Supabase.
 * Safe for Server Components, Route Handlers, and Server Actions.
 */
export async function getCurrentUser(): Promise<{ user: User | null; profile: UserProfile | null }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { user: null, profile: null }
    }
    
    return {
      user,
      profile: getUserProfile(user),
    }
  } catch (error) {
    console.error('Error fetching current server user:', error)
    return { user: null, profile: null }
  }
}

/**
 * Asserts authentication and role authorization on the server.
 * Redirects automatically to the login page if not authenticated,
 * or to the role's appropriate home terminal if unauthorized.
 * 
 * Usage in Server Component:
 * const { user, profile } = await requireAuth(['admin', 'manager'])
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<{ user: User; profile: UserProfile }> {
  const { user, profile } = await getCurrentUser()
  
  if (!user || !profile) {
    redirect('/login')
  }
  
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // Redirect unauthorized user to their respective default portal
    if (profile.role === 'captain') {
      redirect('/captain/tables')
    } else {
      redirect('/dashboard')
    }
  }
  
  return { user, profile }
}
