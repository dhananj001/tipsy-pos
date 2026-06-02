'use client'

import React, { useEffect, useState } from 'react'
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
  Edit,
  Plus,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  User,
  Key
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
  const supabase = createClient()

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

    // Subscribe to public.users updates (filtered by restaurant)
    const channel = supabase
      .channel('admin:staff')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `restaurant_id=eq.${profile.restaurant_id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setStaff((prev) => {
              if (prev.some((s) => s.id === payload.new.id)) return prev
              return [...prev, payload.new as StaffMember].sort((a, b) => a.name.localeCompare(b.name))
            })
          } else if (payload.eventType === 'UPDATE') {
            setStaff((prev) =>
              prev.map((s) => (s.id === payload.new.id ? (payload.new as StaffMember) : s))
            )
          } else if (payload.eventType === 'DELETE') {
            setStaff((prev) => prev.filter((s) => s.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.restaurant_id])

  // Handle Add Staff submission
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await createStaffAction({
        name: addName,
        email: addEmail,
        role: addRole,
        password: addPassword
      })

      if (!res.success) {
        throw new Error(res.error)
      }

      setSuccess(res.message || 'Staff member registered successfully.')
      setIsAddOpen(false)
      
      // Reset fields
      setAddName('')
      setAddEmail('')
      setAddRole('captain')
      setAddPassword('password123')
      
      fetchStaff()
    } catch (err: any) {
      setError(err.message || 'Could not add staff member.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Edit Staff setup
  const openEditModal = (member: StaffMember) => {
    setSelectedStaff(member)
    setEditName(member.name)
    setEditRole(member.role)
    setIsEditOpen(true)
  }

  // Handle Edit Staff submission
  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff) return
    
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await updateStaffAction(selectedStaff.id, {
        name: editName,
        role: editRole
      })

      if (!res.success) {
        throw new Error(res.error)
      }

      setSuccess(res.message || 'Staff profile updated.')
      setIsEditOpen(false)
      fetchStaff()
    } catch (err: any) {
      setError(err.message || 'Could not update staff member.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete Staff confirmation setup
  const openDeleteModal = (member: StaffMember) => {
    setSelectedStaff(member)
    setIsDeleteOpen(true)
  }

  // Handle Delete Staff execution
  const handleDeleteStaffSubmit = async () => {
    if (!selectedStaff) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await deleteStaffAction(selectedStaff.id)

      if (!res.success) {
        throw new Error(res.error)
      }

      setSuccess(res.message || 'Staff member deleted.')
      setIsDeleteOpen(false)
      setSelectedStaff(null)
      fetchStaff()
    } catch (err: any) {
      setError(err.message || 'Could not delete staff member.')
    } finally {
      setSubmitting(false)
    }
  }

  // Dismiss notifications automatically after a timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Filtered and searched staff list
  const filteredStaff = staff.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  // Performance role counters
  const totalCount = staff.length
  const captainsCount = staff.filter((s) => s.role === 'captain').length
  const managersCount = staff.filter((s) => s.role === 'manager').length
  const adminsCount = staff.filter((s) => s.role === 'admin').length

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Synchronizing Staff Records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Staff Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Manage terminal access credentials, employee privileges, and role permissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchStaff(true)}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-background hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Roster
          </button>
          
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 text-xs font-extrabold text-white active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-bold">Execution Error</p>
            <p className="opacity-90 leading-relaxed font-normal">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:opacity-85 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
          <span className="flex-1 font-bold">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-emerald-650 dark:text-emerald-450 hover:opacity-85 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Roster Counters Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Total Roster</span>
            <span className="text-2xl font-black text-foreground mt-1 block">{totalCount} members</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-500">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Captains (Waiters)</span>
            <span className="text-2xl font-black text-amber-500 mt-1 block">{captainsCount} terminals</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-550/10 flex items-center justify-center text-amber-550 dark:text-amber-405">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Managers</span>
            <span className="text-2xl font-black text-emerald-500 mt-1 block">{managersCount} active</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-550/10 flex items-center justify-center text-emerald-550 dark:text-emerald-405">
            <Users className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/50 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Admins</span>
            <span className="text-2xl font-black text-indigo-500 mt-1 block">{adminsCount} controllers</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-550/10 flex items-center justify-center text-indigo-550 dark:text-indigo-405">
            <Shield className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Roster Controls: Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/30 shrink-0">
        
        {/* Search Bar */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name or email..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden md:inline">Role Filter:</span>
          <div className="grid grid-cols-4 md:flex items-center gap-1.5 w-full md:w-auto">
            {['all', 'captain', 'manager', 'admin'].map((role) => {
              const label = role.charAt(0).toUpperCase() + role.slice(1)
              const isActive = roleFilter === role
              return (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`py-2 px-3 rounded-lg text-[10px] font-bold transition-all text-center select-none cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                      : 'border border-zinc-200 dark:border-zinc-800 text-muted-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  {label === 'All' ? 'All Roles' : label}
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl bg-background/20 space-y-3">
          <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto opacity-70" />
          <p className="text-xs font-bold text-foreground">No staff members found</p>
          <p className="text-[10px] text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search criteria or register a new staff member to start building your restaurant service team.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member) => {
            const roleConfig = {
              admin: {
                badge: 'text-indigo-550 bg-indigo-500/10 border-indigo-500/20 dark:text-indigo-400',
                avatar: 'from-indigo-500 to-violet-500 text-white',
                label: 'Admin Controller'
              },
              manager: {
                badge: 'text-emerald-550 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-450',
                avatar: 'from-emerald-500 to-teal-500 text-white',
                label: 'POS Manager'
              },
              captain: {
                badge: 'text-amber-550 bg-amber-500/10 border-amber-500/20 dark:text-amber-455',
                avatar: 'from-amber-500 to-rose-500 text-white',
                label: 'Table Captain'
              }
            }[member.role]

            const joinedDate = new Date(member.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })

            return (
              <div 
                key={member.id}
                className="p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/50 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-800 transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Card Header Profile Info */}
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl bg-gradient-to-tr ${roleConfig.avatar} flex items-center justify-center font-extrabold text-sm shadow-md`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold truncate text-foreground group-hover:text-indigo-500 transition-colors">
                        {member.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>

                  {/* Metadata fields */}
                  <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-900 pt-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground font-semibold">Service Role</span>
                      <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${roleConfig.badge}`}>
                        {member.role}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground font-semibold">Joined POS</span>
                      <span className="text-foreground font-bold font-mono">{joinedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="flex gap-2 mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-900">
                  <button
                    onClick={() => openEditModal(member)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-[10px] font-extrabold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Modify
                  </button>

                  <button
                    onClick={() => openDeleteModal(member)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-red-200/50 hover:bg-red-50 text-red-500 dark:border-red-950/40 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                    title="Delete staff account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* =====================================================================
          1. ADD STAFF MODAL DIALOG
          ===================================================================== */}
      {isAddOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm"
            onClick={() => setIsAddOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md mx-4 bg-background border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500 animate-pulse" />
                <h3 className="text-sm font-bold text-foreground">Add New Staff Member</h3>
              </div>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4 py-4">
              
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-900 rounded-2xl text-[9px] font-semibold text-muted-foreground flex gap-2 items-start leading-relaxed">
                <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <p className="font-bold text-foreground mb-0.5">Supabase Auth Provisioning</p>
                  This will register a new staff account in your Supabase authentication suite so they can sign in from their mobile ordering or cashier terminals.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Captain Jack"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email Address
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="e.g. jack@tipsypos.com"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Passcode / Password
                </label>
                <input
                  type="text"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Key className="w-3.5 h-3.5" /> System Role & Privileges
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'captain', label: 'Captain', desc: 'Orders only' },
                    { value: 'manager', label: 'Manager', desc: 'Menu & layout' },
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
                            ? 'bg-zinc-900 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-sm'
                            : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-muted-foreground'
                        }`}
                      >
                        <p className="text-[10px] font-black">{roleObj.label}</p>
                        <p className="text-[8px] opacity-75 mt-0.5 leading-none">{roleObj.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-muted-foreground active:scale-95 transition-all select-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 text-white font-extrabold text-xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Confirm Addition
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. EDIT STAFF MODAL DIALOG
          ===================================================================== */}
      {isEditOpen && selectedStaff && (
        <div className="fixed inset-0 z-55 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm"
            onClick={() => setIsEditOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md mx-4 bg-background border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-900">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-foreground">Modify Staff Profile</h3>
              </div>
              <button 
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="space-y-4 py-4">
              
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Account Credentials</p>
                <p className="text-xs font-bold text-foreground">{selectedStaff.email}</p>
                <p className="text-[9px] text-muted-foreground">Authentication credentials cannot be edited to maintain logs integrity.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Captain Jack"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Key className="w-3.5 h-3.5" /> System Role & Privileges
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'captain', label: 'Captain', desc: 'Orders only' },
                    { value: 'manager', label: 'Manager', desc: 'Menu & layout' },
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
                            ? 'bg-zinc-900 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950 shadow-sm'
                            : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-muted-foreground'
                        }`}
                      >
                        <p className="text-[10px] font-black">{roleObj.label}</p>
                        <p className="text-[8px] opacity-75 mt-0.5 leading-none">{roleObj.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-muted-foreground active:scale-95 transition-all select-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 text-white font-extrabold text-xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving changes...
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

      {/* =====================================================================
          3. DELETE STAFF CONFIRM MODAL
          ===================================================================== */}
      {isDeleteOpen && selectedStaff && (
        <div className="fixed inset-0 z-55 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm"
            onClick={() => setIsDeleteOpen(false)}
          />

          <div className="relative z-10 w-full max-w-sm mx-4 bg-background border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 pb-3 text-red-500 border-b border-zinc-100 dark:border-zinc-900">
              <div className="p-2 rounded-xl bg-red-500/10">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Confirm Account Deletion</h3>
                <p className="text-[10px] text-muted-foreground">Action is highly destructive</p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-foreground leading-relaxed">
                Are you absolutely sure you want to remove <span className="font-extrabold text-red-550">{selectedStaff.name}</span> (<span className="font-mono text-[10px] text-muted-foreground">{selectedStaff.email}</span>) from the POS system?
              </p>
              
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl text-[9px] text-red-500/80 leading-relaxed font-semibold">
                <p className="font-bold text-red-500 uppercase tracking-widest mb-0.5">Warning</p>
                Removing this staff account will revoke their system terminal privileges instantly. They will no longer be able to log in or process order invoices.
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-900">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-muted-foreground active:scale-95 transition-all select-none cursor-pointer"
              >
                Abort
              </button>
              <button
                onClick={handleDeleteStaffSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Account
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
