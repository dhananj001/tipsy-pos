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

export default function AdminOrdersPage() {
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

  // 2. Realtime optimized subscription
  useEffect(() => {
    if (!profile?.restaurant_id) return

    fetchOrders()

    const channel = supabase
      .channel(`admin:orders:${profile.restaurant_id}`)
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.restaurant_id])

  // 3. Mutate order status directly
  const handleUpdateStatus = async (orderId: string, newStatus: 'preparing' | 'ready' | 'served' | 'cancelled') => {
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
      
      if (newStatus === 'cancelled' && selectedOrder) {
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
      fetchOrders()
      setError(`Failed to transition order status: ${err.message}`)
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
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Syncing Active Kitchen Pipelines...</p>
        </div>
      </div>
    )
  }

  const activeOrdersCount = orders.filter(o => o.status === 'preparing' || o.status === 'ready').length

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header and Live Status Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-500" />
            Live Kitchen Order Board
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Monitor active restaurant KOTs and update kitchen status</p>
        </div>
        
        <button
          onClick={() => fetchOrders(true)}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 bg-background hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          Force Sync Orders
        </button>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview */}
      <div className="flex items-center gap-4 p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-extrabold shadow-sm">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Running Kitchen Orders</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeOrdersCount} KOT orders are currently being prepared or ready for waitservice dispatch.
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
        {(['all', 'preparing', 'ready', 'served'] as const).map((tab) => {
          const count = tab === 'all' 
            ? orders.length 
            : orders.filter(o => o.status === tab).length
            
          const activeStyles = statusFilter === tab
            ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 font-black shadow-sm'
            : 'border border-zinc-200 bg-background text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'

          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap active:scale-95 transition-all cursor-pointer ${activeStyles}`}
            >
              {tab} ({count})
            </button>
          )
        })}
      </div>

      {/* Vertical Orders Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {getFilteredOrders().length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-16 text-center text-muted-foreground border border-dashed border-zinc-200 dark:border-zinc-900 rounded-3xl space-y-3">
            <ClipboardList className="w-10 h-10 opacity-40 text-zinc-400" />
            <p className="text-sm font-semibold">No active orders in this pipeline</p>
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
                className="flex flex-col p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-900/60 bg-background/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 active:scale-[0.98] transition-all text-left cursor-pointer relative overflow-hidden shadow-sm"
              >
                {isUpdating && (
                  <div className="absolute inset-0 bg-background/60 dark:bg-background/40 flex items-center justify-center z-10">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  </div>
                )}

                <div className="flex items-center justify-between w-full pb-3 border-b border-zinc-100 dark:border-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 font-black text-sm text-foreground">
                      T{order.tables?.number || '?'}
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-foreground">Order #{order.id.slice(0, 5).toUpperCase()}</h3>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {formatTimeElapsed(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="py-4 space-y-2 flex-1 w-full">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">Dishes Summary</span>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {order.order_items.slice(0, 3).map((item) => (
                      <div key={item.id} className="text-xs flex justify-between font-medium">
                        <span className="text-zinc-650 dark:text-zinc-400 truncate max-w-[80%]">
                          {item.menu_items?.name || 'Deleted Item'} <span className="text-indigo-500 font-bold">x{item.quantity}</span>
                        </span>
                      </div>
                    ))}
                    {order.order_items.length > 3 && (
                      <p className="text-[10px] text-indigo-500 font-bold mt-1">+ {order.order_items.length - 3} more items...</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between w-full pt-3 border-t border-zinc-100 dark:border-zinc-900 mt-2 text-xs font-bold text-foreground">
                  <span className="text-muted-foreground font-semibold">Total Amount</span>
                  <span className="text-indigo-500 font-black">${order.total_amount.toFixed(2)}</span>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Touch Drawer sheet for detailed order review & state controls */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div 
            className="fixed inset-0 bg-zinc-950/30 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="relative z-10 w-full max-w-md h-full bg-background border-l border-zinc-200 dark:border-zinc-900 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            
            <div className="flex flex-col flex-1 overflow-hidden space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
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

              {/* Scrollable list of dishes */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Items Ordered</span>
                
                {selectedOrder.order_items.map((item) => (
                  <div 
                    key={item.id}
                    className="flex flex-col p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/20 dark:bg-zinc-950/20"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-black text-foreground">{item.menu_items?.name || 'Deleted Dish'}</h4>
                        <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                          Qty: {item.quantity} × ${item.price_at_order.toFixed(2)}
                        </p>
                      </div>
                      <span className="text-xs font-black text-foreground">
                        ${(item.price_at_order * item.quantity).toFixed(2)}
                      </span>
                    </div>

                    {item.notes && (
                      <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-background text-[10px] font-semibold text-amber-500 border border-amber-500/10 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Note: "{item.notes}"</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pricing Summary */}
              <div className="border-t border-zinc-100 dark:border-zinc-900 pt-3 pb-2 shrink-0 flex justify-between items-center px-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total KOT Bill</span>
                <span className="text-lg font-black text-indigo-500">${selectedOrder.total_amount.toFixed(2)}</span>
              </div>

              {/* Status State Transitions */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 space-y-3 shrink-0">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block px-1">Transition Pipeline Status</span>
                
                <div className="grid grid-cols-2 gap-2">
                  
                  {/* Preparing */}
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                    disabled={selectedOrder.status === 'preparing'}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      selectedOrder.status === 'preparing'
                        ? 'border-amber-500/40 bg-amber-500/5 text-amber-650 dark:text-amber-400 font-extrabold opacity-70'
                        : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Preparing
                  </button>

                  {/* Ready */}
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'ready')}
                    disabled={selectedOrder.status === 'ready'}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      selectedOrder.status === 'ready'
                        ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-extrabold opacity-70'
                        : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    Ready
                  </button>

                  {/* Served */}
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'served')}
                    disabled={selectedOrder.status === 'served'}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      selectedOrder.status === 'served'
                        ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-100 text-zinc-400 font-extrabold opacity-70'
                        : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Served
                  </button>

                  {/* Cancel */}
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                    disabled={selectedOrder.status === 'cancelled'}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      selectedOrder.status === 'cancelled'
                        ? 'border-red-500/40 bg-red-500/5 text-red-650 dark:text-red-400 font-extrabold opacity-70'
                        : 'border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-red-500 hover:text-red-650'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel Order
                  </button>

                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-zinc-150 dark:border-zinc-900 shrink-0 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 bg-background dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer"
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
