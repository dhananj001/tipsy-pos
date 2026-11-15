'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  Receipt, 
  RefreshCw, 
  Clock, 
  AlertCircle, 
  X, 
  Loader2, 
  CheckCircle2, 
  Coffee, 
  ChevronRight,
  Search,
  Printer,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  RotateCcw
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
  order_number: number
  status: string
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_method: 'cash' | 'upi' | 'card' | null
  payment_status: string
  created_at: string
  completed_at: string | null
  table_id: string
  tables: {
    number: number
  } | null
  order_items: OrderItem[]
}

interface PrinterItem {
  id: string
  name: string
  type: string
  connection_status: string
}

export default function AdminBillsAndAuditPage() {
  const { profile } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [printers, setPrinters] = useState<PrinterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active' | 'cancelled'>('completed')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today')
  const [reprinting, setReprinting] = useState(false)
  const [reprintSuccess, setReprintSuccess] = useState<string | null>(null)

  const supabase = createClient()

  // 1. Fetch Printers
  const fetchPrinters = useCallback(async () => {
    const restaurantId = profile?.restaurant_id
    if (!restaurantId) return
    const { data } = await supabase
      .from('printers')
      .select('id, name, type, connection_status')
      .eq('restaurant_id', restaurantId)
    if (data) setPrinters(data)
  }, [profile?.restaurant_id, supabase])

  // 2. Fetch Orders for Audit
  const fetchOrders = useCallback(async (showSyncState = false) => {
    const restaurantId = profile?.restaurant_id
    if (!restaurantId) return
    if (showSyncState) setSyncing(true)

    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          subtotal,
          tax_amount,
          total_amount,
          payment_method,
          payment_status,
          created_at,
          completed_at,
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
        .limit(200)

      if (dateFilter === 'today') {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        query = query.gte('created_at', todayStart.toISOString())
      }

      const { data, error: fetchErr } = await query

      if (fetchErr) throw fetchErr
      setOrders(data as unknown as Order[])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching orders audit:', err)
      setError(err.message || 'Failed to sync bill audit logs.')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [profile?.restaurant_id, dateFilter, supabase])

  useEffect(() => {
    fetchOrders()
    fetchPrinters()
  }, [fetchOrders, fetchPrinters])

  // Reprint Bill handler
  const handleReprintBill = async (order: Order) => {
    const restaurantId = profile?.restaurant_id
    if (!restaurantId) return

    setReprinting(true)
    setReprintSuccess(null)

    try {
      const billingPrinter = printers.find(p => p.type === 'billing') || printers[0]
      if (!billingPrinter) {
        alert('No active billing/counter printer configured in system.')
        return
      }

      let restaurantName = 'Tipsy Bar & Eatery'
      const { data: rData } = await supabase.from('restaurants').select('name').eq('id', restaurantId).single()
      if (rData?.name) restaurantName = rData.name

      const billPayload = {
        type: 'BILL',
        isDuplicate: true,
        restaurantName,
        tableName: 'Table',
        tableNumber: String(order.tables?.number || '?'),
        billNumber: `BILL-${order.order_number || order.id.slice(0, 4)}`,
        timestamp: new Date().toISOString(),
        paymentMethod: (order.payment_method || 'CASH').toUpperCase(),
        items: (order.order_items || []).map(i => ({
          name: i.menu_items?.name || 'Item',
          quantity: i.quantity,
          price: Number(i.price_at_order) || 0,
          total: (Number(i.price_at_order) || 0) * i.quantity
        })),
        subtotal: Number(order.subtotal) || Number(order.total_amount) / 1.05,
        tax: Number(order.tax_amount) || Number(order.total_amount) * 0.05,
        total: Number(order.total_amount)
      }

      const { error: printErr } = await supabase.from('print_jobs').insert({
        restaurant_id: restaurantId,
        printer_id: billingPrinter.id,
        payload: billPayload,
        status: 'pending',
        attempts: 0
      })

      if (printErr) throw printErr

      setReprintSuccess(`Duplicate Bill sent to ${billingPrinter.name}!`)
      setTimeout(() => setReprintSuccess(null), 3000)
    } catch (err: any) {
      alert(`Reprint Failed: ${err.message}`)
    } finally {
      setReprinting(false)
    }
  }

  // Active / Settled metrics
  const totalSettledRevenue = useMemo(() => {
    return orders
      .filter(o => o.status === 'completed')
      .reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0)
  }, [orders])

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter === 'completed' && o.status !== 'completed') return false
      if (statusFilter === 'active' && o.status === 'completed') return false
      if (statusFilter === 'cancelled' && o.status !== 'cancelled') return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesTable = `t${o.tables?.number || ''}`.includes(q)
        const matchesBillNo = String(o.order_number).includes(q) || o.id.toLowerCase().includes(q)
        const matchesItem = o.order_items?.some(i => (i.menu_items?.name || '').toLowerCase().includes(q))
        if (!matchesTable && !matchesBillNo && !matchesItem) return false
      }

      return true
    })
  }, [orders, statusFilter, searchQuery])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            Loading Bills & Audit Trail...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-foreground">
      
      {/* ────────────────────────────────────────────────────────
          1. HEADER & REVENUE AUDIT STRIP
          ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs select-none">
        <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-zinc-400 block leading-tight">Financial Records</span>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white leading-tight flex items-center gap-2">
              Bills & Audit Log
              {syncing && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
            </h1>
          </div>

          <div className="hidden sm:block h-7 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto scrollbar-none py-0.5">
            <div className="shrink-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block leading-none">
                {dateFilter === 'today' ? "Today's Revenue" : 'Total Revenue'}
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{totalSettledRevenue.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="shrink-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block leading-none">Bills Settled</span>
              <span className="text-xs sm:text-sm font-black text-zinc-800 dark:text-zinc-200 font-mono">
                {orders.filter(o => o.status === 'completed').length} Bills
              </span>
            </div>
          </div>
        </div>

        {/* Date Filter & Manual Sync */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                dateFilter === 'today'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                dateFilter === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Recent 200
            </button>
          </div>

          <button
            onClick={() => fetchOrders(true)}
            disabled={syncing}
            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white active:scale-95 transition-all shadow-xs cursor-pointer"
            title="Refresh Audit Records"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────
          2. FILTER & SEARCH STRIP
          ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white dark:bg-zinc-900 border-b border-zinc-200/60 dark:border-zinc-800/60 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-none">
          {[
            { id: 'completed', label: 'Settled Bills' },
            { id: 'active', label: 'Active / Open' },
            { id: 'cancelled', label: 'Cancelled' },
            { id: 'all', label: 'All Records' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                statusFilter === f.id
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by Bill #, Table (e.g. T4), or Item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          3. MAIN AUDIT TABLE & RECEIPT DRAWER
          ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Orders / Bills List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filteredOrders.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <Receipt className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm font-bold text-zinc-500">No records found</p>
              <p className="text-xs text-zinc-400">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map(order => {
                const isSelected = selectedOrder?.id === order.id
                const isCompleted = order.status === 'completed'
                const isCancelled = order.status === 'cancelled'

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-500'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : isCancelled
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        T{order.tables?.number || '?'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-zinc-900 dark:text-white font-mono">
                            Bill #{order.order_number || order.id.slice(0, 6)}
                          </span>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : isCancelled
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>•</span>
                          <span>{order.order_items?.length || 0} items</span>
                          {order.payment_method && (
                            <>
                              <span>•</span>
                              <span className="uppercase font-bold text-zinc-600 dark:text-zinc-300">
                                {order.payment_method}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 dark:border-zinc-800">
                      <div className="text-right">
                        <span className="text-xs font-bold text-zinc-400 block sm:hidden">Total Amount</span>
                        <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-white font-mono">
                          ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReprintBill(order)
                        }}
                        disabled={reprinting}
                        className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        title="Reprint Bill to Billing Printer"
                      >
                        <Printer className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="hidden sm:inline">Reprint</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Bill Audit Panel */}
        {selectedOrder && (
          <aside className="w-full sm:w-96 border-l border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex flex-col h-full shadow-lg">
            <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-400 block">Receipt Inspector</span>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white font-mono">
                  Bill #{selectedOrder.order_number || selectedOrder.id.slice(0, 6)}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reprintSuccess && (
              <div className="m-3 p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {reprintSuccess}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-2 border border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-bold">Table</span>
                  <span className="font-black text-zinc-800 dark:text-zinc-200">Table T{selectedOrder.tables?.number || '?'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-bold">Time Created</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-bold">Payment Method</span>
                  <span className="font-black uppercase text-zinc-800 dark:text-zinc-200">
                    {selectedOrder.payment_method || 'CASH'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400 font-bold">Payment Status</span>
                  <span className="font-black uppercase text-emerald-600 dark:text-emerald-400">
                    {selectedOrder.payment_status || 'PAID'}
                  </span>
                </div>
              </div>

              {/* Items breakdown */}
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-400 block mb-2">Itemized Breakdown</span>
                <div className="space-y-2">
                  {selectedOrder.order_items?.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                      <div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {item.menu_items?.name || 'Item'}
                        </span>
                        <span className="text-zinc-400 text-[10px] ml-1.5 font-mono">
                          x{item.quantity}
                        </span>
                        {item.notes && (
                          <span className="block text-[10px] text-zinc-400 italic font-sans">
                            &quot;{item.notes}&quot;
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        ₹{(Number(item.price_at_order) * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{Number(selectedOrder.subtotal || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>GST (5%)</span>
                  <span className="font-mono">₹{Number(selectedOrder.tax_amount || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-2 text-zinc-900 dark:text-white">
                  <span>Grand Total</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{Number(selectedOrder.total_amount || 0).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <button
                onClick={() => handleReprintBill(selectedOrder)}
                disabled={reprinting}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 active:scale-97 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {reprinting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    Reprint Thermal Bill
                  </>
                )}
              </button>
            </div>
          </aside>
        )}
      </div>

    </div>
  )
}
