'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  RefreshCw, 
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  Download,
  Filter,
  Moon
} from 'lucide-react'
import { getBusinessShiftRange, formatBusinessDate } from '@/lib/date-utils'
import { BillReceiptModal, BillDetailData } from '@/components/bill-receipt-modal'

type TimePeriod = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom'

interface LedgerEntry {
  id: string
  orderNumber: number
  tableNumber: number | string
  dateTime: string
  dateStr: string
  amount: number
  subtotal: number
  taxAmount: number
  paymentMethod: string
  status: string
  itemCount: number
}

interface PeriodSummary {
  grossSales: number
  netSales: number
  taxCollected: number
  settledBillsCount: number
  avgTicketSize: number
  cashTotal: number
  upiTotal: number
  cardTotal: number
}

export default function PracticalAnalyticsLedger() {
  const { profile } = useAuth()
  const router = useRouter()

  // Strict Role Guard: Only 'admin' role can view financial sales ledger
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [profile, router])

  // Default to 'today' so data requests and DB IO are minimal on initial load
  const [period, setPeriod] = useState<TimePeriod>('today')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'upi' | 'card'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Calculate Date Boundaries using the Restaurant Business Day Cutoff (5:00 AM)
  const getDateRange = useCallback(() => {
    return getBusinessShiftRange(period, customStartDate, customEndDate)
  }, [period, customStartDate, customEndDate])

  // Fetch Ledger Data
  const fetchLedgerData = useCallback(async (isSilent = false) => {
    const restaurantId = profile?.restaurant_id
    if (!restaurantId) return

    if (!isSilent) setSyncing(true)
    const { startIso, endIso } = getDateRange()

    try {
      // 1. Fetch Orders within date range
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          subtotal,
          tax_amount,
          status,
          payment_method,
          payment_status,
          created_at,
          completed_at,
          tables (number),
          order_items (id)
        `)
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })

      if (ordersErr) throw ordersErr

      // 2. Fetch Payments in parallel to cross-verify methods
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('order_id, amount, method, status, created_at')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startIso)
        .lte('created_at', endIso)

      const paymentMap = new Map<string, any>()
      paymentsData?.forEach((p: any) => {
        if (p.order_id) paymentMap.set(p.order_id, p)
      })

      // Normalize into unified ledger entries
      const entries: LedgerEntry[] = (ordersData || []).map((o: any) => {
        const payment = paymentMap.get(o.id)
        let resolvedMethod = 'cash'

        if (payment?.method) {
          resolvedMethod = payment.method.toLowerCase()
        } else if (o.payment_method && o.payment_method !== 'pending') {
          resolvedMethod = o.payment_method.toLowerCase()
        }

        const amt = Number(o.total_amount) || 0
        const sub = Number(o.subtotal) || (amt / 1.05)
        const tax = Number(o.tax_amount) || (amt - sub)
        const eventTime = o.completed_at || o.created_at

        return {
          id: o.id,
          orderNumber: o.order_number || o.id.slice(0, 4),
          tableNumber: o.tables?.number ?? 'Takeaway',
          dateTime: eventTime,
          dateStr: formatBusinessDate(eventTime),
          amount: amt,
          subtotal: sub,
          taxAmount: tax,
          paymentMethod: resolvedMethod,
          status: o.status === 'completed' || o.payment_status === 'paid' ? 'settled' : 'open',
          itemCount: o.order_items?.length || 0
        }
      })

      setLedgerEntries(entries)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching analytics ledger:', err)
      setError(err.message || 'Failed to sync ledger data.')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }, [profile?.restaurant_id, getDateRange, supabase])

  useEffect(() => {
    fetchLedgerData()
  }, [fetchLedgerData])

  // Filtered Ledger Entries
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter(entry => {
      if (paymentFilter !== 'all' && entry.paymentMethod !== paymentFilter) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesBill = String(entry.orderNumber).includes(q)
        const matchesTable = `t${entry.tableNumber}`.toLowerCase().includes(q)
        if (!matchesBill && !matchesTable) return false
      }
      return true
    })
  }, [ledgerEntries, paymentFilter, searchQuery])

  // Aggregate Metrics for Selected Period
  const summary: PeriodSummary = useMemo(() => {
    let gross = 0
    let net = 0
    let tax = 0
    let settledCount = 0
    let cash = 0
    let upi = 0
    let card = 0

    filteredEntries.forEach(e => {
      gross += e.amount
      net += e.subtotal
      tax += e.taxAmount
      if (e.status === 'settled') settledCount++

      if (e.paymentMethod === 'cash') cash += e.amount
      else if (e.paymentMethod === 'upi') upi += e.amount
      else if (e.paymentMethod === 'card') card += e.amount
      else upi += e.amount // default to digital
    })

    return {
      grossSales: gross,
      netSales: net,
      taxCollected: tax,
      settledBillsCount: filteredEntries.length,
      avgTicketSize: filteredEntries.length > 0 ? gross / filteredEntries.length : 0,
      cashTotal: cash,
      upiTotal: upi,
      cardTotal: card
    }
  }, [filteredEntries])

  // Daily Ledger Breakdown (Group by Day)
  const dailyLedgerGroups = useMemo(() => {
    const map = new Map<string, { dateStr: string; total: number; cash: number; upi: number; card: number; count: number; entries: LedgerEntry[] }>()

    filteredEntries.forEach(entry => {
      const key = entry.dateStr
      if (!map.has(key)) {
        map.set(key, { dateStr: key, total: 0, cash: 0, upi: 0, card: 0, count: 0, entries: [] })
      }
      const group = map.get(key)!
      group.total += entry.amount
      if (entry.paymentMethod === 'cash') group.cash += entry.amount
      else if (entry.paymentMethod === 'card') group.card += entry.amount
      else group.upi += entry.amount
      group.count += 1
      group.entries.push(entry)
    })

    return Array.from(map.values())
  }, [filteredEntries])

  // Quick Export to CSV for Accountant / Management
  const exportToCSV = () => {
    if (filteredEntries.length === 0) return
    const headers = ['Bill Number,Date,Time,Table,Items,Subtotal,Tax (5%),Total Amount,Payment Mode,Status\n']
    const rows = filteredEntries.map(e => {
      const dt = new Date(e.dateTime)
      const date = dt.toLocaleDateString()
      const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `"${e.orderNumber}","${date}","${time}","T${e.tableNumber}","${e.itemCount}","${e.subtotal.toFixed(2)}","${e.taxAmount.toFixed(2)}","${e.amount.toFixed(2)}","${e.paymentMethod.toUpperCase()}","${e.status}"`
    })

    const blob = new Blob([...headers, rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `tipsy_sales_ledger_${period}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // If user is a manager, show access restricted message while router redirects
  if (profile && profile.role !== 'admin') {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <DollarSign className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-black text-zinc-900 dark:text-white">Admin Access Only</h3>
          <p className="text-xs text-zinc-400">Financial Sales Ledger is restricted to restaurant administrators.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-foreground">
      
      {/* ────────────────────────────────────────────────────────
          1. HEADER & PERIOD FILTER STRIP (Mobile Native Sticky Header)
          ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col gap-2.5 sm:gap-3 shadow-xs select-none">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase text-zinc-400 block leading-tight">Financial Ledger</span>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white leading-tight flex items-center gap-1.5">
                Sales Ledger
                {syncing && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] sm:text-[10px] font-bold" title="Business shift runs until 5:00 AM closing">
                <Moon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                5 AM Shift
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Export to CSV */}
            <button
              onClick={exportToCSV}
              disabled={filteredEntries.length === 0}
              className="p-2 sm:px-3 sm:py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 min-h-[38px] active:scale-95"
              title="Download CSV Ledger"
            >
              <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchLedgerData()}
              disabled={syncing}
              className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 active:scale-95 transition-all shadow-xs cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Sync Ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Time Period Filter Pills (Horizontal Touch Swipe on Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1">
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_month', label: 'Last Month' },
            { id: 'custom', label: 'Custom' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id as TimePeriod)}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 min-h-[36px] flex items-center justify-center active:scale-95 ${
                period === p.id
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {/* Custom Date Range Picker (Visible only when 'custom' selected) */}
      {period === 'custom' && (
        <div className="bg-amber-500/5 border-b border-amber-500/20 px-4 sm:px-6 py-2.5 flex items-center gap-3 text-xs select-none">
          <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-500">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-500">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          2. SUMMARY CARDS (ON-POINT FINANCIAL METRICS)
          ──────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 pb-2 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Gross Revenue */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              Total Revenue
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white leading-none">
              ₹{summary.grossSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
              {summary.settledBillsCount} Invoices
            </span>
          </div>

          {/* Net Sales */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              Net Food & Bar Sales
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-zinc-900 dark:text-white leading-none">
              ₹{summary.netSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] font-bold text-zinc-400 block">
              Pre-tax revenue
            </span>
          </div>

          {/* GST Tax Collected */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              GST Collected (5%)
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 leading-none">
              ₹{summary.taxCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] font-bold text-zinc-400 block">
              Government tax ledger
            </span>
          </div>

          {/* Average Order Value */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
              Avg Ticket (AOV)
            </span>
            <p className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 leading-none">
              ₹{summary.avgTicketSize.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[10px] font-bold text-zinc-400 block">
              Per dining table
            </span>
          </div>

        </div>

        {/* Payment Methods Dispersion Bar */}
        <div className="mt-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs select-none">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-zinc-400" />
            <span className="font-black text-zinc-900 dark:text-white">Payment Collections:</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono font-bold">
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <QrCode className="w-3.5 h-3.5" />
              UPI: ₹{summary.upiTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Banknote className="w-3.5 h-3.5" />
              Cash: ₹{summary.cashTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <CreditCard className="w-3.5 h-3.5" />
              Card: ₹{summary.cardTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          3. LEDGER SEARCH & MODE FILTER (Responsive Mobile Wrap)
          ──────────────────────────────────────────────────────── */}
      <div className="px-3 sm:px-6 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
        {/* Method filter */}
        <div className="flex items-center gap-1 p-1 bg-zinc-200/60 dark:bg-zinc-900 rounded-xl overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Modes' },
            { id: 'upi', label: 'UPI' },
            { id: 'cash', label: 'Cash' },
            { id: 'card', label: 'Card' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setPaymentFilter(m.id as any)}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-center min-h-[34px] active:scale-95 ${
                paymentFilter === m.id
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search bill or table (e.g. T4)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 sm:py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[40px] sm:min-h-0"
          />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          4. THE PRACTICAL LEDGER SHEET (Grouped by Day)
          ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          </div>
        ) : dailyLedgerGroups.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <Receipt className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
            <p className="text-sm font-bold text-zinc-500">No transactions recorded for this period</p>
            <p className="text-xs text-zinc-400">Select a different time period or clear search filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dailyLedgerGroups.map(group => (
              <div
                key={group.dateStr}
                className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs"
              >
                {/* Daily Subtotal Header */}
                <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs select-none">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-zinc-900 dark:text-white">{group.dateStr}</span>
                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                      {group.count} Transactions
                    </span>
                  </div>

                  <div className="flex items-center gap-4 font-mono font-black">
                    <span className="text-zinc-500 text-[11px] hidden sm:inline">
                      UPI: ₹{group.upi.toFixed(0)} | Cash: ₹{group.cash.toFixed(0)}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                      Day Total: ₹{group.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Ledger Rows (Touch-friendly 44px+ height on mobile) */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {group.entries.map(entry => (
                    <div
                      key={entry.id}
                      onClick={() => setSelectedBillId(entry.id)}
                      className="px-3 sm:px-4 py-3 sm:py-2.5 flex items-center justify-between hover:bg-amber-50/40 dark:hover:bg-zinc-800/40 transition-colors text-xs cursor-pointer group active:bg-zinc-100 dark:active:bg-zinc-800"
                      title="Click to view detailed itemized check and receipt"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <span className="w-11 sm:w-12 font-mono font-bold text-zinc-400 text-[10px] sm:text-[11px] shrink-0">
                          {new Date(entry.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono font-black text-zinc-900 dark:text-white group-hover:text-amber-600 transition-colors">
                            #{entry.orderNumber}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold text-[10px] shrink-0">
                            T{entry.tableNumber}
                          </span>
                          <span className="text-zinc-400 text-[10px] sm:text-[11px] truncate">
                            ({entry.itemCount} items)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                        <span className={`text-[9px] sm:text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          entry.paymentMethod === 'cash'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : entry.paymentMethod === 'card'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-indigo-500/10 text-indigo-600'
                        }`}>
                          {entry.paymentMethod}
                        </span>

                        <span className="font-mono font-black text-zinc-900 dark:text-white text-right w-16 sm:w-20 text-xs sm:text-sm">
                          ₹{entry.amount.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Itemized Thermal Receipt Drawer */}
      <BillReceiptModal
        billId={selectedBillId}
        onClose={() => setSelectedBillId(null)}
      />

    </div>
  )
}
