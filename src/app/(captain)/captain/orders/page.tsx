'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, 
  RefreshCw, 
  Clock, 
  AlertCircle, 
  X, 
  Loader2, 
  CheckCircle2, 
  FileText, 
  Printer,
  Search,
  Percent,
  Coins,
  ArrowRight,
  TrendingUp,
  Tag,
  Plus,
  Minus,
  Calendar,
  Layers,
  ChevronRight,
  Filter
} from 'lucide-react'

interface MenuItem {
  name: string
  printer_type: 'kitchen' | 'bar' | 'billing'
}

interface OrderItem {
  id: string
  quantity: number
  notes: string | null
  price_at_order: number
  menu_items: MenuItem | null
}

interface Payment {
  id: string
  amount: number
  method: 'cash' | 'upi' | 'card'
  status: string
}

interface Order {
  id: string
  status: 'preparing' | 'ready' | 'served' | 'cancelled'
  total_amount: number
  created_at: string
  table_id: string
  tables: {
    id: string
    number: number
  } | null
  order_items: OrderItem[]
  payments: Payment[]
}

export default function GroupedBillsHistoryPage() {
  const { profile } = useAuth()
  const [bills, setBills] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Filters & Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'settled'>('all')

  // Drawer / Editing States
  const [selectedBill, setSelectedBill] = useState<Order | null>(null)
  const [savingBill, setSavingBill] = useState(false)

  // Edit Bill States
  const [taxPercent, setTaxPercent] = useState<number>(5)
  const [vatPercent, setVatPercent] = useState<number>(0)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi')

  const supabase = createClient()

  // Start of today helper
  const getStartOfToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }

  // 1. Fetch orders of today
  const fetchBillsHistory = useCallback(async (showSyncState = false) => {
    const restaurantId = profile?.restaurant_id
    if (!restaurantId) return
    if (showSyncState) setSyncing(true)

    try {
      const startOfToday = getStartOfToday()
      const { data, error: fetchErr } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          table_id,
          tables (id, number),
          order_items (
            id,
            quantity,
            notes,
            price_at_order,
            menu_items (name, printer_type)
          ),
          payments (
            id,
            amount,
            method,
            status
          )
        `)
        .eq('restaurant_id', restaurantId)
        .neq('status', 'cancelled')
        .gte('created_at', startOfToday)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setBills(data as unknown as Order[])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching bills history:', err)
      setError(err.message || 'Failed to sync billing logs.')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [profile?.restaurant_id])

  // Real-time Supabase listeners
  useEffect(() => {
    const restaurantId = profile?.restaurant_id
    if (!restaurantId) return

    fetchBillsHistory()

    const ordersChan = supabase
      .channel(`grouped_bills_history_orders_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => fetchBillsHistory())
      .subscribe()

    const paymentsChan = supabase
      .channel(`grouped_bills_history_payments_${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `restaurant_id=eq.${restaurantId}` }, () => fetchBillsHistory())
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChan)
      supabase.removeChannel(paymentsChan)
    }
  }, [profile?.restaurant_id, fetchBillsHistory])

  // Populate editor states on selection
  useEffect(() => {
    if (selectedBill) {
      const pm = selectedBill.payments?.[0]
      if (pm) {
        setPaymentMethod(pm.method)
      } else {
        setPaymentMethod('upi')
      }
      setDiscountPercent(0)
      setTaxPercent(5)
      setVatPercent(0)
      setServiceChargePercent(0)
    }
  }, [selectedBill])

  // Aggregate items calculation
  const getAggregatedItems = (order: Order | null) => {
    if (!order) return []
    const itemMap = new Map<string, { name: string; quantity: number; price: number; printer_type?: string }>()
    order.order_items?.forEach((oi) => {
      const name = oi.menu_items?.name || 'Unknown Item'
      const price = oi.price_at_order || 0
      const printer_type = oi.menu_items?.printer_type
      const existing = itemMap.get(name)
      if (existing) {
        existing.quantity += oi.quantity
      } else {
        itemMap.set(name, { name, quantity: oi.quantity, price, printer_type })
      }
    })
    return Array.from(itemMap.values())
  }

  const aggregatedItems = getAggregatedItems(selectedBill)
  const subtotal = aggregatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  const discountAmount = subtotal * (discountPercent / 100)
  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxAmount = taxableAmount * (taxPercent / 100)
  const vatAmount = taxableAmount * (vatPercent / 100)
  const serviceChargeAmount = subtotal * (serviceChargePercent / 100)
  const grandTotal = taxableAmount + taxAmount + vatAmount + serviceChargeAmount

  // Update item quantity directly inside active orders from details pane
  const handleUpdateItemQuantity = async (orderId: string, itemName: string, currentQty: number, change: number) => {
    const newQty = currentQty + change
    if (!selectedBill) return

    const oi = selectedBill.order_items.find(o => o.menu_items?.name === itemName)
    if (!oi) return

    try {
      if (newQty <= 0) {
        const { error } = await supabase
          .from('order_items')
          .delete()
          .eq('id', oi.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('order_items')
          .update({ quantity: newQty })
          .eq('id', oi.id)
        if (error) throw error
      }

      // Re-calculate total order sum
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, price_at_order')
        .eq('order_id', orderId)

      const newSum = items?.reduce((sum: number, i: any) => sum + (i.price_at_order * i.quantity), 0) || 0

      await supabase
        .from('orders')
        .update({ total_amount: newSum })
        .eq('id', orderId)

      // Refresh drawer
      const { data: updatedBill } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          table_id,
          tables (id, number),
          order_items (
            id,
            quantity,
            notes,
            price_at_order,
            menu_items (name, printer_type)
          ),
          payments (
            id,
            amount,
            method,
            status
          )
        `)
        .eq('id', orderId)
        .single()

      if (updatedBill) {
        setSelectedBill(updatedBill as unknown as Order)
      }
      
      fetchBillsHistory()
    } catch (err: any) {
      console.error('Failed to update quantity:', err)
      alert(`Could not update quantity: ${err.message}`)
    }
  }

  // Save changes & print
  const handleSaveAndPrintBill = async () => {
    if (!profile?.restaurant_id || !selectedBill) return
    setSavingBill(true)

    try {
      // 1. Update order total
      const { error: orderErr } = await supabase
        .from('orders')
        .update({ total_amount: grandTotal })
        .eq('id', selectedBill.id)

      if (orderErr) throw orderErr

      // 2. Update payment if settled
      const payment = selectedBill.payments?.[0]
      if (payment) {
        const { error: payErr } = await supabase
          .from('payments')
          .update({ amount: grandTotal, method: paymentMethod })
          .eq('id', payment.id)

        if (payErr) throw payErr
      }

      // 3. Print
      const { data: printers } = await supabase
        .from('printers')
        .select('id, name, type')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('type', 'billing')
        .eq('is_active', true)

      let targetPrinters = printers || []
      if (targetPrinters.length === 0) {
        const { data: fallbacks } = await supabase
          .from('printers')
          .select('id, name, type')
          .eq('restaurant_id', profile.restaurant_id)
          .eq('is_active', true)
        if (fallbacks && fallbacks.length > 0) targetPrinters = [fallbacks[0]]
      }

      if (targetPrinters.length > 0) {
        let restaurantName = 'Tipsy POS'
        let address = ''
        let phone = ''
        const { data: rest } = await supabase
          .from('restaurants')
          .select('name, address, phone')
          .eq('id', profile.restaurant_id)
          .single()
        
        if (rest) {
          restaurantName = rest.name || restaurantName
          address = rest.address || ''
          phone = rest.phone || ''
        }

        const billPayload = {
          type: 'BILL',
          isReprint: true,
          restaurantName,
          restaurantAddress: address,
          restaurantPhone: phone,
          tableName: 'Table',
          tableNumber: String(selectedBill.tables?.number || '?'),
          capacity: selectedBill.tables?.capacity,
          captainName: profile.name || 'Captain',
          invoiceNumber: `INV-${selectedBill.id.substring(0, 5).toUpperCase()}`,
          timestamp: new Date().toISOString(),
          items: aggregatedItems,
          subtotal,
          taxPercent,
          taxAmount,
          vatPercent,
          vatAmount,
          discountPercent,
          discountAmount,
          serviceChargePercent,
          serviceChargeAmount,
          grandTotal,
          paymentMethod: payment ? paymentMethod : 'Pending',
          isPaid: !!payment
        }

        const jobs = targetPrinters.map((p: any) => ({
          restaurant_id: profile.restaurant_id,
          printer_id: p.id,
          payload: billPayload,
          status: 'pending',
          attempts: 0
        }))

        await supabase.from('print_jobs').insert(jobs)
        alert('Updated bill print scheduled successfully!')
      } else {
        alert('Bill saved, but no billing printers were found to dispatch the print job.')
      }

      setSelectedBill(null)
      fetchBillsHistory()
    } catch (e: any) {
      console.error('Failed saving bill:', e)
      alert(`Save error: ${e.message}`)
    } finally {
      setSavingBill(false)
    }
  }

  // Filter bills list for output
  const filteredBills = useMemo(() => {
    let list = bills

    // Status filter
    if (statusFilter === 'active') {
      list = list.filter(b => !b.payments || b.payments.length === 0)
    } else if (statusFilter === 'settled') {
      list = list.filter(b => b.payments && b.payments.length > 0)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(b => {
        const matchesTable = b.tables?.number?.toString().includes(q) || `t${b.tables?.number}`.includes(q)
        const matchesId = b.id.toLowerCase().includes(q)
        const matchesItems = b.order_items.some(item => 
          item.menu_items?.name?.toLowerCase().includes(q)
        )
        return matchesTable || matchesId || matchesItems
      })
    }

    return list
  }, [bills, statusFilter, searchQuery])

  // Group bills by table number
  const groupedBillsByTable = useMemo(() => {
    const map = new Map<number, { tableId: string; tableNumber: number; orderTimeline: Order[] }>()
    
    filteredBills.forEach((bill) => {
      const tNum = bill.tables?.number
      const tId = bill.tables?.id
      if (tNum !== undefined && tId !== undefined) {
        const existing = map.get(tNum)
        if (existing) {
          existing.orderTimeline.push(bill)
        } else {
          map.set(tNum, { tableId: tId, tableNumber: tNum, orderTimeline: [bill] })
        }
      }
    })

    // Sort by Table Number ascending
    const sortedGroups = Array.from(map.values()).sort((a, b) => a.tableNumber - b.tableNumber)
    
    // Sort each table's timeline by time descending (newest first)
    sortedGroups.forEach(g => {
      g.orderTimeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    })

    return sortedGroups
  }, [filteredBills])

  const formatTimeStr = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Loading billing logs timeline...</p>
        </div>
      </div>
    )
  }

  const totalSettledToday = bills.reduce((sum, b) => sum + (b.payments?.[0]?.amount || 0), 0)
  const totalUnpaidToday = bills.reduce((sum, b) => sum + (!b.payments || b.payments.length === 0 ? b.total_amount : 0), 0)

  return (
    <div className="space-y-4 animate-in fade-in duration-300 relative pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-foreground">Billing History Logs</h2>
          <p className="text-[10px] text-muted-foreground">Detailed logs of cleared and active orders grouped by tables</p>
        </div>
        
        <button
          onClick={() => fetchBillsHistory(true)}
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

      {/* Summary Stats Card */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-emerald-500/[0.03] border border-emerald-500/15 rounded-2xl">
          <h4 className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Today's Revenue</h4>
          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{totalSettledToday.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-3 bg-amber-500/[0.03] border border-amber-500/15 rounded-2xl">
          <h4 className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-wider">Unpaid Amount</h4>
          <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-1">₹{totalUnpaidToday.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative shrink-0">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search table, invoice ID or dish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-100/60 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-zinc-400 hover:text-foreground active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status Segment Control */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100/60 dark:bg-zinc-900/50 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl shrink-0">
        {[
          { id: 'all', label: 'All Invoices' },
          { id: 'active', label: 'Active ⏳' },
          { id: 'settled', label: 'Settled 💵' }
        ].map((tab) => {
          const isActive = statusFilter === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`py-1.5 text-[10px] font-extrabold rounded-xl uppercase tracking-wider transition-all active:scale-95 ${
                isActive 
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-black shadow-sm'
                  : 'text-zinc-500 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Grouped Table List */}
      <div className="space-y-4 pt-2">
        {groupedBillsByTable.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border border-dashed border-zinc-200 dark:border-zinc-900 rounded-3xl space-y-2">
            <FileText className="w-8 h-8 opacity-45 animate-pulse" />
            <p className="text-xs font-semibold">No bills logs found matching filters</p>
          </div>
        ) : (
          groupedBillsByTable.map((group) => {
            const runningCount = group.orderTimeline.filter(o => !o.payments || o.payments.length === 0).length
            const clearedCount = group.orderTimeline.length - runningCount

            return (
              <div 
                key={group.tableId} 
                onClick={() => setSelectedBill(group.orderTimeline[0])}
                className="w-full text-left p-4 rounded-3xl border border-zinc-150 dark:border-zinc-900/60 bg-zinc-50/15 dark:bg-zinc-950/10 space-y-3 cursor-pointer transition-all hover:bg-zinc-100/50 dark:hover:bg-zinc-950/30 active:scale-[0.99] block"
              >
                {/* Table Title Section */}
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900/40 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-black text-xs">
                      T{group.tableNumber}
                    </span>
                    <h3 className="text-xs font-black text-foreground">Table T{group.tableNumber} Logs</h3>
                  </div>
                  <span className="text-[8.5px] font-black uppercase text-zinc-400 tracking-wider">
                    {clearedCount > 0 && `${clearedCount} Cleared`}
                    {clearedCount > 0 && runningCount > 0 && ' • '}
                    {runningCount > 0 && `${runningCount} Active`}
                  </span>
                </div>

                {/* List of orders/sessions under this table */}
                <div className="space-y-2.5">
                  {group.orderTimeline.map((bill, index) => {
                    const hasPayment = bill.payments && bill.payments.length > 0
                    const payment = bill.payments?.[0]
                    
                    // Simple description of ordered items
                    const itemsDesc = bill.order_items
                      .map(oi => `${oi.quantity}x ${oi.menu_items?.name || 'Unknown'}`)
                      .join(', ')

                    return (
                      <div
                        key={bill.id}
                        className="flex items-start justify-between py-2 border-b border-zinc-100/40 dark:border-zinc-900/20 last:border-0"
                      >
                        <div className="flex-1 min-w-0 pr-3.5 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-foreground">
                              Order #{group.orderTimeline.length - index} (Inv #{bill.id.slice(0, 5).toUpperCase()})
                            </span>
                            {payment && (
                              <span className="text-[7.5px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">
                                {payment.method}
                              </span>
                            )}
                          </div>
                          
                          {/* Dish details list */}
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                            {itemsDesc || 'No items selected'}
                          </p>

                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-bold">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatTimeStr(bill.created_at)}</span>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1.5 shrink-0 self-center">
                          <span className="text-xs font-black text-foreground">₹{bill.total_amount.toFixed(2)}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            hasPayment 
                              ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' 
                              : 'bg-amber-500/5 text-amber-600 border-amber-500/20'
                          }`}>
                            {hasPayment ? 'Cleared' : 'Unpaid'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bill Editor / Invoice Detail Screen Drawer */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center select-none">
          <div 
            className="fixed inset-0 bg-zinc-950/45 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setSelectedBill(null)}
          />

          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border-t border-zinc-200/60 dark:border-zinc-800 rounded-t-[32px] sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[85vh] flex flex-col">
            <div className="h-1.5 w-12 bg-zinc-250 dark:bg-zinc-800 rounded-full mx-auto mb-4 shrink-0" />

            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-white font-black text-sm shadow-md shadow-orange-500/10">
                  T{selectedBill.tables?.number || '?'}
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                    Adjust Bill Invoice
                  </h3>
                  <p className="text-[9px] text-zinc-400 font-bold mt-0.5">
                    Inv: #{selectedBill.id.slice(0, 8).toUpperCase()} • <span className="capitalize text-orange-500 font-extrabold">{selectedBill.payments && selectedBill.payments.length > 0 ? 'Settled' : 'Active'}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBill(null)}
                className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 dark:hover:text-white dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable pane */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-0.5 scrollbar-none">
              
              {/* Ordered items listing */}
              <div>
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5 shrink-0">
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Aggregated Dishes</span>
                  <span className="text-[9px] font-bold text-zinc-400">{aggregatedItems.length} items</span>
                </div>
                
                <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-none pr-1 mt-2">
                  {aggregatedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10.5px] font-bold text-zinc-800 dark:text-zinc-200">
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-extrabold text-foreground">{item.name}</span>
                        <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">₹{item.price.toFixed(0)} each</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Qty Adjusters (Only editable if active/unpaid) */}
                        {(!selectedBill.payments || selectedBill.payments.length === 0) ? (
                          <div className="flex items-center bg-zinc-150/50 dark:bg-zinc-800 rounded-xl h-6 p-0.5 border border-zinc-200/50 dark:border-zinc-800/80">
                            <button
                              onClick={() => handleUpdateItemQuantity(selectedBill.id, item.name, item.quantity, -1)}
                              className="w-5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-205 transition-colors"
                            >
                              <Minus className="w-2.5 h-2.5 mx-auto" />
                            </button>
                            <span className="w-4 text-center text-[9px] font-black text-foreground">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateItemQuantity(selectedBill.id, item.name, item.quantity, 1)}
                              className="w-5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-205 transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5 mx-auto" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded">
                            {item.quantity}x
                          </span>
                        )}

                        <span className="w-14 text-right font-black font-mono text-foreground">
                          ₹{(item.price * item.quantity).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Adjustments Dropdowns Row */}
              <div className="grid grid-cols-4 gap-2 bg-zinc-50/50 dark:bg-zinc-900/40 p-2.5 rounded-2xl border border-zinc-150 dark:border-zinc-850">
                {/* Discount */}
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">Discount</span>
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full bg-background border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-1.5 py-1 text-[10px] font-bold text-foreground focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {[0, 5, 10, 15, 20].map(val => (
                      <option key={val} value={val}>{val}%</option>
                    ))}
                  </select>
                </div>

                {/* GST */}
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">GST Tax</span>
                  <select
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full bg-background border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-1.5 py-1 text-[10px] font-bold text-foreground focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {[0, 5, 12, 18, 28].map(val => (
                      <option key={val} value={val}>{val}%</option>
                    ))}
                  </select>
                </div>

                {/* VAT */}
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">VAT</span>
                  <select
                    value={vatPercent}
                    onChange={(e) => setVatPercent(Number(e.target.value))}
                    className="w-full bg-background border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-1.5 py-1 text-[10px] font-bold text-foreground focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {[0, 5, 10, 14.5, 20].map(val => (
                      <option key={val} value={val}>{val}%</option>
                    ))}
                  </select>
                </div>

                {/* Service Charge */}
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">S. Charge</span>
                  <select
                    value={serviceChargePercent}
                    onChange={(e) => setServiceChargePercent(Number(e.target.value))}
                    className="w-full bg-background border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-1.5 py-1 text-[10px] font-bold text-foreground focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    {[0, 5, 10].map(val => (
                      <option key={val} value={val}>{val}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checkout Computations Summary */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-850/80 space-y-2 text-[10.5px] font-bold text-zinc-500 dark:text-zinc-400 shadow-inner">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-zinc-900 dark:text-white font-mono font-black">₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-500 font-extrabold">
                    <span>Discount ({discountPercent}%)</span>
                    <span className="font-mono font-black">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({taxPercent}%)</span>
                    <span className="text-zinc-900 dark:text-white font-mono font-black">₹{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {vatAmount > 0 && (
                  <div className="flex justify-between">
                    <span>VAT ({vatPercent}%)</span>
                    <span className="text-zinc-900 dark:text-white font-mono font-black">₹{vatAmount.toFixed(2)}</span>
                  </div>
                )}
                {serviceChargeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge ({serviceChargePercent}%)</span>
                    <span className="text-zinc-900 dark:text-white font-mono font-black">₹{serviceChargeAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-black text-foreground pt-1.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 mt-1">
                  <span className="uppercase tracking-wider">Adjusted Grand Total</span>
                  <span className="text-sm font-black text-amber-500 font-mono">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Used */}
              {selectedBill.payments && selectedBill.payments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block px-1">Payment Method Used</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['upi', 'cash', 'card'] as const).map((method) => {
                      const labels = { upi: '📱 UPI', cash: '💵 Cash', card: '💳 Card' }
                      const isSelected = paymentMethod === method
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2 px-1 rounded-xl text-[10px] font-extrabold active:scale-95 transition-all text-center border cursor-pointer ${
                            isSelected 
                              ? 'bg-zinc-900 text-zinc-50 border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:border-white shadow-sm'
                              : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 bg-background'
                          }`}
                        >
                          {labels[method]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Actions Row */}
            <div className="pt-3.5 border-t border-zinc-150 dark:border-zinc-800 shrink-0 flex gap-2">
              <button
                onClick={() => setSelectedBill(null)}
                disabled={savingBill}
                className="flex-1 py-3 border border-zinc-200 dark:border-zinc-800 bg-background text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl text-xs font-bold cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveAndPrintBill}
                disabled={savingBill}
                className="flex-[2] py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50 text-center"
              >
                {savingBill ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 text-white" />
                    Save & Reprint
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
