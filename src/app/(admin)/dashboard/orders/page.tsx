'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  ClipboardList, 
  RefreshCw, 
  Clock, 
  AlertCircle, 
  X, 
  Loader2, 
  CheckCircle2, 
  Coffee, 
  ChevronRight,
  XCircle,
  UtensilsCrossed,
  Search,
  Check,
  Flame,
  Receipt
} from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  notes: string | null
  price_at_order: number
  menu_items: {
    name: string
  } | null
}

interface Order {
  id: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
  total_amount: number
  created_at: string
  table_id: string
  tables: {
    number: number
  } | null
  order_items: OrderItem[]
}

export default function AdminOrdersPage() {
  const { profile } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active')
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createClient()

  // 1. Fetch Orders from Database with relations
  const fetchOrders = useCallback(async (showSyncState = false) => {
    const restaurantId = profile?.restaurant_id
    if (!restaurantId) return
    if (showSyncState) setSyncing(true)

    const supabaseClient = createClient()

    try {
      const { data, error: fetchErr } = await supabaseClient
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          table_id,
          tables (number),
          order_items (
            id,
            quantity,
            notes,
            price_at_order,
            menu_items (name)
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(150)

      if (fetchErr) throw fetchErr
      setOrders(data as unknown as Order[])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching orders:', err)
      setError(err.message || 'Failed to sync orders pipeline.')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [profile?.restaurant_id])

  // 2. Realtime subscription (scoped to tenant restaurant)
  useEffect(() => {
    const restaurantId = profile?.restaurant_id
    if (!restaurantId) return

    fetchOrders()

    const supabaseClient = createClient()
    const channel = supabaseClient
      .channel(`admin:orders:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload: any) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { data: updatedOrder, error: singleFetchErr } = await supabaseClient
              .from('orders')
              .select(`
                id,
                status,
                total_amount,
                created_at,
                table_id,
                tables (number),
                order_items (
                  id,
                  quantity,
                  notes,
                  price_at_order,
                  menu_items (name)
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (!singleFetchErr && updatedOrder) {
              setOrders((prev) => {
                const exists = prev.some((o) => o.id === updatedOrder.id)
                if (exists) {
                  return prev.map((o) => (o.id === updatedOrder.id ? (updatedOrder as unknown as Order) : o))
                }
                return [updatedOrder as unknown as Order, ...prev]
              })
              setSelectedOrder((prev) => (prev && prev.id === updatedOrder.id ? (updatedOrder as unknown as Order) : prev))
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id))
            setSelectedOrder((prev) => prev && prev.id === payload.old.id ? null : prev)
          }
        }
      )
      .subscribe()

    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [profile?.restaurant_id, fetchOrders])

  // Helper to determine active vs completed vs cancelled
  const isOrderActive = (status: string) => {
    return status === 'pending' || status === 'confirmed' || status === 'preparing' || status === 'ready' || status === 'served'
  }

  // 3. Mutate order status (Cancel or Settle/Complete)
  const handleUpdateStatus = async (orderId: string, newStatus: 'completed' | 'cancelled') => {
    setUpdatingOrderId(orderId)
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    )
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus })
    }

    try {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (updateErr) throw updateErr
      
      // If order was cancelled or completed, check if table has any other active orders
      if (selectedOrder) {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('table_id', selectedOrder.table_id)
          .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'served'])
          
        if (!count || count === 0) {
          await supabase
            .from('tables')
            .update({ status: 'available' })
            .eq('id', selectedOrder.table_id)
        }
      }
    } catch (err: any) {
      console.error('Error changing order status:', err)
      fetchOrders()
      setError(`Failed to update order status: ${err.message}`)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const formatTimeElapsed = (dateString: string) => {
    const diffMs = new Date().getTime() - new Date(dateString).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    return `${diffHours}h ago`
  }

  // Active counts
  const activeOrdersCount = useMemo(() => {
    return orders.filter(o => isOrderActive(o.status)).length
  }, [orders])

  const completedOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'completed').length
  }, [orders])

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status category
      if (statusFilter === 'active' && !isOrderActive(o.status)) return false
      if (statusFilter === 'completed' && o.status !== 'completed') return false
      if (statusFilter === 'cancelled' && o.status !== 'cancelled') return false

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesTable = `t${o.tables?.number || ''}`.includes(q)
        const matchesItem = o.order_items?.some(i => (i.menu_items?.name || '').toLowerCase().includes(q))
        if (!matchesTable && !matchesItem) return false
      }

      return true
    })
  }, [orders, statusFilter, searchQuery])

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse uppercase tracking-wider">
            Loading Live Orders...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-8 animate-in fade-in duration-300">
      
      {/* Header and Live Status Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-background/80 p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Kitchen & Bar Orders
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Streamlined POS Pipeline: Orders are active once fired until completed or cancelled.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrders(true)}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-foreground text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* iOS-Style Filter Segment Controller */}
        <div className="p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center border border-zinc-200/50 dark:border-zinc-800/50 w-full sm:w-auto">
          {[
            { id: 'active', label: `Active (${activeOrdersCount})` },
            { id: 'completed', label: `Completed (${completedOrdersCount})` },
            { id: 'cancelled', label: 'Cancelled' },
            { id: 'all', label: `All (${orders.length})` }
          ].map((tab) => {
            const isActive = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-zinc-800 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table or dish..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-16 text-center space-y-3 bg-background/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <Coffee className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm font-bold text-foreground">No orders in this view</p>
            <p className="text-xs text-muted-foreground">Orders will appear here automatically when fired from Captain or Floor POS.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const active = isOrderActive(order.status)
            const isCompleted = order.status === 'completed'
            const isCancelled = order.status === 'cancelled'
            const itemCount = order.order_items?.reduce((sum, i) => sum + i.quantity, 0) || 0

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-4 rounded-2xl border bg-background text-foreground flex flex-col justify-between transition-all hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer active:scale-[0.99] shadow-xs ${
                  active 
                    ? 'border-indigo-500/30 ring-1 ring-indigo-500/10' 
                    : isCompleted
                    ? 'border-emerald-500/20 opacity-80'
                    : 'border-zinc-200 dark:border-zinc-850 opacity-60'
                }`}
              >
                <div>
                  {/* Top: Table Number + Time + Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                        T{order.tables?.number || '?'}
                      </span>
                      <div>
                        <span className="font-extrabold text-sm block">Table {order.tables?.number || 'N/A'}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeElapsed(order.created_at)}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                      active
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                    }`}>
                      {active ? 'Active / Fired' : isCompleted ? 'Completed' : 'Cancelled'}
                    </span>
                  </div>

                  {/* Order Items Preview */}
                  <div className="my-3 space-y-1.5 py-2 border-y border-zinc-100 dark:border-zinc-800/80">
                    {order.order_items?.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground truncate max-w-[200px]">
                          <span className="text-indigo-600 dark:text-indigo-400 mr-1.5 font-mono">{item.quantity}x</span>
                          {item.menu_items?.name || 'Dish'}
                        </span>
                        <span className="font-mono text-muted-foreground text-[11px]">
                          ₹{(item.price_at_order * item.quantity).toFixed(0)}
                        </span>
                      </div>
                    ))}
                    {(order.order_items?.length || 0) > 3 && (
                      <p className="text-[10px] text-muted-foreground font-semibold pt-0.5">
                        + {(order.order_items?.length || 0) - 3} more items...
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground font-semibold text-[11px]">
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <div className="flex items-center gap-1 font-mono font-black text-sm text-foreground">
                    <span>₹{order.total_amount.toFixed(2)}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-lg bg-background border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            
            {/* Grab handle on mobile */}
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center">
                  T{selectedOrder.tables?.number || '?'}
                </span>
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    Table T{selectedOrder.tables?.number} Details
                  </h3>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Fired {new Date(selectedOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {selectedOrder.order_items?.map((item) => (
                <div key={item.id} className="p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground">
                      <span className="text-indigo-600 dark:text-indigo-400 mr-1.5 font-mono">{item.quantity}x</span>
                      {item.menu_items?.name || 'Dish'}
                    </div>
                    {item.notes && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                        Note: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="font-mono font-bold text-foreground">
                    ₹{(item.price_at_order * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Amount</span>
              <span className="text-base font-black font-mono text-foreground">₹{selectedOrder.total_amount.toFixed(2)}</span>
            </div>

            {/* Actions: Complete or Cancel */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
              {isOrderActive(selectedOrder.status) && (
                <>
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                    disabled={updatingOrderId === selectedOrder.id}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Mark Completed / Settled
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Cancel this entire order ticket?')) {
                        handleUpdateStatus(selectedOrder.id, 'cancelled')
                      }
                    }}
                    disabled={updatingOrderId === selectedOrder.id}
                    className="py-2.5 px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-xs active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
