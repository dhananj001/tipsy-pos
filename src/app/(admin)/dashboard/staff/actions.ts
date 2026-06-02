'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { type UserRole } from '@/types/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Helper to create an admin client with service role privileges
async function createAdminClient() {
  if (!supabaseServiceKey || supabaseServiceKey === 'placeholder-service-role-key' || supabaseServiceKey.trim() === '') {
    throw new Error('Service key is not configured.')
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Helper to verify the calling user is an authorized admin/manager
async function verifyAdminPermission() {
  const supabase = await createServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized: Active session required.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, restaurant_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Unauthorized: Could not load user profile.')
  }

  if (profile.role !== 'admin' && profile.role !== 'manager') {
    throw new Error('Unauthorized: Admin or Manager privileges required.')
  }

  return { profile, user }
}

/**
 * Server Action: Create a new staff member
 */
export async function createStaffAction(formData: {
  email: string
  name: string
  role: UserRole
  password?: string
}) {
  try {
    const { profile } = await verifyAdminPermission()
    const password = formData.password || 'password123'
    let createdUser = null

    // 1. Try to create the user via Admin service client
    try {
      const adminClient = await createAdminClient()
      const { data, error: createError } = await adminClient.auth.admin.createUser({
        email: formData.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: formData.name,
          role: formData.role,
          restaurant_id: profile.restaurant_id
        }
      })

      if (createError) throw createError
      createdUser = data.user
    } catch (adminErr: any) {
      console.log('Admin provisioning failed, falling back to stateless public signUp:', adminErr.message)

      // 2. Fallback: sign up using a stateless public supabase client (no cookies / session persistence)
      const anonClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })

      const { data, error: signUpError } = await anonClient.auth.signUp({
        email: formData.email,
        password: password,
        options: {
          data: {
            name: formData.name,
            role: formData.role,
            restaurant_id: profile.restaurant_id
          }
        }
      })

      if (signUpError) {
        throw new Error(
          `Failed to create user. Admin SDK error: [${adminErr.message}]. Public signup fallback error: [${signUpError.message}].`
        )
      }
      createdUser = data.user
    }

    return { 
      success: true, 
      user: createdUser,
      message: `Staff member ${formData.name} registered successfully as ${formData.role}.` 
    }
  } catch (err: any) {
    console.error('Error in createStaffAction:', err)
    return {
      success: false,
      error: err.message || 'Failed to create staff member.'
    }
  }
}

/**
 * Server Action: Update an existing staff member
 */
export async function updateStaffAction(
  staffId: string,
  formData: {
    name: string
    role: UserRole
  }
) {
  try {
    const { profile } = await verifyAdminPermission()
    const supabase = await createServerClient()

    // Update in database users profile
    const { data, error: updateError } = await supabase
      .from('users')
      .update({
        name: formData.name,
        role: formData.role
      })
      .eq('id', staffId)
      .eq('restaurant_id', profile.restaurant_id) // Multi-tenant safety
      .select()
      .single()

    if (updateError) throw updateError

    // Best effort: update auth user metadata if service key is active
    try {
      const adminClient = await createAdminClient()
      await adminClient.auth.admin.updateUserById(staffId, {
        user_metadata: {
          name: formData.name,
          role: formData.role
        }
      })
    } catch (adminErr) {
      // Log but do not fail, as database is the primary source of truth for POS roles
      console.log('Skipping auth metadata sync (service key not active/configured)')
    }

    return {
      success: true,
      staff: data,
      message: 'Staff profile updated successfully.'
    }
  } catch (err: any) {
    console.error('Error in updateStaffAction:', err)
    return {
      success: false,
      error: err.message || 'Failed to update staff profile.'
    }
  }
}

/**
 * Server Action: Delete a staff member
 */
export async function deleteStaffAction(staffId: string) {
  try {
    const { profile, user: currentAdmin } = await verifyAdminPermission()

    if (staffId === currentAdmin.id) {
      throw new Error('Self-destruction blocked: You cannot delete your own account.')
    }

    // 1. Try to delete the user via Admin service client (will cascade to users table)
    try {
      const adminClient = await createAdminClient()
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(staffId)
      if (deleteError) throw deleteError
    } catch (adminErr: any) {
      console.log('Admin deletion failed, falling back to direct database profile deletion:', adminErr.message)

      // 2. Fallback: delete the profile from public.users directly to revoke role / layout access
      const supabase = await createServerClient()
      const { error: dbDeleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', staffId)
        .eq('restaurant_id', profile.restaurant_id)

      if (dbDeleteError) {
        throw new Error(
          `Failed to delete user. Admin SDK error: [${adminErr.message}]. Direct database deletion error: [${dbDeleteError.message}].`
        )
      }
    }

    return {
      success: true,
      message: 'Staff member deleted successfully.'
    }
  } catch (err: any) {
    console.error('Error in deleteStaffAction:', err)
    return {
      success: false,
      error: err.message || 'Failed to delete staff member.'
    }
  }
}

