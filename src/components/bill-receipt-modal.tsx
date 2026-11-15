'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Receipt, 
  X, 
  Loader2, 
  Clock, 
  Users, 
  Printer, 
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export interface BillDetailData {
  id: string
  orderNumber: number | string
  tableNumber: number | string
  createdAt: string
  completedAt: string | null
  subtotal: number
  taxAmount: number
  totalAmount: number
  paymentMethod: string
  paymentStatus: string
  status: string
  items?: Array<{
    id: string
    name: string
    quantity: number
    price: number
    notes: string | null
  }>
}

interface BillInspectorProps {
  billId: string | null
  initialData?: BillDetailData | null
  onClose: () => void
  onReprint?: (bill: BillDetailData) => Promise<void>
}

export function BillReceiptModal({
  billId,
  initialData,
  onClose,
  onReprint
}: BillInspectorProps) {
  const [bill, setBill] = useState<BillDetailData | null>(initialData || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reprinting, setReprinting] = useState(false)
  const [reprintMessage, setReprintMessage] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (!billId) {
      setBill(null)
      return
    }

    // If initialData already has items populated, reuse directly (0 IO)
    if (initialData && initialData.id === billId && initialData.items && initialData.items.length > 0) {
      setBill(initialData)
      return
    }

    // Otherwise, lazy-fetch single order with items (Single-row indexed query: 1 IO operation)
    let isCancelled = false
    const fetchBillDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchErr } = await supabase
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
            order_items (
              id,
              quantity,
              unit_price,
              total_price,
              notes,
              menu_items (name)
            )
          `)
          .eq('id', billId)
          .single()

        if (fetchErr) throw fetchErr
        if (isCancelled) return

        const items = (data.order_items || []).map((i: any) => ({
          id: i.id,
          name: i.menu_items?.name || 'Item',
          quantity: i.quantity,
          price: Number(i.unit_price) || 0,
          notes: i.notes
        }))

        setBill({
          id: data.id,
          orderNumber: data.order_number || data.id.slice(0, 4),
          tableNumber: data.tables?.number ?? 'Takeaway',
          createdAt: data.created_at,
          completedAt: data.completed_at,
          subtotal: Number(data.subtotal) || (Number(data.total_amount) / 1.05),
          taxAmount: Number(data.tax_amount) || (Number(data.total_amount) * 0.05),
          totalAmount: Number(data.total_amount) || 0,
          paymentMethod: (data.payment_method || 'CASH').toUpperCase(),
          paymentStatus: (data.payment_status || 'PAID').toUpperCase(),
          status: data.status,
          items
        })
      } catch (err: any) {
        if (!isCancelled) setError(err.message || 'Failed to load bill receipt details.')
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    fetchBillDetail()
    return () => { isCancelled = true }
  }, [billId, initialData, supabase])

  if (!billId) return null

  const handleTriggerReprint = async () => {
    if (!bill || !onReprint) return
    setReprinting(true)
    setReprintMessage(null)
    try {
      await onReprint(bill)
      setReprintMessage('Thermal duplicate sent to printer!')
      setTimeout(() => setReprintMessage(null), 3000)
    } catch (e: any) {
      alert(`Reprint failed: ${e.message}`)
    } finally {
      setReprinting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:justify-end animate-in fade-in duration-150 select-none">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Thermal Receipt Drawer: Bottom Sheet on Mobile, Right Panel on Desktop */}
      <aside className="relative z-10 w-full sm:w-96 max-h-[90vh] sm:max-h-full sm:h-full bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-zinc-200/80 dark:border-zinc-800 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
        
        {/* Mobile Swipe Handle Indicator */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Drawer Header */}
        <div className="px-4 py-3 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-black text-sm flex items-center justify-center">
              T{bill ? bill.tableNumber : '?'}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-400 block tracking-wider leading-none">Receipt Inspector</span>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white font-mono mt-1">
                Bill #{bill ? bill.orderNumber : '...'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 sm:p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center active:scale-95"
            aria-label="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Fetching receipt lines...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : bill ? (
            <>
              {reprintMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {reprintMessage}
                </div>
              )}

              {/* Check Header Meta */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-2 border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold">Dining Table</span>
                  <span className="font-black text-zinc-800 dark:text-zinc-200">Table T{bill.tableNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold">Service Time</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(bill.createdAt).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold">Payment Method</span>
                  <span className="font-black uppercase text-indigo-600 dark:text-indigo-400">
                    {bill.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-bold">Status</span>
                  <span className="font-black uppercase text-emerald-600 dark:text-emerald-400">
                    {bill.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Itemized Thermal Breakdown */}
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-400 block mb-2 tracking-wider">
                  Itemized Order Breakdown ({bill.items?.length || 0})
                </span>
                
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                  {bill.items && bill.items.length > 0 ? (
                    bill.items.map(item => (
                      <div key={item.id} className="p-2.5 flex items-start justify-between text-xs bg-white dark:bg-zinc-900/60">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 block leading-tight">
                            {item.name}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {item.quantity} x ₹{item.price.toFixed(0)}
                          </span>
                          {item.notes && (
                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 italic">
                              &ldquo;{item.notes}&rdquo;
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-black text-zinc-900 dark:text-white shrink-0">
                          ₹{(item.price * item.quantity).toFixed(0)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-zinc-400">
                      No order items recorded on this check.
                    </div>
                  )}
                </div>
              </div>

              {/* Tax & Grand Total */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{bill.subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>GST (5%)</span>
                  <span className="font-mono">₹{bill.taxAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-2 text-zinc-900 dark:text-white">
                  <span>Grand Total</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    ₹{bill.totalAmount.toFixed(0)}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions (Reprint Bill) */}
        {bill && onReprint && (
          <div className="p-4 pb-6 sm:pb-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 shrink-0">
            <button
              onClick={handleTriggerReprint}
              disabled={reprinting}
              className="w-full py-3.5 sm:py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-sm sm:text-xs rounded-xl flex items-center justify-center gap-2 active:scale-97 transition-all shadow-md shadow-amber-500/20 cursor-pointer min-h-[44px]"
            >
              {reprinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Reprint Duplicate Thermal Bill
                </>
              )}
            </button>
          </div>
        )}

      </aside>
    </div>
  )
}

