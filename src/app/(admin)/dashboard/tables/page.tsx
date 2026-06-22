'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
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
  LayoutGrid,
  ShoppingBag,
  ChevronRight,
  CheckCircle2
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

  // Billing & Checkout States
  const [activeOrders, setActiveOrders] = useState<any[]>([])
  const [fetchingOrders, setFetchingOrders] = useState(false)
  const [billingMode, setBillingMode] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi')
  const [submittingPayment, setSubmittingPayment] = useState(false)

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
          .upsert(defaultTables, { onConflict: 'restaurant_id,number' })
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

  // Fetch active running orders and their items for the selected table
  const fetchActiveOrders = async (tableId: string) => {
    setFetchingOrders(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          order_items (
            id,
            quantity,
            price_at_order,
            variant_name,
            notes,
            menu_items (
              name,
              price
            )
          )
        `)
        .eq('table_id', tableId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true })

      if (error) throw error
      setActiveOrders(data || [])
    } catch (e) {
      console.error('Error fetching table orders:', e)
    } finally {
      setFetchingOrders(false)
    }
  }

  // Hook to monitor table selection & fetch their sub-orders
  useEffect(() => {
    if (selectedTable && selectedTable.status !== 'available') {
      fetchActiveOrders(selectedTable.id)
      setBillingMode(false)
    } else {
      setActiveOrders([])
      setBillingMode(false)
    }
  }, [selectedTable])

  // Helper to aggregate running order items for the table bill
  const getAggregatedItems = () => {
    const itemMap = new Map<string, { name: string; quantity: number; price: number; variant_name: string | null }>()
    activeOrders.forEach(order => {
      order.order_items?.forEach((oi: any) => {
        const baseName = oi.menu_items?.name || 'Unknown Item'
        const variantName = oi.variant_name || null
        const displayName = variantName ? `${baseName} (${variantName})` : baseName
        const price = oi.price_at_order || 0
        const existing = itemMap.get(displayName)
        if (existing) {
          existing.quantity += oi.quantity
        } else {
          itemMap.set(displayName, { name: displayName, quantity: oi.quantity, price, variant_name: variantName })
        }
      })
    })
    return Array.from(itemMap.values())
  }

  const aggregatedItems = getAggregatedItems()
  const subtotal = aggregatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const taxPercent = 5 // Standard 5% POS GST
  const taxAmount = subtotal * (taxPercent / 100)
  const grandTotal = subtotal + taxAmount

  // Schedule a print job for customer receipt (BILL type)
  const printBill = async (isPaid: boolean) => {
    if (!profile?.restaurant_id || !selectedTable) return

    try {
      const { data: printers, error: printersErr } = await supabase
        .from('printers')
        .select('id, name, type')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('type', 'billing')
        .eq('is_active', true)

      if (printersErr) throw printersErr

      let targetPrinters = printers || []
      if (targetPrinters.length === 0) {
        const { data: anyPrinters } = await supabase
          .from('printers')
          .select('id, name, type')
          .eq('restaurant_id', profile.restaurant_id)
          .eq('is_active', true)
        if (anyPrinters && anyPrinters.length > 0) {
          targetPrinters = [anyPrinters[0]]
        }
      }

      if (targetPrinters.length === 0) {
        console.error('No active printers configured to print bill.')
        return
      }

      let restaurantName = 'Tipsy POS'
      let restaurantAddress = ''
      let restaurantPhone = ''
      try {
        const { data: restData } = await supabase
          .from('restaurants')
          .select('name, address, phone')
          .eq('id', profile.restaurant_id)
          .single()
        if (restData) {
          restaurantName = restData.name || restaurantName
          restaurantAddress = restData.address || ''
          restaurantPhone = restData.phone || ''
        }
      } catch (e) {
        console.error('Failed to fetch restaurant info for invoice:', e)
      }

      const billPayload = {
        type: 'BILL',
        restaurantName,
        restaurantAddress,
        restaurantPhone,
        tableName: 'Table',
        tableNumber: String(selectedTable.number),
        captainName: profile.name || 'Manager',
        invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000).toString()}`,
        timestamp: new Date().toISOString(),
        items: aggregatedItems,
        subtotal,
        taxPercent,
        taxAmount,
        grandTotal,
        paymentMethod: isPaid ? paymentMethod : 'Pending',
        isPaid
      }

      const printJobs = targetPrinters.map(printer => ({
        restaurant_id: profile.restaurant_id,
        printer_id: printer.id,
        payload: billPayload,
        status: 'pending',
        attempts: 0
      }))

      const { error: insertErr } = await supabase
        .from('print_jobs')
        .insert(printJobs)

      if (insertErr) throw insertErr
      console.log('Successfully scheduled bill print jobs.')
    } catch (e) {
      console.error('Failed to schedule print bill job:', e)
    }
  }

  // Finalize table checkout & payment cashout
  const handleCheckout = async () => {
    if (!profile?.restaurant_id || !selectedTable || activeOrders.length === 0) return
    setSubmittingPayment(true)
    setError(null)
    
    try {
      const primaryOrderId = activeOrders[0].id

      const { error: paymentErr } = await supabase
        .from('payments')
        .insert({
          restaurant_id: profile.restaurant_id,
          order_id: primaryOrderId,
          amount: grandTotal,
          method: paymentMethod,
          status: 'completed'
        })

      if (paymentErr) throw paymentErr

      const orderIds = activeOrders.map(o => o.id)
      const { error: ordersUpdateErr } = await supabase
        .from('orders')
        .update({ status: 'served' })
        .in('id', orderIds)

      if (ordersUpdateErr) throw ordersUpdateErr

      await printBill(true)
      await updateTableStatus(selectedTable.id, 'available')
      setSelectedTable(null)
    } catch (e: any) {
      console.error('Checkout failed:', e)
      setError(`Checkout failed: ${e.message || e}`)
    } finally {
      setSubmittingPayment(false)
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
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Realtime monitoring and seating status control hub</p>
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
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60 dark:bg-zinc-900/20 dark:border-zinc-900 shadow-sm">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Tenancy</span>
          <p className="text-2xl font-black text-indigo-500 mt-1">{totalCount} Tables</p>
          <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1 font-semibold">
            <TrendingUp className="w-3 h-3 text-indigo-500" /> Seated Capacity: {tables.reduce((acc, t) => acc + t.capacity, 0)} Pax
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/15 shadow-sm">
          <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-widest">Available Seats</span>
          <p className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">{availableCount} Tables</p>
          <span className="text-[9px] text-muted-foreground mt-1 block font-semibold">
            {((availableCount / totalCount) * 100).toFixed(0)}% occupancy potential
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Occupied / Active</span>
          <p className="text-2xl font-black text-amber-500 mt-1">{occupiedCount} Tables</p>
          <span className="text-[9px] text-muted-foreground mt-1 block font-semibold">
            {occupiedCount} dining tables taking orders
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/15 shadow-sm">
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Billing / Pending Cashout</span>
          <p className="text-2xl font-black text-blue-500 mt-1">{billingCount} Tables</p>
          <span className="text-[9px] text-muted-foreground mt-1 block font-semibold">
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
              className={`p-5 rounded-2xl border transition-all active:scale-[0.97] flex flex-col items-center justify-center h-28 text-center relative overflow-hidden cursor-pointer shadow-sm ${statusConfig.color}`}
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
                      ₹{mockTotals.toFixed(2)}
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
            <div className="flex flex-col flex-1 overflow-hidden space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 font-bold text-indigo-500 flex items-center justify-center">
                    T{selectedTable.number}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {billingMode ? `Checkout Invoice T${selectedTable.number}` : `Table ${selectedTable.number} Control`}
                    </h3>
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

              {/* Scrollable action options / Billing detail panel */}
              <div className="flex-1 overflow-y-auto pr-1">
                {billingMode ? (
                  /* BILLING & INVOICE CHECKOUT INTERFACE */
                  <div className="space-y-5">
                    {fetchingOrders ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        <p className="text-[10px] text-muted-foreground font-bold">Compiling Invoice Details...</p>
                      </div>
                    ) : activeOrders.length === 0 ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-amber-500 opacity-60" />
                        <p className="text-xs font-bold">No running orders found</p>
                        <p className="text-[10px] text-muted-foreground max-w-xs px-4">This table has no active orders. Clear status or take orders first.</p>
                      </div>
                    ) : (
                      <>
                        {/* aggregated dishes list */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block px-1">Aggregated Dishes</span>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {aggregatedItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-950/20 text-xs font-semibold">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-indigo-550 font-black">x{item.quantity}</span>
                                  <span className="text-foreground truncate max-w-[150px]">{item.name}</span>
                                </div>
                                <div className="font-black text-foreground">
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Calculations Panel */}
                        <div className="border-t border-b border-zinc-100 dark:border-zinc-900 py-3.5 space-y-2">
                          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground px-1">
                            <span>Subtotal</span>
                            <span className="font-bold text-foreground">₹{subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground px-1">
                            <span>GST (5% tax)</span>
                            <span className="font-bold text-foreground">₹{taxAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs font-black text-foreground pt-1.5 px-1 border-t border-dashed border-zinc-200 dark:border-zinc-900">
                            <span className="uppercase tracking-wider">Grand Total Amount</span>
                            <span className="text-sm font-black text-indigo-500">₹{grandTotal.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Payment Methods Selector */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block px-1">Payment Method</span>
                          <div className="grid grid-cols-3 gap-2">
                            {(['upi', 'cash', 'card'] as const).map((method) => {
                              const labels = { upi: 'UPI', cash: 'Cash', card: 'Card' }
                              const isSelected = paymentMethod === method
                              return (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => setPaymentMethod(method)}
                                  className={`py-3 px-2 rounded-xl text-[11px] font-extrabold active:scale-95 transition-all text-center border cursor-pointer ${
                                    isSelected 
                                      ? 'bg-zinc-900 text-zinc-50 border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:border-white shadow-sm'
                                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                                  }`}
                                >
                                  {labels[method]}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* REGULAR CONTROLS */
                  <div className="space-y-6">
                    {/* POS Order Taking & Checkout Quick Links */}
                    <div className="space-y-2.5 pb-5 border-b border-zinc-100 dark:border-zinc-900">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">POS Operations</span>
                      <Link
                        href={`/captain/order?tableId=${selectedTable.id}`}
                        className="flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 active:scale-[0.98] transition-all text-center select-none"
                      >
                        <ShoppingBag className="w-4 h-4 text-white shrink-0 animate-bounce" />
                        Take Order / Manage Cart
                      </Link>

                      {selectedTable.status !== 'available' && (
                        <button
                          onClick={() => setBillingMode(true)}
                          className="flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-550 dark:text-indigo-400 font-extrabold text-xs active:scale-[0.98] transition-all text-center select-none cursor-pointer"
                        >
                          <Receipt className="w-4 h-4 text-indigo-500 shrink-0" />
                          View Bill & Complete Checkout
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Seating Status</span>
                      
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
                )}
              </div>
            </div>

            {/* Bottom Actions Pane */}
            <div className="pt-4 border-t border-zinc-150 dark:border-zinc-900 shrink-0 flex gap-2">
              {billingMode ? (
                <>
                  <button
                    onClick={() => setBillingMode(false)}
                    disabled={submittingPayment}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-250 bg-background text-foreground hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer select-none disabled:opacity-50"
                  >
                    Back
                  </button>

                  {activeOrders.length > 0 && (
                    <>
                      <button
                        onClick={() => printBill(false)}
                        disabled={submittingPayment || fetchingOrders}
                        className="flex-1 py-2.5 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-background text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer select-none disabled:opacity-50 flex items-center justify-center gap-1.5"
                        title="Print estimate bill"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        Estimate
                      </button>

                      <button
                        onClick={handleCheckout}
                        disabled={submittingPayment || fetchingOrders}
                        className="flex-[2] py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer select-none disabled:opacity-50"
                      >
                        {submittingPayment ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            Finalizing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            Pay & Clear
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setSelectedTable(null)}
                  className="w-full py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 bg-background dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer select-none"
                >
                  Close Controls
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
