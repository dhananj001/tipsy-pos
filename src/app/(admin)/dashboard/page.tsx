'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Grid,
  Users,
  Utensils,
  RefreshCw,
  Receipt,
  Printer,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Coffee,
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Flame,
  Check,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Search,
  Send,
  Edit2,
  Sparkles,
  ChevronDown,
  Settings,
  PlusCircle
} from 'lucide-react'

interface TableData {
  id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'billing'
}

interface MenuItemData {
  id: string
  name: string
  price: number
  category_id: string
  printer_type: string
  is_veg: boolean
}

interface CategoryData {
  id: string
  name: string
  sort_order: number
}

interface OrderItemData {
  id: string
  order_id: string
  quantity: number
  unit_price: number
  total_price: number
  notes: string | null
  menu_item_id: string | null
  menu_items: {
    name: string
    printer_type: string
  } | null
}

interface OrderData {
  id: string
  table_id: string
  order_number: number | null
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled'
  subtotal: number
  tax_amount: number
  total_amount: number
  payment_status: string
  created_at: string
  order_items: OrderItemData[]
}

interface PrinterData {
  id: string
  name: string
  type: string
  connection_status: string
  is_active: boolean
}

interface PrintJobData {
  id: string
  status: 'pending' | 'processing' | 'printed' | 'failed'
  created_at: string
  payload: any
  printers: {
    name: string
    type: string
  } | null
}

