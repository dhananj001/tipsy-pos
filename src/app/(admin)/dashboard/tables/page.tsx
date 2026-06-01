'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, 
  Grid, 
  RefreshCw, 
  CheckCircle, 
  Coffee, 
  Receipt, 
  X, 
  AlertCircle,
  Loader2,
  TrendingUp,
  LayoutGrid
} from 'lucide-react'

interface Table {
  id: string
  restaurant_id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'billing'
  created_at: string
}

export default function AdminTablesPage() {
  const { profile } = useAuth()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null)

  const supabase = createClient()

  // 1. Fetch tables
  const fetchTables = async (showSyncState = false) => {
    if (!profile?.restaurant_id) return
    if (showSyncState) setSyncing(true)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('number', { ascending: true })

      if (fetchError) throw fetchError

      // 2. Seed tables if empty
      if (!data || data.length === 0) {
        setSyncing(true)
        const defaultTables = Array.from({ length: 12 }, (_, i) => ({
          restaurant_id: profile.restaurant_id,
          number: i + 1,
          capacity: [2, 4, 6, 8][i % 4],
          status: 'available' as const,
        }))

        const { data: seededData, error: seedError } = await supabase
          .from('tables')
          .insert(defaultTables)
          .select()

        if (seedError) throw seedError
        if (seededData) setTables(seededData as Table[])
      } else {
        setTables(data as Table[])
      }
      
      setError(null)
    } catch (err: any) {
      console.error('Error fetching tables on admin:', err)
      setError(err.message || 'Failed to sync tables.')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  // 3. Realtime sync on mount
  useEffect(() => {
    if (!profile?.restaurant_id) return

    fetchTables()

    const channel = supabase
      .channel('admin:tables')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `restaurant_id=eq.${profile.restaurant_id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTables((prev) => {
              if (prev.some((t) => t.id === payload.new.id)) return prev
              return [...prev, payload.new as Table].sort((a, b) => a.number - b.number)
            })
          } else if (payload.eventType === 'UPDATE') {
            setTables((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Table) : t))
            )
            setSelectedTable((prev) => 
              prev && prev.id === payload.new.id ? (payload.new as Table) : prev
            )
          } else if (payload.eventType === 'DELETE') {
            setTables((prev) => prev.filter((t) => t.id !== payload.old.id))
            setSelectedTable((prev) => prev && prev.id === payload.old.id ? null : prev)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.restaurant_id])

  // 4. Update status mutation
  const updateTableStatus = async (tableId: string, newStatus: 'available' | 'occupied' | 'billing') => {
    setUpdatingTableId(tableId)
    
    // Optimistic UI updates
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t))
    )
    if (selectedTable && selectedTable.id === tableId) {
      setSelectedTable({ ...selectedTable, status: newStatus })
    }

    try {
      const { error: updateError } = await supabase
        .from('tables')
        .update({ status: newStatus })
        .eq('id', tableId)

      if (updateError) throw updateError
    } catch (err: any) {
      console.error('Error updating table on admin:', err)
      fetchTables()
      setError(`Failed to update status: ${err.message}`)
    } finally {
      setUpdatingTableId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Loading Tables Panel...</p>
        </div>
      </div>
    )
  }

  const availableCount = tables.filter((t) => t.status === 'available').length
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length
  const billingCount = tables.filter((t) => t.status === 'billing').length
  const totalCount = tables.length

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-indigo-500" />
            Table Layout & Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Realtime monitoring and seating status control hub</p>
        </div>

        <button
          onClick={() => fetchTables(true)}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-background hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Force Sync Cache
        </button>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:opacity-85">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Admin Performance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 dark:bg-zinc-900/20 dark:border-zinc-900">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Tenancy</span>
          <p className="text-2xl font-black text-indigo-500 mt-1">{totalCount} Tables</p>
          <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-indigo-500" /> Seated Capacity: {tables.reduce((acc, t) => acc + t.capacity, 0)} Pax
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/15">
          <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Available Seats</span>
          <p className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">{availableCount} Tables</p>
          <span className="text-[9px] text-muted-foreground mt-1 block">
            {((availableCount / totalCount) * 100).toFixed(0)}% occupancy potential
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Occupied / Active</span>
          <p className="text-2xl font-black text-amber-500 mt-1">{occupiedCount} Tables</p>
          <span className="text-[9px] text-muted-foreground mt-1 block">
            {occupiedCount} dining tables taking orders
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Billing / Pending Cashout</span>
          <p className="text-2xl font-black text-blue-500 mt-1">{billingCount} Tables</p>
          <span className="text-[9px] text-muted-foreground mt-1 block">
            {billingCount} customers requested receipts
          </span>
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => {
          const statusConfig = {
            available: {
              color: 'border-green-500/20 bg-green-500/5 hover:bg-green-500/10 text-green-700 dark:text-green-400',
              badge: 'bg-green-500',
            },
            occupied: {
              color: 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400',
              badge: 'bg-amber-500',
            },
            billing: {
              color: 'border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-700 dark:text-blue-400',
              badge: 'bg-blue-500',
            },
          }[table.status]

          // Mock totals for active order indicators (Step 4 Requirement)
          const mockTotals = {
            available: 0,
            occupied: [34.50, 58.20, 19.80, 84.90][table.number % 4],
            billing: [125.00, 78.40, 142.50, 92.00][table.number % 4],
          }[table.status]

          const isUpdating = updatingTableId === table.id

          return (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table)}
              disabled={isUpdating}
              className={`p-5 rounded-2xl border transition-all active:scale-[0.97] flex flex-col items-center justify-center h-28 text-center relative overflow-hidden cursor-pointer ${statusConfig.color}`}
            >
              {isUpdating ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <span className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${statusConfig.badge}`}></span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Table</span>
                  <span className="text-2xl font-black mt-0.5">{table.number}</span>
                  <span className="text-[10px] opacity-80 mt-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {table.capacity} Pax
                  </span>

                  {mockTotals > 0 && (
                    <span className="absolute bottom-2.5 text-[9px] font-black px-2 py-0.5 rounded-md bg-zinc-950/5 dark:bg-white/5 tracking-wider">
                      ${mockTotals.toFixed(2)}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Seating / Action Sidebar Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div 
            className="fixed inset-0 bg-zinc-950/30 backdrop-blur-sm"
            onClick={() => setSelectedTable(null)}
          />

          <div className="relative z-10 w-full max-w-sm h-full bg-background border-l border-zinc-200 dark:border-zinc-900 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 font-bold text-indigo-500 flex items-center justify-center">
                    T{selectedTable.number}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Table {selectedTable.number} Control</h3>
                    <p className="text-[10px] text-muted-foreground">Capacity: {selectedTable.capacity} Seats</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTable(null)}
                  className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Update Status</span>
                
                <div className="space-y-2">
                  <button
                    onClick={() => updateTableStatus(selectedTable.id, 'available')}
                    className={`flex w-full items-center gap-3 p-3 rounded-xl border text-left active:scale-[0.98] transition-all cursor-pointer ${
                      selectedTable.status === 'available'
                        ? 'border-green-500/35 bg-green-500/5 text-green-700 dark:text-green-400 font-bold'
                        : 'border-zinc-200/65 dark:border-zinc-900 bg-background/50 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <CheckCircle className={`w-4 h-4 shrink-0 ${selectedTable.status === 'available' ? 'text-green-500' : 'text-zinc-400'}`} />
                    <div>
                      <p className="text-xs font-bold">Clear Table (Available)</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Vacate table and make it bookable</p>
                    </div>
                  </button>

                  <button
                    onClick={() => updateTableStatus(selectedTable.id, 'occupied')}
                    className={`flex w-full items-center gap-3 p-3 rounded-xl border text-left active:scale-[0.98] transition-all cursor-pointer ${
                      selectedTable.status === 'occupied'
                        ? 'border-amber-500/35 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-bold'
                        : 'border-zinc-200/65 dark:border-zinc-900 bg-background/50 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <Coffee className={`w-4 h-4 shrink-0 ${selectedTable.status === 'occupied' ? 'text-amber-500' : 'text-zinc-400'}`} />
                    <div>
                      <p className="text-xs font-bold">Seat Guests (Occupied)</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Table is active, running orders ongoing</p>
                    </div>
                  </button>

                  <button
                    onClick={() => updateTableStatus(selectedTable.id, 'billing')}
                    className={`flex w-full items-center gap-3 p-3 rounded-xl border text-left active:scale-[0.98] transition-all cursor-pointer ${
                      selectedTable.status === 'billing'
                        ? 'border-blue-500/35 bg-blue-500/5 text-blue-700 dark:text-blue-400 font-bold'
                        : 'border-zinc-200/65 dark:border-zinc-900 bg-background/50 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <Receipt className={`w-4 h-4 shrink-0 ${selectedTable.status === 'billing' ? 'text-blue-500' : 'text-zinc-400'}`} />
                    <div>
                      <p className="text-xs font-bold">Checkout Check (Billing)</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Customer requested receipt, waiting for payment</p>
                    </div>
                  </button>
                </div>
              </div>

            </div>

            <button
              onClick={() => setSelectedTable(null)}
              className="w-full py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 bg-background dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
