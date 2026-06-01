import { User as SupabaseUser } from '@supabase/supabase-js'

export type UserRole = 'captain' | 'manager' | 'admin'

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  name: string
  restaurant_id: string
  created_at: string
}

export interface AuthContextType {
  user: SupabaseUser | null
  profile: UserProfile | null
  loading: boolean
  role: UserRole | null
  signOut: () => Promise<void>
}
