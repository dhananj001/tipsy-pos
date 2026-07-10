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
  ChevronRight, 
  AlertCircle,
  Loader2,
  ShoppingBag,
  Clock,
  Coins,
  Percent,
  Calculator,
  Plus,
  Minus
} from 'lucide-react'

interface Table {
  id: string
  restaurant_id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'billing'
  created_at: string
  orders?: any[]
}

export default function TablesPage() {
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

  // Dynamic Taxes & Discounts edit state
  const [taxPercent, setTaxPercent] = useState<number>(5) // Default 5% GST
  const [discountPercent, setDiscountPercent] = useState<number>(0) // Default 0%
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(0) // Default 0%

  const supabase = createClient()

  // 1. Fetch tables along with active orders from Supabase in a single trip
  const fetchTables = async (showSyncState = false) => {
    if (!profile?.restaurant_id) return
    if (showSyncState) setSyncing(true)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('tables')
        .select(`
          *,
          orders (
            id,
            status,
            total_amount,
            created_at,
            order_items (
              id,
              menu_item_id,
              quantity,
              price_at_order,
              notes,
              menu_items (
                name,
                price
              )
            )
          )
        `)
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
          .upsert(defaultTables, { onConflict: 'restaurant_id,number' })
          .select(`
            *,
            orders (
              id,
              status,
              total_amount,
              created_at,
              order_items (
                id,
                menu_item_id,
                quantity,
                price_at_order,
                notes,
                menu_items (
                  name,
                  price
                )
              )
            )
          `)

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
            menu_item_id,
            quantity,
            price_at_order,
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

      // Silently update the specific table's orders list in memory
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, orders: data || [] } : t))
      )
    } catch (e) {
      console.error('Error fetching table orders:', e)
    } finally {
      setFetchingOrders(false)
    }
  }

  // Mutation to update item quantity in database directly from billing pane
  const handleUpdateItemQuantity = async (itemName: string, currentQty: number, change: number) => {
    if (!selectedTable) return
    const newQty = currentQty + change
    
    // Find which order_item in activeOrders corresponds to this item name
    let targetItem: any = null
    for (const order of activeOrders) {
      const found = order.order_items?.find((oi: any) => oi.menu_items?.name === itemName)
      if (found) {
        targetItem = { ...found, order_id: order.id }
        break
      }
    }

    if (!targetItem) return

    try {
      if (newQty <= 0) {
        // Delete order item
        const { error: delErr } = await supabase
          .from('order_items')
          .delete()
          .eq('id', targetItem.id)
        if (delErr) throw delErr
      } else {
        // Update quantity
        const { error: updateErr } = await supabase
          .from('order_items')
          .update({ quantity: newQty })
          .eq('id', targetItem.id)
        if (updateErr) throw updateErr
      }

      // Recalculate order total
      const orderId = targetItem.order_id
      const { data: updatedItems, error: itemsErr } = await supabase
        .from('order_items')
        .select('quantity, price_at_order')
        .eq('order_id', orderId)

      if (itemsErr) throw itemsErr

      const newTotal = updatedItems?.reduce((sum, item) => sum + (item.price_at_order * item.quantity), 0) || 0

      // Update orders table
      const { error: orderUpdateErr } = await supabase
        .from('orders')
        .update({ total_amount: newTotal })
        .eq('id', orderId)

      if (orderUpdateErr) throw orderUpdateErr

      // Re-fetch the orders for this table to refresh the subtotal
      await fetchActiveOrders(selectedTable.id)

    } catch (e: any) {
      console.error('Error updating item quantity:', e)
      alert(`Failed to update item quantity: ${e.message}`)
    }
  }

  // Hook to monitor table selection & fetch their sub-orders
  useEffect(() => {
    if (selectedTable && selectedTable.status !== 'available') {
      const runningOrders = selectedTable.orders?.filter(
        (o: any) => o.status !== 'cancelled' && o.status !== 'served'
      ) || []
      setActiveOrders(runningOrders)
      setBillingMode(false)
      setTaxPercent(5)
      setDiscountPercent(0)
      setServiceChargePercent(0)

      // Background revalidation to guarantee latest state
      fetchActiveOrders(selectedTable.id)
    } else {
      setActiveOrders([])
      setBillingMode(false)
      setTaxPercent(5)
      setDiscountPercent(0)
      setServiceChargePercent(0)
    }
  }, [selectedTable])

  // Helper to aggregate running order items for the table bill
  const getAggregatedItems = () => {
    const itemMap = new Map<string, { name: string; quantity: number; price: number }>()
    activeOrders.forEach(order => {
      order.order_items?.forEach((oi: any) => {
        const name = oi.menu_items?.name || 'Unknown Item'
        const price = oi.price_at_order || 0
        const existing = itemMap.get(name)
        if (existing) {
          existing.quantity += oi.quantity
        } else {
          itemMap.set(name, { name, quantity: oi.quantity, price })
        }
      })
    })
    return Array.from(itemMap.values())
  }

  const aggregatedItems = getAggregatedItems()
  const subtotal = aggregatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  // Dynamic Calculations
  const discountAmount = subtotal * (discountPercent / 100)
  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxAmount = taxableAmount * (taxPercent / 100)
  const serviceChargeAmount = subtotal * (serviceChargePercent / 100)
  const grandTotal = taxableAmount + taxAmount + serviceChargeAmount

  // Calculate elapsed duration of table occupation
  const getTableOccupiedDuration = (table: Table) => {
    const activeOrdersList = table.orders?.filter(o => o.status !== 'cancelled' && o.status !== 'served') || []
    if (activeOrdersList.length === 0) return null
    const oldestTime = activeOrdersList.reduce((oldest, o) => {
      const time = new Date(o.created_at).getTime()
      return time < oldest ? time : oldest
    }, Infinity)
    if (oldestTime === Infinity) return null
    
    const diffMs = Date.now() - oldestTime
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins >= 60) {
      return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`
    }
    return `${diffMins}m`
  }

  // Schedule a print job for customer receipt
  const printBill = async (isPaid: boolean, orderId?: string) => {
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
        captainName: profile.name || 'Captain',
        invoiceNumber: `INV-${orderId ? orderId.substring(0, 5).toUpperCase() : Math.floor(100000 + Math.random() * 900000).toString()}`,
        timestamp: new Date().toISOString(),
        items: aggregatedItems,
        subtotal,
        taxPercent,
        taxAmount,
        discountPercent,
        discountAmount,
        serviceChargePercent,
        serviceChargeAmount,
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
      alert('Invoice print scheduled successfully!')
    } catch (e: any) {
      console.error('Failed to schedule print bill job:', e)
      alert(`Print Failed: ${e.message || e}`)
    }
  }

  // Finalize table checkout & payment cashout
  const handleCheckout = async () => {
    if (!profile?.restaurant_id || !selectedTable || activeOrders.length === 0) return
    setSubmittingPayment(true)
    setError(null)
    
    try {
      const primaryOrderId = activeOrders[0].id
      const orderIds = activeOrders.map(o => o.id)

      // 1. Delete all existing order_items for all orders in activeOrders
      const { error: deleteItemsErr } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds)
      if (deleteItemsErr) throw deleteItemsErr

      // 2. Map aggregatedItems to clean insert payload under primaryOrderId
      const consolidatedItems = aggregatedItems.map(item => {
        let menuItemId = ''
        let notes = ''
        for (const order of activeOrders) {
          const found = order.order_items?.find((oi: any) => oi.menu_items?.name === item.name)
          if (found) {
            menuItemId = found.menu_item_id
            notes = found.notes || ''
            break
          }
        }
        return {
          restaurant_id: profile.restaurant_id,
          order_id: primaryOrderId,
          menu_item_id: menuItemId,
          quantity: item.quantity,
          price_at_order: item.price,
          notes
        }
      }).filter(ci => ci.menu_item_id !== '')

      const { error: insertItemsErr } = await supabase
        .from('order_items')
        .insert(consolidatedItems)
      if (insertItemsErr) throw insertItemsErr

      // 3. Update primaryOrderId's total amount to the final grand total, and status to served
      const { error: updatePrimaryErr } = await supabase
        .from('orders')
        .update({
          total_amount: grandTotal,
          status: 'served'
        })
        .eq('id', primaryOrderId)
      if (updatePrimaryErr) throw updatePrimaryErr

      // 4. Delete the other sub-orders so that they don't clog the database or show up as separate bills
      const otherOrderIds = orderIds.filter(id => id !== primaryOrderId)
      if (otherOrderIds.length > 0) {
        const { error: deleteOrdersErr } = await supabase
          .from('orders')
          .delete()
          .in('id', otherOrderIds)
        if (deleteOrdersErr) throw deleteOrdersErr
      }

      // 5. Create a payment record for primaryOrderId
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

      // 6. Print finalized bill receipt
      await printBill(true, primaryOrderId)

      // 7. Reset table status back to available
      await updateTableStatus(selectedTable.id, 'available')

      // 8. Success cleanup
      setSelectedTable(null)
    } catch (e: any) {
      console.error('Checkout failed:', e)
      setError(`Checkout failed: ${e.message || e}`)
    } finally {
      setSubmittingPayment(false)
    }
  }

  // 3. Realtime sync and load on mount
  useEffect(() => {
    if (!profile?.restaurant_id) return

    fetchTables()

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
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setTables((prev) => {
              if (prev.some((t) => t.id === payload.new.id)) return prev
              return [...prev, payload.new as Table].sort((a, b) => a.number - b.number)
            })
          } else if (payload.eventType === 'UPDATE') {
            setTables((prev) =>
              prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t))
            )
            setSelectedTable((prev) => 
              prev && prev.id === payload.new.id ? { ...prev, ...payload.new } : prev
            )
          } else if (payload.eventType === 'DELETE') {
            setTables((prev) => prev.filter((t) => t.id !== payload.old.id))
            setSelectedTable((prev) => prev && prev.id === payload.old.id ? null : prev)
          }
        }
      )
      .subscribe()

    const ordersChannel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${profile.restaurant_id}`,
        },
        () => {
          fetchTables(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(ordersChannel)
    }
  }, [profile?.restaurant_id])

  // 4. Update table status mutation
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
      console.error('Error updating table:', err)
      fetchTables()
      setError(`Failed to update table status: ${err.message}`)
    } finally {
      setUpdatingTableId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-9 h-9 text-amber-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Loading Tables Grid...</p>
        </div>
      </div>
    )
  }

  const availableCount = tables.filter((t) => t.status === 'available').length
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length
  const billingCount = tables.filter((t) => t.status === 'billing').length
  const occupancyRate = tables.length > 0 ? Math.round(((occupiedCount + billingCount) / tables.length) * 100) : 0

  return (
    <div className="space-y-4 animate-in fade-in duration-300 relative pb-10">
      
      {/* Header and Live Status Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground">Tables Terminal</h2>
          <p className="text-[10px] text-muted-foreground">Tap a table card to seat guests, manage cart, or check out</p>
        </div>
        
        <button
          onClick={() => fetchTables(true)}
          disabled={syncing}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-background text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 active:scale-95 transition-all disabled:opacity-50"
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

      {/* Visual Occupancy Stats Header */}
      <div className="p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-850/50 space-y-3">
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <span>Dining Occupancy</span>
          <span className="text-amber-500 dark:text-amber-400 font-extrabold">{occupancyRate}% Busy</span>
        </div>
        <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-500 rounded-full" 
            style={{ width: `${occupancyRate}%` }} 
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center pt-1.5 border-t border-zinc-200/30 dark:border-zinc-800/30">
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-[10px] font-extrabold text-foreground">{availableCount}</span>
            </div>
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Available</span>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-[10px] font-extrabold text-foreground">{occupiedCount}</span>
            </div>
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Occupied</span>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-[10px] font-extrabold text-foreground">{billingCount}</span>
            </div>
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Billing</span>
          </div>
        </div>
      </div>

      {/* Grid of Table Cards */}
      <div className="grid grid-cols-3 gap-3">
        {tables.map((table) => {
          const statusStyles = {
            available: 'bg-green-500/[0.03] border-green-500/25 text-green-700 dark:text-green-400 hover:bg-green-500/10 hover:border-green-500/40 shadow-sm shadow-green-500/5',
            occupied: 'bg-amber-500/[0.03] border-amber-500/25 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/40 shadow-sm shadow-amber-500/5',
            billing: 'bg-blue-500/[0.03] border-blue-500/25 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/40 shadow-sm shadow-blue-500/5',
          }[table.status]

          const dotColors = {
            available: 'bg-green-500',
            occupied: 'bg-amber-500 animate-ping',
            billing: 'bg-blue-500 animate-pulse',
          }[table.status]

          const tableOrders = table.orders?.filter(
            (o: any) => o.status !== 'cancelled' && o.status !== 'served'
          ) || []
          const runningTotal = tableOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0)
          const itemsCount = tableOrders.reduce((sum: number, o: any) => {
            return sum + (o.order_items?.reduce((s: number, item: any) => s + item.quantity, 0) || 0)
          }, 0)

          const isUpdating = updatingTableId === table.id
          const occupiedTime = getTableOccupiedDuration(table)

          return (
            <button
              key={table.id}
              onClick={() => setSelectedTable(table)}
              disabled={isUpdating}
              className={`flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.96] text-left h-28 relative overflow-hidden bg-background ${statusStyles}`}
            >
              {isUpdating ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Top Row: Table Name & Capacity */}
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <span className="text-[7.5px] font-black tracking-widest text-muted-foreground uppercase opacity-80 block">Table</span>
                      <span className="text-lg font-black tracking-tight leading-none text-foreground">T{table.number}</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-[8.5px] font-bold text-muted-foreground">
                      <Users className="w-2.5 h-2.5" />
                      <span>{table.capacity}</span>
                    </div>
                  </div>

                  {/* Middle Row: Active Status Indicator / Time Elapsed */}
                  <div className="w-full flex items-center gap-1.5 my-1">
                    <span className="relative flex h-2 w-2 shrink-0">
                      {table.status === 'occupied' && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors}`}></span>
                    </span>
                    <span className="text-[8.5px] font-extrabold uppercase tracking-wider text-muted-foreground truncate max-w-[65px]">
                      {table.status}
                    </span>
                    {occupiedTime && (
                      <span className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5 ml-auto">
                        <Clock className="w-2 h-2" />
                        {occupiedTime}
                      </span>
                    )}
                  </div>

                  {/* Bottom Row: Bill summary if occupied */}
                  <div className="w-full flex items-end justify-between border-t border-zinc-200/20 pt-1">
                    {runningTotal > 0 ? (
                      <>
                        <span className="text-[8px] font-bold text-zinc-400 truncate max-w-[45px]">{itemsCount} items</span>
                        <span className="text-[10px] font-black text-foreground">₹{runningTotal.toFixed(0)}</span>
                      </>
                    ) : (
                      <span className="text-[8px] font-bold text-zinc-400/80 italic">Empty</span>
                    )}
                  </div>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Drawer / Bottom Sheet Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedTable(null)}
          />
          
          {/* Sheet Body */}
          <div className="relative z-10 w-full max-w-md bg-background border border-zinc-250 dark:border-zinc-900 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-250 flex flex-col max-h-[90vh]">
            
            {/* Grab handle */}
            <div className="h-1.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 sm:hidden shrink-0" />

            {/* Title / Details Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-150 dark:border-zinc-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-black text-base shadow-sm">
                  T{selectedTable.number}
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    {billingMode ? `Billing Invoice T${selectedTable.number}` : `Table T${selectedTable.number} Actions`}
                  </h3>
                  <p className="text-[9.5px] text-muted-foreground flex items-center gap-1 mt-0.5 font-bold">
                    <Users className="w-3 h-3 text-amber-500" />
                    Capacity: {selectedTable.capacity} Guests • <span className="capitalize text-amber-500">{selectedTable.status}</span>
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

            {/* Scrollable Content Pane */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-0.5">
              {billingMode ? (
                /* BILLING & INVOICE CHECKOUT INTERFACE */
                <div className="space-y-4.5">
                  
                  {fetchingOrders ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                      <p className="text-[10px] text-muted-foreground font-bold">Compiling bill details...</p>
                    </div>
                  ) : activeOrders.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-amber-500 opacity-60" />
                      <p className="text-xs font-bold">No running orders found</p>
                      <p className="text-[10px] text-muted-foreground max-w-xs px-4">There are no active orders on this table to bill.</p>
                    </div>
                  ) : (
                    <>
                      {/* running order list */}
                      <div>
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-2 px-1">Aggregated Dishes</span>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {aggregatedItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 rounded-xl border border-zinc-150 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-950/20 text-xs">
                              <div className="font-bold flex items-center gap-1.5">
                                <span className="text-foreground">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {/* Qty Adjusters */}
                                <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg px-1 text-foreground font-black text-[11px] h-6">
                                  <button
                                    onClick={() => handleUpdateItemQuantity(item.name, item.quantity, -1)}
                                    className="flex items-center justify-center w-5 h-5 hover:opacity-75 active:scale-75 transition-all cursor-pointer"
                                  >
                                    <Minus className="w-2.5 h-2.5 text-muted-foreground" />
                                  </button>
                                  
                                  <span className="w-5 text-center text-[10px] font-bold tabular-nums">
                                    {item.quantity}
                                  </span>

                                  <button
                                    onClick={() => handleUpdateItemQuantity(item.name, item.quantity, 1)}
                                    className="flex items-center justify-center w-5 h-5 hover:opacity-75 active:scale-75 transition-all cursor-pointer"
                                  >
                                    <Plus className="w-2.5 h-2.5 text-muted-foreground" />
                                  </button>
                                </div>

                                <div className="font-black text-foreground w-16 text-right">
                                  ₹{(item.price * item.quantity).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* TAXES & CHARGES ADJUSTMENTS PANEL */}
                      <div className="p-3.5 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-850/50 space-y-3">
                        <div className="flex items-center gap-1.5 text-[9.5px] font-black text-foreground uppercase tracking-wider">
                          <Percent className="w-3.5 h-3.5 text-amber-500" />
                          <span>Adjust Taxes & Discounts</span>
                        </div>

                        {/* Discount Adjuster */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                            <span>Discount %</span>
                            <span className="text-foreground font-black text-xs">{discountPercent}% (₹{discountAmount.toFixed(1)})</span>
                          </div>
                          <div className="flex gap-1">
                            {[0, 5, 10, 15, 20].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setDiscountPercent(val)}
                                className={`flex-1 py-1 rounded-lg text-[9.5px] font-extrabold border transition-all ${
                                  discountPercent === val 
                                    ? 'bg-zinc-900 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 dark:border-white'
                                    : 'border-zinc-250/50 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-background'
                                }`}
                              >
                                {val}%
                              </button>
                            ))}
                            <div className="flex items-center border border-zinc-250/55 dark:border-zinc-800 rounded-lg overflow-hidden h-6 ml-1 bg-background select-none">
                              <button 
                                onClick={() => setDiscountPercent(p => Math.max(0, p - 1))}
                                className="px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 h-full text-foreground active:scale-75 transition-all"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                onClick={() => setDiscountPercent(p => Math.min(100, p + 1))}
                                className="px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 h-full text-foreground active:scale-75 transition-all"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* GST/Tax Adjuster */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                            <span>GST / Tax %</span>
                            <span className="text-foreground font-black text-xs">{taxPercent}% (₹{taxAmount.toFixed(1)})</span>
                          </div>
                          <div className="flex gap-1">
                            {[0, 5, 12, 18, 28].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setTaxPercent(val)}
                                className={`flex-1 py-1 rounded-lg text-[9.5px] font-extrabold border transition-all ${
                                  taxPercent === val 
                                    ? 'bg-zinc-900 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 dark:border-white'
                                    : 'border-zinc-250/50 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-background'
                                }`}
                              >
                                {val}%
                              </button>
                            ))}
                            <div className="flex items-center border border-zinc-250/55 dark:border-zinc-800 rounded-lg overflow-hidden h-6 ml-1 bg-background select-none">
                              <button 
                                onClick={() => setTaxPercent(p => Math.max(0, p - 1))}
                                className="px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 h-full text-foreground active:scale-75 transition-all"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                onClick={() => setTaxPercent(p => Math.min(100, p + 1))}
                                className="px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 h-full text-foreground active:scale-75 transition-all"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Service Charge Adjuster */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                            <span>Service Charge %</span>
                            <span className="text-foreground font-black text-xs">{serviceChargePercent}% (₹{serviceChargeAmount.toFixed(1)})</span>
                          </div>
                          <div className="flex gap-1">
                            {[0, 5, 10].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setServiceChargePercent(val)}
                                className={`px-4.5 py-1 rounded-lg text-[9.5px] font-extrabold border transition-all ${
                                  serviceChargePercent === val 
                                    ? 'bg-zinc-900 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-950 dark:border-white'
                                    : 'border-zinc-250/50 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 bg-background'
                                }`}
                              >
                                {val}%
                              </button>
                            ))}
                            <div className="flex items-center border border-zinc-250/55 dark:border-zinc-800 rounded-lg overflow-hidden h-6 ml-1 bg-background select-none">
                              <button 
                                onClick={() => setServiceChargePercent(p => Math.max(0, p - 1))}
                                className="px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 h-full text-foreground active:scale-75 transition-all"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                onClick={() => setServiceChargePercent(p => Math.min(100, p + 1))}
                                className="px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 h-full text-foreground active:scale-75 transition-all"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Calculations Panel */}
                      <div className="border-t border-zinc-150 dark:border-zinc-900 pt-3 space-y-2">
                        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground px-1">
                          <span>Subtotal</span>
                          <span className="font-bold text-foreground">₹{subtotal.toFixed(2)}</span>
                        </div>
                        {discountPercent > 0 && (
                          <div className="flex justify-between text-[11px] font-semibold text-rose-500 px-1">
                            <span>Discount ({discountPercent}%)</span>
                            <span className="font-bold">-₹{discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] font-semibold text-muted-foreground px-1">
                          <span>GST Tax ({taxPercent}%)</span>
                          <span className="font-bold text-foreground">₹{taxAmount.toFixed(2)}</span>
                        </div>
                        {serviceChargePercent > 0 && (
                          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground px-1">
                            <span>Service Charge ({serviceChargePercent}%)</span>
                            <span className="font-bold text-foreground">₹{serviceChargeAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs font-black text-foreground pt-1.5 px-1 border-t border-dashed border-zinc-200 dark:border-zinc-900">
                          <span className="uppercase tracking-wider">Grand Total</span>
                          <span className="text-sm font-black text-amber-500">₹{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payment Methods Selector */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block px-1">Payment Method</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['upi', 'cash', 'card'] as const).map((method) => {
                            const labels = { upi: '📱 UPI', cash: '💵 Cash', card: '💳 Card' }
                            const isSelected = paymentMethod === method
                            return (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setPaymentMethod(method)}
                                className={`py-2.5 px-2 rounded-xl text-[11px] font-extrabold active:scale-95 transition-all text-center border cursor-pointer ${
                                  isSelected 
                                    ? 'bg-zinc-900 text-zinc-50 border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:border-white shadow-sm shadow-zinc-950/10'
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
                /* REGULAR TABLE CONTROLS */
                <div className="space-y-4">
                  <div className="pb-3.5 border-b border-zinc-150 dark:border-zinc-900/60 space-y-2.5 shrink-0">
                    <Link
                      href={`/captain/order?tableId=${selectedTable.id}`}
                      className="flex w-full items-center justify-center gap-2.5 py-4 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all text-center select-none"
                    >
                      <ShoppingBag className="w-4 h-4 text-white shrink-0 animate-bounce" />
                      Take Order / Manage Cart
                    </Link>

                    {selectedTable.status !== 'available' && (
                      <button
                        onClick={() => setBillingMode(true)}
                        className="flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-500 font-extrabold text-xs active:scale-[0.98] transition-all text-center select-none cursor-pointer"
                      >
                        <Receipt className="w-4 h-4 text-indigo-500 shrink-0" />
                        💰 Adjust Bill & Checkout
                      </button>
                    )}
                  </div>

                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Manually Override Table Status</span>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    
                    {/* 1. Set Available */}
                    <button
                      onClick={() => {
                        updateTableStatus(selectedTable.id, 'available')
                      }}
                      className={`flex w-full items-center justify-between p-3 rounded-xl border text-left active:scale-[0.98] transition-all cursor-pointer ${
                        selectedTable.status === 'available'
                          ? 'border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400 font-bold'
                          : 'border-zinc-200/50 dark:border-zinc-900 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className={`w-5 h-5 ${selectedTable.status === 'available' ? 'text-green-500' : 'text-zinc-400'}`} />
                        <div>
                          <h4 className="text-xs font-bold">Clear & Set Available</h4>
                          <p className="text-[9px] text-muted-foreground mt-0.5">Mark table empty, clean, and open for seating</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    </button>

                    {/* 2. Set Occupied */}
                    <button
                      onClick={() => {
                        updateTableStatus(selectedTable.id, 'occupied')
                      }}
                      className={`flex w-full items-center justify-between p-3 rounded-xl border text-left active:scale-[0.98] transition-all cursor-pointer ${
                        selectedTable.status === 'occupied'
                          ? 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400 font-bold'
                          : 'border-zinc-200/50 dark:border-zinc-900 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Coffee className={`w-5 h-5 ${selectedTable.status === 'occupied' ? 'text-amber-500' : 'text-zinc-400'}`} />
                        <div>
                          <h4 className="text-xs font-bold">Seat Guests & Set Occupied</h4>
                          <p className="text-[9px] text-muted-foreground mt-0.5">Guests seated, orders being composed</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    </button>

                    {/* 3. Set Billing */}
                    <button
                      onClick={() => {
                        updateTableStatus(selectedTable.id, 'billing')
                      }}
                      className={`flex w-full items-center justify-between p-3 rounded-xl border text-left active:scale-[0.98] transition-all cursor-pointer ${
                        selectedTable.status === 'billing'
                          ? 'border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-400 font-bold'
                          : 'border-zinc-200/50 dark:border-zinc-900 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Receipt className={`w-5 h-5 ${selectedTable.status === 'billing' ? 'text-blue-500' : 'text-zinc-400'}`} />
                        <div>
                          <h4 className="text-xs font-bold">Request Bill & Set Billing</h4>
                          <p className="text-[9px] text-muted-foreground mt-0.5">Dining completed, waiting to compile final receipt</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    </button>

                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Pane */}
            <div className="pt-3 border-t border-zinc-150 dark:border-zinc-900 shrink-0 flex gap-2.5">
              {billingMode ? (
                <>
                  <button
                    onClick={() => setBillingMode(false)}
                    disabled={submittingPayment}
                    className="flex-1 py-3.5 rounded-xl border border-zinc-250 bg-background text-foreground hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer select-none disabled:opacity-50"
                  >
                    Back
                  </button>

                  {activeOrders.length > 0 && (
                    <>
                      <button
                        onClick={() => printBill(false)}
                        disabled={submittingPayment || fetchingOrders}
                        className="flex-1 py-3.5 rounded-xl border border-zinc-250 dark:border-zinc-800 bg-background text-foreground hover:bg-zinc-50 dark:border-zinc-900 text-xs font-bold cursor-pointer select-none disabled:opacity-50 flex items-center justify-center gap-1.5"
                        title="Print temporary invoice details"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                        Print Estimate
                      </button>

                      <button
                        onClick={handleCheckout}
                        disabled={submittingPayment || fetchingOrders}
                        className="flex-[2] py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer select-none disabled:opacity-50"
                      >
                        {submittingPayment ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            Finalizing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 text-white" />
                            Pay & Clear Table
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setSelectedTable(null)}
                  className="w-full py-3 rounded-xl border border-zinc-250 bg-background text-foreground hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer select-none active:scale-[0.98] transition-all"
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
