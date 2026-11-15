'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  createStaffAction, 
  updateStaffAction, 
  deleteStaffAction 
} from './actions'
import {
  Users,
  Shield,
  UserCheck,
  RefreshCw,
  Search,
  Trash2,
  Edit2,
  Plus,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  User,
  Key,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react'
import { type UserRole } from '@/types/auth'

interface StaffMember {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: string
}

export default function StaffManagementPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Strict Role Guard: Only 'admin' role can view/manage staff credentials
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [profile, router])

  // Realtime staff list
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // Modals / Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Form states
  const [submitting, setSubmitting] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  
  // Add Staff form fields
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<UserRole>('captain')
  const [addPassword, setAddPassword] = useState('password123')

  // Edit Staff form fields
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('captain')

  // 1. Fetch Staff from Supabase database
  const fetchStaff = async (showSyncState = false) => {
    if (!profile?.restaurant_id) return
    if (showSyncState) setSyncing(true)

    try {
      const { data, error: fetchErr } = await supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .eq('restaurant_id', profile.restaurant_id)
        .order('role', { ascending: true })
        .order('name', { ascending: true })

      if (fetchErr) throw fetchErr

      setStaff(data as StaffMember[])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching staff list:', err)
      setError(err.message || 'Failed to sync staff roster.')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  // Realtime subscription setup
  useEffect(() => {
    if (!profile?.restaurant_id) return

    fetchStaff()

    const channel = supabase
      .channel(`admin:staff:${profile.restaurant_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `restaurant_id=eq.${profile.restaurant_id}`,
        },
        () => {
          fetchStaff()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.restaurant_id])

  // Open Edit Dialog
  const openEditModal = (member: StaffMember) => {
    setSelectedStaff(member)
    setEditName(member.name)
    setEditRole(member.role)
    setIsEditOpen(true)
  }

  // Open Delete Confirmation Dialog
  const openDeleteModal = (member: StaffMember) => {
    setSelectedStaff(member)
    setIsDeleteOpen(true)
  }

  // Submit Handler: Add Staff
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.restaurant_id) return

    setSubmitting(true)
    setError(null)

    try {
      const result = await createStaffAction({
        name: addName.trim(),
        email: addEmail.trim().toLowerCase(),
        role: addRole,
        password: addPassword
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      setSuccess(result.message || 'Staff member added successfully.')
      setIsAddOpen(false)
      setAddName('')
      setAddEmail('')
      setAddRole('captain')
      setAddPassword('password123')
      fetchStaff()
    } catch (err: any) {
      console.error('Add staff failed:', err)
      setError(err.message || 'Failed to add staff member.')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Handler: Modify Staff
  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff || !profile?.restaurant_id) return

    setSubmitting(true)
    setError(null)

    try {
      const result = await updateStaffAction(selectedStaff.id, {
        name: editName.trim(),
        role: editRole
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      setSuccess(result.message || 'Staff profile updated.')
      setIsEditOpen(false)
      fetchStaff()
    } catch (err: any) {
      console.error('Update staff failed:', err)
      setError(err.message || 'Failed to update staff member.')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Handler: Delete Staff
  const handleDeleteStaffSubmit = async () => {
    if (!selectedStaff || !profile?.restaurant_id) return

    setSubmitting(true)
    setError(null)

    try {
      const result = await deleteStaffAction(selectedStaff.id)

      if (!result.success) {
        throw new Error(result.error)
      }

      setSuccess(result.message || 'Staff member removed.')
      setIsDeleteOpen(false)
      fetchStaff()
    } catch (err: any) {
      console.error('Delete staff failed:', err)
      setError(err.message || 'Failed to delete staff member.')
    } finally {
      setSubmitting(false)
    }
  }

  // Dismiss notifications automatically
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Filtered staff list
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Counters
  const totalCount = staff.length
  const captainsCount = staff.filter((s) => s.role === 'captain').length
  const managersCount = staff.filter((s) => s.role === 'manager').length
  const adminsCount = staff.filter((s) => s.role === 'admin').length

  if (loading || (profile && profile.role !== 'admin')) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            {profile?.role !== 'admin' ? 'Admin Access Required. Redirecting...' : 'Loading Staff Roster...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-foreground">
      
      {/* ────────────────────────────────────────────────────────
          1. HEADER (DESKTOP & MOBILE COMPACT BAR)
          ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs select-none">
        <div>
          <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase text-zinc-400 block leading-tight">Access Control</span>
          <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white leading-tight flex items-center gap-2">
            Staff & Terminals
            {syncing && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
          </h1>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => fetchStaff(true)}
            disabled={syncing}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 min-h-[38px] active:scale-95"
            title="Sync Roster"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-amber-500' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
          
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-3 py-2 sm:py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md shadow-amber-500/20 min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </header>

      {/* Notifications Banner */}
      {error && (
        <div className="m-3 sm:mx-6 p-3 text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-0.5">
            <p className="font-black uppercase text-[10px] tracking-wider">Execution Error</p>
            <p className="font-medium text-xs">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1 text-red-500 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="m-3 sm:mx-6 p-3 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="p-1 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          2. ROSTER SUMMARY METRICS (Horizontal Scroll on Mobile)
          ──────────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-6 pt-3 pb-2 shrink-0 select-none">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          
          <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Total Roster</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white mt-0.5 block">{totalCount} Staff</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Captains (Waiters)</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">{captainsCount} Terminals</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Managers</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">{managersCount} Active</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[9px] sm:text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Administrators</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">{adminsCount} Owners</span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
          </div>

        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          3. SEARCH & ROLE FILTERS (Responsive Mobile Strip)
          ──────────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-6 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 select-none">
        
        {/* Role Filter Tabs (Touch Swipe Strip on Mobile) */}
        <div className="flex items-center gap-1 p-1 bg-zinc-200/60 dark:bg-zinc-900 rounded-xl overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Roles' },
            { id: 'captain', label: 'Captains' },
            { id: 'manager', label: 'Managers' },
            { id: 'admin', label: 'Admins' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-black rounded-lg transition-all text-center whitespace-nowrap min-h-[34px] flex items-center justify-center active:scale-95 cursor-pointer ${
                roleFilter === r.id
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name or email..."
            className="w-full pl-9 pr-3 py-2 sm:py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[40px] sm:min-h-0"
          />
        </div>

      </div>

      {/* ────────────────────────────────────────────────────────
          4. STAFF ROSTER LIST VIEW
          ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-6">
        {filteredStaff.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
            <p className="text-sm font-bold text-zinc-500">No staff members found</p>
            <p className="text-xs text-zinc-400">Try adjusting your search query or add a new member.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {filteredStaff.map((member) => {
              const roleConfig = {
                admin: {
                  badge: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                  avatarBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                  label: 'Administrator'
                },
                manager: {
                  badge: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                  avatarBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  label: 'Shift Manager'
                },
                captain: {
                  badge: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
                  avatarBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  label: 'Table Captain'
                }
              }[member.role] || {
                badge: 'text-zinc-500 bg-zinc-100',
                avatarBg: 'bg-zinc-100 text-zinc-500',
                label: member.role
              }

              const joinedDate = new Date(member.created_at).toLocaleDateString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })

              return (
                <div 
                  key={member.id}
                  className="p-3 sm:px-4 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors select-none"
                >
                  {/* Left: Avatar + Staff Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl ${roleConfig.avatarBg} font-mono font-black text-sm flex items-center justify-center shrink-0`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-zinc-900 dark:text-white truncate">
                          {member.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider shrink-0 ${roleConfig.badge}`}>
                          {member.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium truncate mt-0.5">
                        <span className="truncate">{member.email}</span>
                        <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">•</span>
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-400">
                          <Clock className="w-3 h-3" />
                          Joined {joinedDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(member)}
                      className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title="Edit privileges"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      onClick={() => openDeleteModal(member)}
                      className="h-9 w-9 rounded-xl border border-red-200/60 dark:border-red-950/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                      title="Delete staff account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────
          5. ADD STAFF MODAL (Bottom Sheet on Mobile, Dialog on Desktop)
          ──────────────────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none">
          <div 
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs"
            onClick={() => setIsAddOpen(false)}
          />

          <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            
            {/* Mobile swipe handle */}
            <div className="sm:hidden -mt-1 pb-2 flex justify-center">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-zinc-900 dark:text-white">Register Staff Member</h3>
              </div>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="pt-4 space-y-4">
              
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Captain Jack"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">
                  Login Email Address
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="e.g. jack@tipsypos.com"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">
                  Terminal Passcode / Password
                </label>
                <input
                  type="text"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">
                  Assigned Terminal Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'captain', label: 'Captain', desc: 'Orders & KOT' },
                    { value: 'manager', label: 'Manager', desc: 'Floor & menu' },
                    { value: 'admin', label: 'Admin', desc: 'Full control' }
                  ] as const).map((roleObj) => {
                    const isSelected = addRole === roleObj.value
                    return (
                      <button
                        key={roleObj.value}
                        type="button"
                        onClick={() => setAddRole(roleObj.value)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300'
                        }`}
                      >
                        <p className="text-xs font-black">{roleObj.label}</p>
                        <p className="text-[9px] opacity-75 mt-0.5 leading-none">{roleObj.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Register Staff
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          6. EDIT STAFF MODAL (Bottom Sheet on Mobile, Dialog on Desktop)
          ──────────────────────────────────────────────────────── */}
      {isEditOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none">
          <div 
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs"
            onClick={() => setIsEditOpen(false)}
          />

          <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            
            {/* Mobile swipe handle */}
            <div className="sm:hidden -mt-1 pb-2 flex justify-center">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-zinc-900 dark:text-white">Modify Staff Profile</h3>
              </div>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="pt-4 space-y-4">
              
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-0.5 border border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Account Email</p>
                <p className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedStaff.email}</p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">
                  Staff Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Captain Jack"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">
                  Update Role & Permissions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'captain', label: 'Captain', desc: 'Orders & KOT' },
                    { value: 'manager', label: 'Manager', desc: 'Floor & menu' },
                    { value: 'admin', label: 'Admin', desc: 'Full control' }
                  ] as const).map((roleObj) => {
                    const isSelected = editRole === roleObj.value
                    return (
                      <button
                        key={roleObj.value}
                        type="button"
                        onClick={() => setEditRole(roleObj.value)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300'
                        }`}
                      >
                        <p className="text-xs font-black">{roleObj.label}</p>
                        <p className="text-[9px] opacity-75 mt-0.5 leading-none">{roleObj.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          7. DELETE STAFF CONFIRMATION MODAL
          ──────────────────────────────────────────────────────── */}
      {isDeleteOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none">
          <div 
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs"
            onClick={() => setIsDeleteOpen(false)}
          />

          <div className="relative z-10 w-full sm:max-w-sm bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="flex items-center gap-3 pb-3 text-red-500 border-b border-zinc-100 dark:border-zinc-800">
              <div className="p-2.5 rounded-2xl bg-red-500/10 shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white leading-tight">Remove Account</h3>
                <p className="text-[10px] text-zinc-400 font-bold">Action cannot be undone</p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                Are you sure you want to remove <span className="font-black text-zinc-900 dark:text-white">{selectedStaff.name}</span> (<span className="font-mono text-zinc-500">{selectedStaff.email}</span>) from the staff roster?
              </p>
              
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl text-[10px] text-red-500 font-bold leading-relaxed">
                Revoking this account immediately disables their login across Captain terminals and POS cashiers.
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStaffSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-500/20 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