export default function OperationalFloorDashboard() {
  const { profile } = useAuth()
  const supabase = createClient()

  // Core Data
  const [tables, setTables] = useState<TableData[]>([])
  const [activeOrders, setActiveOrders] = useState<OrderData[]>([])
  const [printers, setPrinters] = useState<PrinterData[]>([])
  const [recentPrintJobs, setRecentPrintJobs] = useState<PrintJobData[]>([])
  const [todaySalesTotal, setTodaySalesTotal] = useState<number>(0)
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([])

  // Loading States
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null)
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null)

  // Interactive UI Selection
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [filterSection, setFilterSection] = useState<'all' | 'occupied' | 'available' | 'billing'>('all')

  // In-line POS Menu Modal (For directly adding items to the selected table without switching views)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [modalCart, setModalCart] = useState<Array<{ item: MenuItemData; quantity: number; notes: string }>>([])
  const [sendingKOT, setSendingKOT] = useState(false)

  // In-line Editing of existing items
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingNotesText, setEditingNotesText] = useState('')

  // Table Management Modals (Floor-level Add / Edit)
  const [isAddTableOpen, setIsAddTableOpen] = useState(false)
  const [newTableNumber, setNewTableNumber] = useState<string>('')
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4)
  const [tableModalSaving, setTableModalSaving] = useState(false)

  const [editingTable, setEditingTable] = useState<TableData | null>(null)
  const [editTableCapacity, setEditTableCapacity] = useState<number>(4)

  // 1. Fetch live data
  const loadDashboardData = useCallback(async (isSilent = false) => {
    const restaurantId = profile?.restaurant_id
    if (!restaurantId) return

    if (!isSilent) setRefreshing(true)

    try {
      // A. Tables
      const { data: tablesData } = await supabase
        .from('tables')
        .select('id, number, capacity, status')
        .eq('restaurant_id', restaurantId)
        .order('number', { ascending: true })

      if (tablesData) {
        setTables(tablesData)
        setSelectedTableId(prev => {
          if (prev) return prev
          const firstOccupied = (tablesData as any[]).find((t: any) => t.status === 'occupied' || t.status === 'billing')
          return firstOccupied ? firstOccupied.id : (tablesData[0]?.id || null)
        })
      }

      // B. Active Non-completed Orders with items
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id,
          table_id,
          order_number,
          status,
          subtotal,
          tax_amount,
          total_amount,
          payment_status,
          created_at,
          order_items (
            id,
            order_id,
            quantity,
            unit_price,
            total_price,
            notes,
            menu_item_id,
            menu_items (
              name,
              printer_type
            )
          )
        `)
        .eq('restaurant_id', restaurantId)
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false })

      if (ordersData) {
        setActiveOrders(ordersData as unknown as OrderData[])
      }

      // C. Active Printers
      const { data: printersData } = await supabase
        .from('printers')
        .select('id, name, type, connection_status, is_active')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)

      if (printersData) {
        setPrinters(printersData)
      }

      // D. Recent Print Jobs
      const { data: jobsData } = await supabase
        .from('print_jobs')
        .select(`
          id,
          status,
          created_at,
          payload,
          printers (
            name,
            type
          )
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(6)

      if (jobsData) {
        setRecentPrintJobs(jobsData as unknown as PrintJobData[])
      }

      // E. Today's Completed Sales Total
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const { data: completedSales } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'completed')
        .gte('created_at', startOfDay.toISOString())

      if (completedSales) {
        const total = (completedSales as any[]).reduce((acc: number, curr: any) => acc + Number(curr.total_amount || 0), 0)
        setTodaySalesTotal(total)
      }

    } catch (err) {
      console.error('Error fetching operational dashboard data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [profile?.restaurant_id, supabase])

  // 2. Fetch Menu & Categories once for in-line ordering modal
  useEffect(() => {
    const fetchMenu = async () => {
      const restaurantId = profile?.restaurant_id
      if (!restaurantId) return

      try {
        const { data: catData } = await supabase
          .from('menu_categories')
          .select('id, name, sort_order')
          .eq('restaurant_id', restaurantId)
          .order('sort_order', { ascending: true })

        if (catData) setCategories(catData)

        const { data: itemData } = await supabase
          .from('menu_items')
          .select('id, name, price, category_id, printer_type, is_veg')
          .eq('restaurant_id', restaurantId)
          .eq('is_available', true)
          .order('name', { ascending: true })

        if (itemData) setMenuItems(itemData)
      } catch (e) {
        console.error('Failed to load menu for inline POS modal:', e)
      }
    }

    fetchMenu()
  }, [profile?.restaurant_id, supabase])

  // Initial load & Polling + Realtime
  useEffect(() => {
    loadDashboardData()

    // Realtime subscriptions handle instant updates. 
    // We debounce updates so that multiple simultaneous changes (e.g. order + 5 order_items)
    // coalesce into exactly ONE query execution rather than 6 rapid queries.
    let debounceTimer: NodeJS.Timeout | null = null
    const debouncedReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        loadDashboardData(true)
      }, 350)
    }

    if (profile?.restaurant_id) {
      const channel = supabase
        .channel(`dashboard_realtime_ops_${profile.restaurant_id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${profile.restaurant_id}` }, debouncedReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `restaurant_id=eq.${profile.restaurant_id}` }, debouncedReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${profile.restaurant_id}` }, debouncedReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'print_jobs', filter: `restaurant_id=eq.${profile.restaurant_id}` }, debouncedReload)
        .subscribe()

      return () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        supabase.removeChannel(channel)
      }
    }
  }, [loadDashboardData, profile?.restaurant_id, supabase])

  // --- Computations ---
  const occupiedTables = useMemo(() => tables.filter(t => t.status === 'occupied' || t.status === 'billing'), [tables])
  const billingTables = useMemo(() => tables.filter(t => t.status === 'billing'), [tables])
  const availableTables = useMemo(() => tables.filter(t => t.status === 'available'), [tables])

  const selectedTable = useMemo(() => tables.find(t => t.id === selectedTableId), [tables, selectedTableId])
  const selectedTableOrders = useMemo(() => activeOrders.filter(o => o.table_id === selectedTableId), [activeOrders, selectedTableId])

  const allItemsOnSelectedTable = useMemo(() => {
    const list: Array<OrderItemData & { orderNumber: number | null }> = []
    selectedTableOrders.forEach(ord => {
      if (ord.order_items && Array.isArray(ord.order_items)) {
        ord.order_items.forEach(item => {
          list.push({ ...item, orderNumber: ord.order_number })
        })
      }
    })
    return list
  }, [selectedTableOrders])

  const selectedTableSubtotal = useMemo(() => {
    if (allItemsOnSelectedTable.length === 0) return 0
    return allItemsOnSelectedTable.reduce((sum, item) => sum + (Number(item.total_price) || (item.unit_price * item.quantity)), 0)
  }, [allItemsOnSelectedTable])

  const filteredTables = useMemo(() => {
    if (filterSection === 'occupied') return tables.filter(t => t.status === 'occupied')
    if (filterSection === 'billing') return tables.filter(t => t.status === 'billing')
    if (filterSection === 'available') return tables.filter(t => t.status === 'available')
    return tables
  }, [tables, filterSection])

  // Filtered menu in inline modal
  const filteredModalMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchCat = selectedCategoryId === 'all' || item.category_id === selectedCategoryId
      const matchQuery = !menuSearch.trim() || item.name.toLowerCase().includes(menuSearch.toLowerCase())
      return matchCat && matchQuery
    })
  }, [menuItems, selectedCategoryId, menuSearch])

  // --- IN-LINE CRUD & ORDER ACTIONS ---

  // 1. Add / Increase item in inline modal cart
  const addToModalCart = (item: MenuItemData) => {
    setModalCart(prev => {
      const existing = prev.find(p => p.item.id === item.id)
      if (existing) {
        return prev.map(p => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p)
      }
      return [...prev, { item, quantity: 1, notes: '' }]
    })
  }

  // 2. Decrease item in inline modal cart
  const removeFromModalCart = (itemId: string) => {
    setModalCart(prev => {
      const existing = prev.find(p => p.item.id === itemId)
      if (!existing) return prev
      if (existing.quantity <= 1) {
        return prev.filter(p => p.item.id !== itemId)
      }
      return prev.map(p => p.item.id === itemId ? { ...p, quantity: p.quantity - 1 } : p)
    })
  }

  // 3. Update notes in modal cart
  const updateModalCartNotes = (itemId: string, notes: string) => {
    setModalCart(prev => prev.map(p => p.item.id === itemId ? { ...p, notes } : p))
  }

  // 4. Send KOT from Floor Dashboard directly
  const handleSendKOTFromFloor = async () => {
    if (!selectedTable || !profile?.restaurant_id || modalCart.length === 0) return
    setSendingKOT(true)
    setActionErrorMsg(null)

    try {
      const cartSubtotal = modalCart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0)
      const cartTotal = cartSubtotal * 1.05

      // A. Create new order or reuse existing active order
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          restaurant_id: profile.restaurant_id,
          table_id: selectedTable.id,
          captain_id: profile.id,
          status: 'preparing',
          subtotal: cartSubtotal,
          tax_amount: cartSubtotal * 0.05,
          total_amount: cartTotal
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      // B. Create Order Items
      const orderItemsInsert = modalCart.map(c => ({
        restaurant_id: profile.restaurant_id,
        order_id: newOrder.id,
        menu_item_id: c.item.id,
        quantity: c.quantity,
        notes: c.notes || null,
        unit_price: c.item.price,
        total_price: c.item.price * c.quantity
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsInsert)
      if (itemsErr) throw itemsErr

      // C. Mark Table Occupied
      await supabase.from('tables').update({ status: 'occupied' }).eq('id', selectedTable.id)

      // D. Schedule KOT Print jobs to Kitchen & Bar printers
      let restaurantName = 'Tipsy Bar & Eatery'
      try {
        const { data: rData } = await supabase.from('restaurants').select('name').eq('id', profile.restaurant_id).single()
        if (rData?.name) restaurantName = rData.name
      } catch (e) {}

      const itemsByPrinter: Record<string, typeof modalCart> = {}
      modalCart.forEach(c => {
        const pType = c.item.printer_type || 'kitchen'
        if (!itemsByPrinter[pType]) itemsByPrinter[pType] = []
        itemsByPrinter[pType].push(c)
      })

      const printJobsToInsert: any[] = []
      for (const [pType, items] of Object.entries(itemsByPrinter)) {
        let matched = printers.filter(p => p.type === pType && p.is_active)
        if (matched.length === 0) {
          const kitchenFallback = printers.find(p => p.type === 'kitchen')
          matched = kitchenFallback ? [kitchenFallback] : [printers[0]]
        }

        if (matched.length > 0) {
          const kotPayload = {
            type: 'KOT',
            restaurantName,
            tableName: 'Table',
            tableNumber: String(selectedTable.number),
            captainName: profile.name || 'Floor Admin',
            kotNumber: `KOT-${newOrder.id.substring(0, 5).toUpperCase()}`,
            orderId: newOrder.id,
            timestamp: new Date().toISOString(),
            items: items.map(i => ({
              name: i.item.name,
              quantity: i.quantity,
              notes: i.notes || ''
            }))
          }

          matched.forEach(p => {
            printJobsToInsert.push({
              restaurant_id: profile.restaurant_id,
              printer_id: p.id,
              payload: kotPayload,
              status: 'pending',
              attempts: 0
            })
          })
        }
      }

      if (printJobsToInsert.length > 0) {
        await supabase.from('print_jobs').insert(printJobsToInsert)
      }

      // Reset Modal & Refresh Floor
      setModalCart([])
      setIsOrderModalOpen(false)
      setActionSuccessMsg(`KOT sent to Kitchen for Table T${selectedTable.number}!`)
      setTimeout(() => setActionSuccessMsg(null), 3500)
      loadDashboardData(true)

    } catch (err: any) {
      console.error('Failed to send KOT from floor:', err)
      setActionErrorMsg(err.message || 'Failed to place order.')
    } finally {
      setSendingKOT(false)
    }
  }

  // 5. In-line Delete an item from the active table ticket
  const handleDeleteOrderItem = async (itemId: string, orderId: string) => {
    if (!confirm('Are you sure you want to remove this item from the active order?')) return
    setActionLoading(true)

    try {
      const { error: delErr } = await supabase.from('order_items').delete().eq('id', itemId)
      if (delErr) throw delErr

      // Recalculate order total amount
      const remainingItems = allItemsOnSelectedTable.filter(i => i.id !== itemId && i.order_id === orderId)
      const newOrderSubtotal = remainingItems.reduce((s, i) => s + (i.unit_price * i.quantity), 0)
      const newOrderTotal = newOrderSubtotal * 1.05

      if (remainingItems.length === 0) {
        // If no items left in this order, cancel it
        await supabase.from('orders').update({ status: 'cancelled', total_amount: 0, subtotal: 0, tax_amount: 0 }).eq('id', orderId)
      } else {
        await supabase.from('orders').update({
          subtotal: newOrderSubtotal,
          tax_amount: newOrderSubtotal * 0.05,
          total_amount: newOrderTotal
        }).eq('id', orderId)
      }

      setActionSuccessMsg('Item removed from table.')
      setTimeout(() => setActionSuccessMsg(null), 2500)
      loadDashboardData(true)
    } catch (e: any) {
      alert(`Delete Failed: ${e.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // 6. In-line Update item quantity
  const handleUpdateItemQuantity = async (item: OrderItemData, delta: number) => {
    const newQty = item.quantity + delta
    if (newQty <= 0) {
      await handleDeleteOrderItem(item.id, item.order_id)
      return
    }

    setActionLoading(true)
    try {
      const newTotal = item.unit_price * newQty
      const { error } = await supabase
        .from('order_items')
        .update({
          quantity: newQty,
          total_price: newTotal
        })
        .eq('id', item.id)

      if (error) throw error

      // Update parent order total
      const order = activeOrders.find(o => o.id === item.order_id)
      if (order) {
        const updatedItems = order.order_items.map(i => i.id === item.id ? { ...i, quantity: newQty, total_price: newTotal } : i)
        const newSubtotal = updatedItems.reduce((s, i) => s + (i.unit_price * i.quantity), 0)
        await supabase.from('orders').update({
          subtotal: newSubtotal,
          tax_amount: newSubtotal * 0.05,
          total_amount: newSubtotal * 1.05
        }).eq('id', item.order_id)
      }

      loadDashboardData(true)
    } catch (e: any) {
      alert(`Update Failed: ${e.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // 7. Save item instruction/note
  const handleSaveItemNotes = async (itemId: string) => {
    try {
      await supabase.from('order_items').update({ notes: editingNotesText.trim() || null }).eq('id', itemId)
      setEditingItemId(null)
      loadDashboardData(true)
    } catch (e: any) {
      alert(`Save note failed: ${e.message}`)
    }
  }

  // 8. One-click Print Bill Ticket to Counter Printer
  const handlePrintBill = async () => {
    if (!selectedTable || !profile?.restaurant_id || allItemsOnSelectedTable.length === 0) return
    setActionLoading(true)
    try {
      const counterPrinter = printers.find(p => p.type === 'billing') || printers[0]
      if (!counterPrinter) {
        alert('No active billing printer configured.')
        return
      }

      let restaurantName = 'Tipsy Bar & Eatery'
      const { data: rData } = await supabase.from('restaurants').select('name').eq('id', profile.restaurant_id).single()
      if (rData?.name) restaurantName = rData.name

      const billPayload = {
        type: 'BILL',
        restaurantName,
        tableName: 'Table',
        tableNumber: String(selectedTable.number),
        captainName: profile.name || 'Floor Admin',
        billNumber: `INV-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString(),
        items: allItemsOnSelectedTable.map(i => ({
          name: i.menu_items?.name || 'Item',
          quantity: i.quantity,
          price: i.unit_price,
          total: i.total_price || (i.unit_price * i.quantity)
        })),
        subtotal: selectedTableSubtotal,
        tax: selectedTableSubtotal * 0.05,
        total: selectedTableSubtotal * 1.05
      }

      await supabase.from('print_jobs').insert({
        restaurant_id: profile.restaurant_id,
        printer_id: counterPrinter.id,
        payload: billPayload,
        status: 'pending',
        attempts: 0
      })

      // Update table to billing status
      await supabase.from('tables').update({ status: 'billing' }).eq('id', selectedTable.id)

      setActionSuccessMsg('Bill sent to Counter Printer!')
      setTimeout(() => setActionSuccessMsg(null), 3000)
      loadDashboardData(true)
    } catch (e: any) {
      alert(`Print Failed: ${e.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // 9. Clear & Settle Table
  const handleSettleTable = async (paymentMethod: 'cash' | 'upi' | 'card' = 'cash') => {
    if (!selectedTable || !profile?.restaurant_id) return
    if (!confirm(`Settle Table T${selectedTable.number} with payment method [${paymentMethod.toUpperCase()}] and mark available?`)) return

    setActionLoading(true)
    try {
      for (const ord of selectedTableOrders) {
        await supabase
          .from('orders')
          .update({
            status: 'completed',
            payment_status: 'paid',
            payment_method: paymentMethod,
            completed_at: new Date().toISOString()
          })
          .eq('id', ord.id)
      }

      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', selectedTable.id)

      setActionSuccessMsg(`Table T${selectedTable.number} settled & cleared!`)
      setTimeout(() => setActionSuccessMsg(null), 3000)
      loadDashboardData(true)
    } catch (e: any) {
      alert(`Settle Failed: ${e.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  // 10. Table Management Handlers (Directly from Floor)
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault()
    const restaurantId = profile?.restaurant_id
    if (!restaurantId) return

    const num = parseInt(newTableNumber.trim(), 10)
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid table number (e.g. 1, 2, 10).')
      return
    }

    if (tables.some(t => t.number === num)) {
      alert(`Table T${num} already exists! Please choose another number.`)
      return
    }

    setTableModalSaving(true)
    try {
      const { error } = await supabase
        .from('tables')
        .insert({
          restaurant_id: restaurantId,
          number: num,
          table_number: String(num),
          capacity: Number(newTableCapacity) || 4,
          status: 'available',
          is_active: true
        })

      if (error) throw error

      setActionSuccessMsg(`Table T${num} created successfully!`)
      setTimeout(() => setActionSuccessMsg(null), 3000)
      setIsAddTableOpen(false)
      setNewTableNumber('')
      setNewTableCapacity(4)
      loadDashboardData(true)
    } catch (err: any) {
      alert(`Create Table Failed: ${err.message}`)
    } finally {
      setTableModalSaving(false)
    }
  }

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTable) return

    setTableModalSaving(true)
    try {
      const { error } = await supabase
        .from('tables')
        .update({
          capacity: Number(editTableCapacity) || 4
        })
        .eq('id', editingTable.id)

      if (error) throw error

      setActionSuccessMsg(`Table T${editingTable.number} updated!`)
      setTimeout(() => setActionSuccessMsg(null), 3000)
      setEditingTable(null)
      loadDashboardData(true)
    } catch (err: any) {
      alert(`Update Table Failed: ${err.message}`)
    } finally {
      setTableModalSaving(false)
    }
  }

  const handleDeleteTable = async (table: TableData) => {
    if (table.status !== 'available') {
      alert(`Cannot delete Table T${table.number} because it is currently ${table.status}. Please settle or clear it first.`)
      return
    }

    if (!confirm(`Are you sure you want to permanently remove Table T${table.number}?`)) return

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', table.id)

      if (error) throw error

      if (selectedTableId === table.id) {
        setSelectedTableId(null)
      }
      setEditingTable(null)
      setActionSuccessMsg(`Table T${table.number} removed.`)
      setTimeout(() => setActionSuccessMsg(null), 3000)
      loadDashboardData(true)
    } catch (err: any) {
      alert(`Delete Table Failed: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-foreground">
      
      {/* ────────────────────────────────────────────────────────
          1. TOP METRICS STRIP (Responsive Pulse + Live Hardware Indicators)
          ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs select-none">
        <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-zinc-400 block leading-tight">Live Operations</span>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white leading-tight flex items-center gap-2">
              Restaurant Floor
              {refreshing && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
            </h1>
          </div>

          <div className="hidden sm:block h-7 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

          {/* Quick Metrics (Scrollable on small mobile screens) */}
          <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto scrollbar-none py-0.5">
            <div className="shrink-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block leading-none">Occupied</span>
              <span className="text-xs sm:text-sm font-black text-orange-600 dark:text-orange-400 font-mono">
                {occupiedTables.length} / {tables.length}
              </span>
            </div>

            <div className="shrink-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block leading-none">Active</span>
              <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {activeOrders.length} Running
              </span>
            </div>

            <div className="shrink-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 block leading-none">Settled Today</span>
              <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ₹{todaySalesTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Hardware & Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          {/* Printer Health Pill */}
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold">
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] sm:text-[11px] text-zinc-600 dark:text-zinc-300">Printers:</span>
            <div className="flex items-center gap-1.5">
              {printers.map(p => (
                <div key={p.id} className="flex items-center gap-1" title={`${p.name} (${p.type}): ${p.connection_status}`}>
                  <span className={`w-2 h-2 rounded-full ${p.connection_status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-[9px] uppercase font-bold text-zinc-400 hidden xl:inline">{p.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add Table Button */}
          <button
            onClick={() => {
              setNewTableNumber(String((tables.length > 0 ? Math.max(...tables.map(t => t.number)) : 0) + 1))
              setNewTableCapacity(4)
              setIsAddTableOpen(true)
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
            title="Add a new dining table to the floor"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Table</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={() => loadDashboardData()}
            disabled={refreshing}
            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white active:scale-95 transition-all shadow-xs cursor-pointer"
            title="Refresh Floor State"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────
          2. MAIN FLOOR LAYOUT (Floor Grid on Left, Live Table POS Inspector on Right)
          ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* LEFT AREA: Interactive Tables Floor Plan */}
        <section className={`flex-1 flex flex-col p-3 sm:p-6 overflow-hidden ${
          selectedTable ? 'hidden lg:flex' : 'flex'
        }`}>
          
          {/* Filter Bar (Horizontal scroll on phone) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 gap-2.5 select-none">
            <div className="flex items-center gap-1.5 p-1 bg-zinc-200/70 dark:bg-zinc-900 rounded-xl overflow-x-auto scrollbar-none">
              {[
                { id: 'all', label: `All (${tables.length})` },
                { id: 'occupied', label: `Seated (${occupiedTables.length})` },
                { id: 'billing', label: `Billing (${billingTables.length})` },
                { id: 'available', label: `Available (${availableTables.length})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterSection(f.id as any)}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    filterSection === f.id
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Seated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Billing
              </span>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2.5 sm:gap-3.5">
              {filteredTables.map(t => {
                const isSelected = selectedTableId === t.id
                const tableOrders = activeOrders.filter(o => o.table_id === t.id)
                
                // Item sum
                let runningAmount = 0
                let itemsCount = 0
                tableOrders.forEach(o => {
                  if (o.order_items) {
                    itemsCount += o.order_items.length
                    runningAmount += o.order_items.reduce((acc, i) => acc + (Number(i.total_price) || (i.unit_price * i.quantity)), 0)
                  }
                })

                const isOccupied = t.status === 'occupied'
                const isBilling = t.status === 'billing'
                const isAvailable = t.status === 'available'

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTableId(t.id)}
                    className={`flex flex-col p-4 rounded-2xl border text-left transition-all active:scale-95 cursor-pointer relative overflow-hidden select-none ${
                      isSelected
                        ? 'ring-2 ring-amber-500 border-amber-500 shadow-md'
                        : 'hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60 shadow-xs'
                    } ${
                      isOccupied
                        ? 'border-orange-500/40 bg-orange-500/[0.03]'
                        : isBilling
                        ? 'border-blue-500/40 bg-blue-500/[0.03]'
                        : 'border-zinc-200/80 dark:border-zinc-800'
                    }`}
                  >
                    {/* Top Row: Table Name + Capacity */}
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          isOccupied ? 'bg-orange-500 animate-pulse' : isBilling ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'
                        }`} />
                        <span className="text-base font-black text-zinc-900 dark:text-white leading-none">
                          T{t.number}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-0.5">
                        <Users className="w-3 h-3 text-zinc-400" />
                        {t.capacity}
                      </span>
                    </div>

                    {/* Middle Info */}
                    <div className="my-3">
                      {isAvailable ? (
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          Vacant
                        </span>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-sm font-black font-mono text-zinc-900 dark:text-white block">
                            ₹{runningAmount.toFixed(0)}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400 block leading-tight">
                            {itemsCount} items ordered
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Pill */}
                    <div className="w-full pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <span className={`text-[9px] font-black uppercase tracking-wider ${
                        isOccupied ? 'text-orange-600' : isBilling ? 'text-blue-600' : 'text-emerald-600'
                      }`}>
                        {t.status}
                      </span>
                      {isSelected && (
                        <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* BOTTOM STRIP: Real-Time KOT & Print Server Log */}
          <div className="mt-4 pt-3 border-t border-zinc-200/80 dark:border-zinc-800 shrink-0 select-none">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                Live KOT Print Queue ({recentPrintJobs.length})
              </span>
              <span className="text-[10px] font-bold text-zinc-400">Real-Time WebSocket Sync</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {recentPrintJobs.slice(0, 3).map(job => {
                const payload = job.payload || {}
                const isPrinted = job.status === 'printed'
                const isPending = job.status === 'pending'
                const isFailed = job.status === 'failed'

                return (
                  <div
                    key={job.id}
                    className="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-zinc-900 dark:text-white">
                          {payload.kotNumber || payload.billNumber || payload.type || 'PRINT'}
                        </span>
                        {payload.tableNumber && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 rounded">
                            T{payload.tableNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {job.printers?.name || 'Printer'} • {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      isPrinted
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : isPending
                        ? 'bg-amber-500/10 text-amber-600 animate-pulse'
                        : 'bg-red-500/10 text-red-600'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────────────
            RIGHT PANEL: Live Table POS Ticket + In-line Management Console
            (Full screen on mobile when a table is active, with back navigation)
            ──────────────────────────────────────────────────────── */}
        <aside className={`border-l border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 shadow-lg select-none ${
          selectedTable ? 'w-full lg:w-96 flex-1 lg:flex-none flex' : 'hidden lg:flex lg:w-96'
        }`}>
          
          {selectedTable ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Table Header with Mobile Back Button */}
              <div className="p-3 sm:p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedTableId(null)}
                    className="lg:hidden p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-200 active:scale-95 cursor-pointer"
                    title="Back to Floor Grid"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-sm shadow-amber-500/30">
                    T{selectedTable.number}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white leading-tight">
                      Table T{selectedTable.number}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        selectedTable.status === 'occupied' ? 'text-orange-600' : selectedTable.status === 'billing' ? 'text-blue-600' : 'text-emerald-600'
                      }`}>
                        {selectedTable.status}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="text-[10px] text-zinc-400 font-bold">Cap {selectedTable.capacity}</span>
                    </div>
                  </div>
                </div>

                {/* Actions: Edit Table Config & Add Items */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setEditingTable(selectedTable)
                      setEditTableCapacity(selectedTable.capacity)
                    }}
                    className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white active:scale-95 transition-all shadow-xs cursor-pointer"
                    title={`Edit Table T${selectedTable.number} Settings`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      setModalCart([])
                      setIsOrderModalOpen(true)
                    }}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Items</span>
                  </button>
                </div>
              </div>

              {/* Action Success / Error Notifications */}
              {actionSuccessMsg && (
                <div className="m-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {actionSuccessMsg}
                </div>
              )}
              {actionErrorMsg && (
                <div className="m-3 p-2.5 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-black rounded-xl flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {actionErrorMsg}
                </div>
              )}

              {/* Ordered Items List (Editable, Deletable) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Running Kitchen & Bar Items ({allItemsOnSelectedTable.length})
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400">Amount</span>
                </div>

                {allItemsOnSelectedTable.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <Coffee className="w-9 h-9 mx-auto text-zinc-300 dark:text-zinc-700" />
                    <div>
                      <p className="text-xs font-bold text-zinc-500">No active items on Table T{selectedTable.number}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Click &ldquo;+ Add Items&rdquo; to place an order directly</p>
                    </div>
                    <button
                      onClick={() => setIsOrderModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-black hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                    >
                      + Open Table Menu
                    </button>
                  </div>
                ) : (
                  allItemsOnSelectedTable.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-950/40 text-xs gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 pr-2">
                          <span className="font-extrabold text-zinc-900 dark:text-white line-clamp-1">
                            {item.menu_items?.name || 'Dish Item'}
                          </span>
                          <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500">
                            {item.menu_items?.printer_type || 'kitchen'}
                          </span>
                        </div>
                        <span className="font-black font-mono text-zinc-900 dark:text-white shrink-0">
                          ₹{Number(item.total_price || item.unit_price * item.quantity).toFixed(0)}
                        </span>
                      </div>

                      {/* In-line Controls: Quantity +/- , Edit Notes, Delete Item */}
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-200/40 dark:border-zinc-800/40 text-[10px]">
                        <div className="flex items-center gap-2">
                          {/* Qty changer */}
                          <div className="flex items-center bg-zinc-200 dark:bg-zinc-800 rounded-lg h-6 px-1">
                            <button
                              onClick={() => handleUpdateItemQuantity(item, -1)}
                              disabled={actionLoading}
                              className="w-5 h-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white active:scale-75 cursor-pointer"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="w-4 text-center font-black font-mono">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateItemQuantity(item, 1)}
                              disabled={actionLoading}
                              className="w-5 h-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white active:scale-75 cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          {/* Notes */}
                          {editingItemId === item.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingNotesText}
                                onChange={e => setEditingNotesText(e.target.value)}
                                placeholder="Special instruction..."
                                className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 text-[9px] w-32 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveItemNotes(item.id)}
                                className="text-emerald-600 font-bold hover:underline"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="text-zinc-400 hover:underline"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingItemId(item.id)
                                setEditingNotesText(item.notes || '')
                              }}
                              className="text-[9px] text-zinc-400 hover:text-amber-500 font-bold flex items-center gap-1"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              {item.notes ? `Note: ${item.notes}` : '+ Add note'}
                            </button>
                          )}
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteOrderItem(item.id, item.order_id)}
                          disabled={actionLoading}
                          className="text-red-400 hover:text-red-600 p-1 rounded transition-colors active:scale-90 cursor-pointer"
                          title="Remove item from order"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bill Computation & Instant Actions (Bottom pinned) */}
              <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 space-y-3 shrink-0">
                {allItemsOnSelectedTable.length > 0 && (
                  <div className="space-y-1 text-xs font-bold">
                    <div className="flex justify-between text-zinc-500">
                      <span>Subtotal</span>
                      <span className="font-mono">₹{selectedTableSubtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Estimated Tax (5%)</span>
                      <span className="font-mono">₹{(selectedTableSubtotal * 0.05).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-zinc-900 dark:text-white pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                      <span>Total Due</span>
                      <span className="font-mono text-amber-600 dark:text-amber-500 text-base">
                        ₹{(selectedTableSubtotal * 1.05).toFixed(0)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {allItemsOnSelectedTable.length > 0 ? (
                  <div className="space-y-2">
                    <button
                      onClick={handlePrintBill}
                      disabled={actionLoading}
                      className="w-full py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-black text-xs hover:bg-zinc-50 dark:hover:bg-zinc-750 flex items-center justify-center gap-2 active:scale-97 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Receipt className="w-4 h-4 text-amber-500" />
                      Print Bill Ticket
                    </button>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleSettleTable('cash')}
                        disabled={actionLoading}
                        className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        Settle Cash
                      </button>

                      <button
                        onClick={() => handleSettleTable('upi')}
                        disabled={actionLoading}
                        className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Settle UPI
                      </button>

                      <button
                        onClick={() => handleSettleTable('card')}
                        disabled={actionLoading}
                        className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-black text-[11px] flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Settle Card
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsOrderModalOpen(true)}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Place New Order for T{selectedTable.number}
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <Grid className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">No Table Selected</h4>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Click any table on the floor plan to view ordered dishes, running bill, or print receipts.
              </p>
            </div>
          )}

        </aside>

      </div>

      {/* ────────────────────────────────────────────────────────
          3. IN-LINE FLOOR POS MODAL (Take Orders Directly from Floor Dashboard)
          (Full mobile sheet with tabbed Cart / Menu view on mobile)
          ──────────────────────────────────────────────────────── */}
      {isOrderModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-zinc-950/70 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="w-full sm:max-w-4xl h-[94vh] sm:h-[88vh] bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border-t sm:border border-zinc-200/80 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/50 dark:bg-zinc-950/30">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs sm:text-sm">
                  T{selectedTable.number}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white leading-tight">
                    Add Items to Table T{selectedTable.number}
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-bold">Fast POS Ordering</span>
                </div>
              </div>

              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Main Area (Responsive: Stack on mobile, Split on desktop) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Menu Browser */}
              <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800">
                
                {/* Search Bar */}
                <div className="relative mb-2.5 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search food, cocktails, beverages..."
                    value={menuSearch}
                    onChange={e => setMenuSearch(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-zinc-900 dark:text-white border-none focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none shrink-0">
                  <button
                    onClick={() => setSelectedCategoryId('all')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black shrink-0 transition-colors cursor-pointer ${
                      selectedCategoryId === 'all'
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    All Items ({menuItems.length})
                  </button>
                  {categories.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategoryId(c.id)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black shrink-0 transition-colors cursor-pointer ${
                        selectedCategoryId === c.id
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                {/* Menu Items Grid */}
                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                    {filteredModalMenuItems.map(item => {
                      const inCart = modalCart.find(c => c.item.id === item.id)
                      const qty = inCart ? inCart.quantity : 0

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                            qty > 0
                              ? 'border-amber-500/50 bg-amber-500/[0.04]'
                              : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/60'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-[11px] font-extrabold text-zinc-900 dark:text-white line-clamp-2 leading-tight">
                                {item.name}
                              </span>
                              <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                            </div>
                            <span className="text-[9px] uppercase font-bold text-zinc-400 block mt-0.5">
                              {item.printer_type}
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                            <span className="text-xs font-black font-mono text-zinc-900 dark:text-white">
                              ₹{item.price.toFixed(0)}
                            </span>

                            {qty === 0 ? (
                              <button
                                onClick={() => addToModalCart(item)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[10px] font-black active:scale-95 transition-all cursor-pointer"
                              >
                                ADD
                              </button>
                            ) : (
                              <div className="flex items-center bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg h-6 px-1">
                                <button onClick={() => removeFromModalCart(item.id)} className="w-5 text-center active:scale-75 cursor-pointer">
                                  <Minus className="w-2.5 h-2.5 mx-auto" />
                                </button>
                                <span className="w-4 text-center text-[10px] font-mono font-black">{qty}</span>
                                <button onClick={() => addToModalCart(item)} className="w-5 text-center active:scale-75 cursor-pointer">
                                  <Plus className="w-2.5 h-2.5 mx-auto" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>

              {/* Cart & Send KOT (Bottom sheet on mobile, Right 40% on desktop) */}
              <div className="w-full md:w-80 max-h-56 md:max-h-none flex flex-col p-3 sm:p-4 bg-zinc-50/50 dark:bg-zinc-950/20 overflow-hidden shrink-0">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Items to Send ({modalCart.reduce((s, c) => s + c.quantity, 0)})
                  </span>
                  {modalCart.length > 0 && (
                    <button
                      onClick={() => setModalCart([])}
                      className="text-[10px] font-bold text-red-500 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto py-2 sm:py-3 space-y-2">
                  {modalCart.length === 0 ? (
                    <div className="py-6 md:py-16 text-center space-y-1">
                      <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
                      <p className="text-xs font-bold text-zinc-400">Cart is empty</p>
                      <p className="text-[10px] text-zinc-400">Tap ADD on dishes above</p>
                    </div>
                  ) : (
                    modalCart.map(c => (
                      <div key={c.item.id} className="p-2 sm:p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs space-y-1.5">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-zinc-900 dark:text-white line-clamp-1">{c.item.name}</span>
                          <span className="font-mono">₹{(c.item.price * c.quantity).toFixed(0)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            placeholder="+ Note..."
                            value={c.notes}
                            onChange={e => updateModalCartNotes(c.item.id, e.target.value)}
                            className="bg-zinc-100 dark:bg-zinc-800 rounded px-2 py-0.5 text-[10px] flex-1 focus:outline-none"
                          />

                          <div className="flex items-center bg-zinc-200 dark:bg-zinc-800 rounded-lg h-6 px-1 shrink-0">
                            <button onClick={() => removeFromModalCart(c.item.id)} className="w-5 text-center cursor-pointer">
                              <Minus className="w-2.5 h-2.5 mx-auto" />
                            </button>
                            <span className="w-4 text-center text-[10px] font-mono font-black">{c.quantity}</span>
                            <button onClick={() => addToModalCart(c.item)} className="w-5 text-center cursor-pointer">
                              <Plus className="w-2.5 h-2.5 mx-auto" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Send KOT Button */}
                <div className="pt-2 sm:pt-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0 space-y-2">
                  <div className="flex justify-between text-xs font-black">
                    <span className="text-zinc-400 uppercase tracking-wider text-[10px]">New Order Total</span>
                    <span className="text-amber-500 font-mono text-sm">
                      ₹{modalCart.reduce((s, c) => s + (c.item.price * c.quantity), 0).toFixed(0)}
                    </span>
                  </div>

                  <button
                    onClick={handleSendKOTFromFloor}
                    disabled={modalCart.length === 0 || sendingKOT}
                    className="w-full py-2.5 sm:py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 active:scale-97 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    {sendingKOT ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Fire KOT to Kitchen & Bar
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          4. ADD TABLE MODAL (FLOOR MANAGEMENT)
          ──────────────────────────────────────────────────────── */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs"
            onClick={() => setIsAddTableOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-zinc-900 dark:text-white">Add Dining Table</h3>
              </div>
              <button
                onClick={() => setIsAddTableOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="pt-4 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">
                  Table Number
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-mono font-black text-zinc-500">T</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder="e.g. 5"
                    className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">
                  Seating Capacity (Guests)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map(cap => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setNewTableCapacity(cap)}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        newTableCapacity === cap
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {cap} Pax
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tableModalSaving}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {tableModalSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          5. EDIT TABLE SETTINGS MODAL
          ──────────────────────────────────────────────────────── */}
      {editingTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs"
            onClick={() => setEditingTable(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-black text-zinc-900 dark:text-white">Table T{editingTable.number} Settings</h3>
              </div>
              <button
                onClick={() => setEditingTable(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTable} className="pt-4 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1.5">
                  Update Seating Capacity
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 4, 6, 8].map(cap => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setEditTableCapacity(cap)}
                      className={`py-2 rounded-xl text-xs font-black border transition-all ${
                        editTableCapacity === cap
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {cap} Pax
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-1 border border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Current Status</span>
                  <span className="font-bold capitalize text-zinc-700 dark:text-zinc-300">{editingTable.status}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTable(null)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={tableModalSaving}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {tableModalSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                  </button>
                </div>

                {editingTable.status === 'available' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTable(editingTable)}
                    className="w-full py-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Table
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
