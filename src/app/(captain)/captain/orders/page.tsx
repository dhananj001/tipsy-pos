'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, 
  ClipboardList, 
  RefreshCw, 
  Clock, 
  AlertCircle, 
  X, 
  Loader2, 
  CheckCircle2, 
  Coffee, 
  ChevronRight,
  TrendingUp,
  XCircle,
  Play
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
  status: 'preparing' | 'ready' | 'served' | 'cancelled'
  total_amount: number
  created_at: string
  table_id: string
  tables: {
    number: number
  } | null
  order_items: OrderItem[]
}

export default function OrdersPage() {
  const { profile } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'preparing' | 'ready' | 'served'>('all')

  const supabase = createClient()

  // 1. Fetch Orders from Database with relations
  const fetchOrders = async (showSyncState = false) => {
    if (!profile?.restaurant_id) return
    if (showSyncState) setSyncing(true)

    try {
      const { data, error: fetchErr } = await supabase
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
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false })

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
  }

  // 2. Realtime optimized subscription with automatic cleanup
  useEffect(() => {
    if (!profile?.restaurant_id) return

    fetchOrders()

    // Setup real-time order channel
    const channel = supabase
      .channel(`public:orders:${profile.restaurant_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${profile.restaurant_id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch nested relationships for the single inserted/updated row
            const { data: updatedOrder, error: singleFetchErr } = await supabase
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
                const filtered = prev.filter((o) => o.id !== updatedOrder.id)
                return [updatedOrder as unknown as Order, ...filtered].sort(
                  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )
              })
              
              // Sync selected drawer order details in real-time
              setSelectedOrder((prev) => 
                prev && prev.id === updatedOrder.id ? (updatedOrder as unknown as Order) : prev
              )
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id))
            setSelectedOrder((prev) => prev && prev.id === payload.old.id ? null : prev)
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount to avoid duplication/memory leak
    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.restaurant_id])

  // 3. Mutate order status directly
  const handleUpdateStatus = async (orderId: string, newStatus: 'preparing' | 'ready' | 'served' | 'cancelled') => {
    setUpdatingOrderId(orderId)
    
    // Optimistic UI updates
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
      
      // Real-time table release logic (If order is cancelled, set table status available if no other orders)
      if (newStatus === 'cancelled' && selectedOrder) {
        // Query if any other preparing/ready orders exist on this table
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('table_id', selectedOrder.table_id)
          .in('status', ['preparing', 'ready'])
          
        if (!count || count === 0) {
          await supabase
            .from('tables')
            .update({ status: 'available' })
            .eq('id', selectedOrder.table_id)
        }
      }
    } catch (err: any) {
      console.error('Error changing order status:', err)
      fetchOrders() // Rollback state
      setError(`Failed to transition order status: ${err.message}`)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // 4. Utility helpers
  const formatTimeElapsed = (dateString: string) => {
    const diffMs = new Date().getTime() - new Date(dateString).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    return `${diffHours}h ago`
  }

  const getFilteredOrders = () => {
    if (statusFilter === 'all') return orders
    return orders.filter(o => o.status === statusFilter)
  }

  const getStatusColor = (status: 'preparing' | 'ready' | 'served' | 'cancelled') => {
    return {
      preparing: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      ready: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 animate-pulse',
      served: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 border-transparent',
      cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    }[status]
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Syncing Active Kitchen Pipelines...</p>
        </div>
      </div>
    )
  }

  const activeOrdersCount = orders.filter(o => o.status === 'preparing' || o.status === 'ready').length

  return (
    <div className="space-y-4 animate-in fade-in duration-300 relative pb-10">
      
      {/* Header and Live Status Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Orders Board</h2>
          <p className="text-[10px] text-muted-foreground">Monitor running orders and preparation statuses</p>
        </div>
        
        <button
          onClick={() => fetchOrders(true)}
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

      {/* KPI Overview and Horizontal Status Filters */}
      <div className="flex items-center gap-3 p-3 bg-zinc-150/40 dark:bg-zinc-900/30 border border-zinc-200/30 dark:border-zinc-850/40 rounded-2xl">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-extrabold shadow-sm">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-foreground">Running Kitchen Orders</h3>
          <p className="text-[9.5px] text-muted-foreground font-semibold mt-0.5">
            {activeOrdersCount} KOT orders currently preparing or ready for dispatch
          </p>
        </div>
      </div>

      {/* Category Pills Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
        {(['all', 'preparing', 'ready', 'served'] as const).map((tab) => {
          const count = tab === 'all' 
            ? orders.length 
            : orders.filter(o => o.status === tab).length
            
          const activeStyles = statusFilter === tab
            ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 font-black shadow-sm'
            : 'border border-zinc-200/50 dark:border-zinc-800 bg-background text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900'

          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap active:scale-95 transition-all ${activeStyles}`}
            >
              {tab} ({count})
            </button>
          )
        })}
      </div>

      {/* Vertical Orders Feed */}
      <div className="space-y-3">
        {getFilteredOrders().length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border border-dashed border-zinc-200 dark:border-zinc-900 rounded-3xl space-y-2 mt-2">
            <ClipboardList className="w-8 h-8 opacity-45" />
            <p className="text-xs font-semibold">No active orders in this pipeline</p>
          </div>
        ) : (
          getFilteredOrders().map((order) => {
            const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0)
            const isUpdating = updatingOrderId === order.id

            return (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                disabled={isUpdating}
                className="flex w-full items-center justify-between p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-900/60 bg-background/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/10 active:scale-[0.98] transition-all text-left cursor-pointer relative overflow-hidden"
              >
                {isUpdating && (
                  <div className="absolute inset-0 bg-background/60 dark:bg-background/40 flex items-center justify-center z-10">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  </div>
                )}

                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 font-extrabold text-lg text-foreground">
                    T{order.tables?.number || '?'}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-foreground">Order #{order.id.slice(0, 5).toUpperCase()}</h3>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Users className="w-3 h-3" /> {itemCount} Items
                      <span>•</span>
                      <Clock className="w-3 h-3" /> {formatTimeElapsed(order.created_at)}
                    </p>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-xs font-black tracking-tight">${order.total_amount.toFixed(2)}</span>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Touch Drawer sheet for detailed order review & state controls */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          {/* Sheet Body */}
          <div className="relative z-10 w-full max-w-md bg-background border border-zinc-200 dark:border-zinc-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-250 flex flex-col max-h-[80vh]">
            
            {/* Grab handle for touch feel */}
            <div className="h-1.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 sm:hidden shrink-0" />

            {/* Title / Details Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-150 dark:border-zinc-900 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 font-extrabold text-lg">
                  T{selectedOrder.tables?.number || '?'}
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">Order Details</h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    Order #{selectedOrder.id.slice(0, 8).toUpperCase()} 
                    <span>•</span>
                    {formatTimeElapsed(selectedOrder.created_at)}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list of dishes in KOT */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Items Ordered</span>
              
              {selectedOrder.order_items.map((item) => (
                <div 
                  key={item.id}
                  className="flex flex-col p-3 rounded-xl border border-zinc-150 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-950/20"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-black text-foreground">{item.menu_items?.name || 'Deleted Dish'}</h4>
                      <p className="text-[9.5px] font-bold text-muted-foreground mt-0.5">
                        Qty: {item.quantity} × ${item.price_at_order.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-xs font-black text-foreground">
                      ${(item.price_at_order * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  {item.notes && (
                    <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-background text-[10px] font-semibold text-amber-500 border border-amber-500/10 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Note: "{item.notes}"</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="border-t border-zinc-150 dark:border-zinc-900 pt-3 pb-4 shrink-0 flex justify-between items-center px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total KOT Bill</span>
              <span className="text-base font-black text-amber-500">${selectedOrder.total_amount.toFixed(2)}</span>
            </div>

            {/* Quick Status State Transitions actions */}
            <div className="pt-4 border-t border-zinc-150 dark:border-zinc-900 space-y-3 shrink-0">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block px-1">Transition Pipeline Status</span>
              
              <div className="grid grid-cols-2 gap-2">
                
                {/* 1. Mark Preparing / Cook */}
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                  disabled={selectedOrder.status === 'preparing'}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    selectedOrder.status === 'preparing'
                      ? 'border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-extrabold opacity-70'
                      : 'border-zinc-200/60 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  Preparing
                </button>

                {/* 2. Mark Ready (alert captain KOT is ready) */}
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}
                  disabled={selectedOrder.status === 'ready'}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    selectedOrder.status === 'ready'
                      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-extrabold opacity-70'
                      : 'border-zinc-200/60 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  Ready
                </button>

                {/* 3. Mark Served */}
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'served')}
                  disabled={selectedOrder.status === 'served'}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    selectedOrder.status === 'served'
                      ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 text-zinc-400 font-extrabold opacity-70'
                      : 'border-zinc-200/60 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Served
                </button>

                {/* 4. Cancel KOT */}
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                  disabled={selectedOrder.status === 'cancelled'}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    selectedOrder.status === 'cancelled'
                      ? 'border-red-500/40 bg-red-500/5 text-red-600 dark:text-red-400 font-extrabold opacity-70'
                      : 'border-zinc-200/60 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-red-500 hover:text-red-600'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel Order
                </button>

              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 mt-1.5 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 rounded-xl border border-zinc-250 bg-background text-foreground hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
