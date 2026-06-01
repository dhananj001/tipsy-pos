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
  ChevronRight, 
  AlertCircle,
  Loader2
} from 'lucide-react'

interface Table {
  id: string
  restaurant_id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'billing'
  created_at: string
}

export default function TablesPage() {
  const { profile } = useAuth()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null)

  const supabase = createClient()

  // 1. Fetch tables from Supabase
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

      // 2. Auto-seed 12 default tables if restaurant has none
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
      console.error('Error handling tables:', err)
      setError(err.message || 'Failed to fetch table layouts.')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  // 3. Realtime sync and load on mount
  useEffect(() => {
    if (!profile?.restaurant_id) return

    fetchTables()

    // Subscribe to database changes
    const channel = supabase
      .channel('public:tables')
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
            // Sync selected table details in modal
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

  // 4. Update table status mutation
  const updateTableStatus = async (tableId: string, newStatus: 'available' | 'occupied' | 'billing') => {
    setUpdatingTableId(tableId)
    
    // Optimistic UI update
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
      console.error('Error updating table:', err)
      // Rollback optimistic update
      fetchTables()
      setError(`Failed to update table status: ${err.message}`)
    } finally {
      setUpdatingTableId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Synchronizing Tables Layout...</p>
        </div>
      </div>
    )
  }

  // Count active tables for overview indicators
  const availableCount = tables.filter((t) => t.status === 'available').length
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length
  const billingCount = tables.filter((t) => t.status === 'billing').length

  return (
    <div className="space-y-4 animate-in fade-in duration-300 relative pb-10">
      
      {/* Header and Live Status Indicators */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Tables Terminal</h2>
          <p className="text-[10px] text-muted-foreground">Select a table to seat guests or manage bill</p>
        </div>
        
        <button
          onClick={() => fetchTables(true)}
          disabled={syncing}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-background text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 active:scale-95 transition-all disabled:opacity-50"
          title="Force Sync Cache"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 text-[11px] font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:opacity-80">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Quick Summary Metrics */}
      <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200/40 dark:border-zinc-800/40">
        <div className="px-3 py-2 bg-background/50 dark:bg-background/25 rounded-xl border border-zinc-200/20 text-center">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Available</p>
          <p className="text-sm font-black text-green-600 dark:text-green-400 mt-0.5">{availableCount}</p>
        </div>
        <div className="px-3 py-2 bg-background/50 dark:bg-background/25 rounded-xl border border-zinc-200/20 text-center">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Occupied</p>
          <p className="text-sm font-black text-amber-500 dark:text-amber-400 mt-0.5">{occupiedCount}</p>
        </div>
        <div className="px-3 py-2 bg-background/50 dark:bg-background/25 rounded-xl border border-zinc-200/20 text-center">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Billing</p>
          <p className="text-sm font-black text-blue-500 dark:text-blue-400 mt-0.5">{billingCount}</p>
        </div>
      </div>

      {/* Responsive Grid of Table Cards */}
      <div className="grid grid-cols-3 gap-3">
        {tables.map((table) => {
          const statusColors = {
            available: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/15',
            occupied: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15',
            billing: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/15',
          }[table.status]

          const statusBadge = {
            available: 'bg-green-500',
            occupied: 'bg-amber-500',
            billing: 'bg-blue-500',
          }[table.status]

          // Snapshot mock totals for visualization (Step 4 Indication Requirements)
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
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 text-center ${statusColors} h-24 relative overflow-hidden cursor-pointer select-none`}
            >
              {isUpdating ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  {/* Status Indicator Dot */}
                  <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${statusBadge}`}></span>
                  
                  <span className="text-[8px] font-bold tracking-widest text-muted-foreground uppercase opacity-85">Table</span>
                  <span className="text-xl font-extrabold tracking-tight">{table.number}</span>
                  <span className="text-[8px] font-bold opacity-75 mt-0.5 flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" />
                    {table.capacity} Pax
                  </span>
                  
                  {mockTotals > 0 && (
                    <span className="absolute bottom-2 text-[9px] font-black tracking-tight px-1.5 py-0.5 rounded-md bg-zinc-950/5 dark:bg-white/5">
                      ${mockTotals.toFixed(2)}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Touch-Friendly Drawer / Bottom Sheet Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedTable(null)}
          />
          
          {/* Sheet Body */}
          <div className="relative z-10 w-full max-w-md bg-background border border-zinc-200 dark:border-zinc-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-250">
            
            {/* Grab handle for touch feel */}
            <div className="h-1.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Title / Details Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-150 dark:border-zinc-900">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 font-extrabold text-lg">
                  T{selectedTable.number}
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">Table #{selectedTable.number} Management</h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3 text-amber-500" />
                    Seating Capacity: {selectedTable.capacity} Pax
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTable(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions Grid */}
            <div className="py-5 space-y-3.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Configure Table Status</span>
              
              <div className="grid grid-cols-1 gap-2.5">
                
                {/* 1. Set Available */}
                <button
                  onClick={() => {
                    updateTableStatus(selectedTable.id, 'available')
                  }}
                  className={`flex w-full items-center justify-between p-3.5 rounded-xl border text-left active:scale-[0.98] transition-all cursor-pointer ${
                    selectedTable.status === 'available'
                      ? 'border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400 font-bold'
                      : 'border-zinc-200/50 dark:border-zinc-900 bg-background/50 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className={`w-5 h-5 ${selectedTable.status === 'available' ? 'text-green-500' : 'text-zinc-400'}`} />
                    <div>
                      <h4 className="text-xs font-bold">Clear & Set Available</h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Table is cleared and ready for new guests</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                </button>

                {/* 2. Set Occupied */}
                <button
                  onClick={() => {
                    updateTableStatus(selectedTable.id, 'occupied')
                  }}
                  className={`flex w-full items-center justify-between p-3.5 rounded-xl border text-left active:scale-[0.98] transition-all cursor-pointer ${
                    selectedTable.status === 'occupied'
                      ? 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-bold'
                      : 'border-zinc-200/50 dark:border-zinc-900 bg-background/50 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Coffee className={`w-5 h-5 ${selectedTable.status === 'occupied' ? 'text-amber-500' : 'text-zinc-400'}`} />
                    <div>
                      <h4 className="text-xs font-bold">Seat Guests & Set Occupied</h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Table is seated, orders are ready to be taken</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                </button>

                {/* 3. Set Billing */}
                <button
                  onClick={() => {
                    updateTableStatus(selectedTable.id, 'billing')
                  }}
                  className={`flex w-full items-center justify-between p-3.5 rounded-xl border text-left active:scale-[0.98] transition-all cursor-pointer ${
                    selectedTable.status === 'billing'
                      ? 'border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-400 font-bold'
                      : 'border-zinc-200/50 dark:border-zinc-900 bg-background/50 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Receipt className={`w-5 h-5 ${selectedTable.status === 'billing' ? 'text-blue-500' : 'text-zinc-400'}`} />
                    <div>
                      <h4 className="text-xs font-bold">Request Bill & Set Billing</h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Kitchen orders finished, customer waiting for checkout check</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                </button>

              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-zinc-150 dark:border-zinc-900 flex justify-end">
              <button
                onClick={() => setSelectedTable(null)}
                className="px-5 py-2.5 rounded-xl border border-zinc-250 bg-background text-foreground hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
