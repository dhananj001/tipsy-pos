'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { MENU_CATEGORIES, MENU_ITEMS } from '@/lib/menu-data'
import { 
  Users, 
  RefreshCw, 
  CheckCircle, 
  Coffee, 
  Receipt, 
  X, 
  ChevronRight, 
  AlertCircle,
  Loader2,
  ShoppingBag,
  Plus,
  Minus,
  Search,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react'

// Interfaces
interface Table {
  id: string
  restaurant_id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'billing'
  created_at: string
  orders?: any[]
}

interface MenuCategory {
  id: string
  name: string
  sort_order: number
}

interface MenuItem {
  id: string
  name: string
  description: string | null
  price: number
  is_available: boolean
  printer_type: 'kitchen' | 'bar' | 'billing'
  category_id: string
}

interface CartItem {
  menuItem: MenuItem
  quantity: number
  notes: string
}

const MENU_CACHE_KEY = 'tipsy-menu-cache-v2'
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

export default function TablesPage() {
  const { profile } = useAuth()
  const supabase = createClient()

  // --- Tables Grid & Sync States ---
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null)

  // --- Billing & Checkout States ---
  const [activeOrders, setActiveOrders] = useState<any[]>([])
  const [fetchingOrders, setFetchingOrders] = useState(false)
  const [billingMode, setBillingMode] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('upi')
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [taxPercent, setTaxPercent] = useState<number>(5)
  const [vatPercent, setVatPercent] = useState<number>(0)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [serviceChargePercent, setServiceChargePercent] = useState<number>(0)

  // --- Unified Workspace / Ordering States ---
  const [viewMode, setViewMode] = useState<'tables' | 'menu'>('tables')
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loadingMenu, setLoadingMenu] = useState(false)
  
  const [superCategory, setSuperCategory] = useState<'all' | 'food' | 'drinks'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  // --- Confirmation Dialog State ---
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    confirmText: string
    cancelText?: string
    onConfirm: () => void | Promise<void>
  } | null>(null)

  // --- Print Monitor States ---
  const [activePrinters, setActivePrinters] = useState<any[]>([])
  const [recentPrintJobs, setRecentPrintJobs] = useState<any[]>([])
  const [showPrintMonitor, setShowPrintMonitor] = useState(false)
  const [newJobToast, setNewJobToast] = useState<{ id: string; type: string; status: string; message: string } | null>(null)

  const triggerSendKOT = () => {
    if (cart.length === 0) return
    setConfirmDialog({
      isOpen: true,
      title: 'Send KOT to Kitchen?',
      description: `Send order of ${cart.reduce((s, c) => s + c.quantity, 0)} items to kitchen printers for Table ${selectedTable?.number}?`,
      confirmText: 'Yes, Send KOT',
      onConfirm: handlePlaceOrder
    })
  }

  const triggerPrintBill = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Print Bill Ticket?',
      description: `Request print server to print receipt invoice for Table ${selectedTable?.number}?`,
      confirmText: 'Yes, Print',
      onConfirm: () => printBill(false)
    })
  }

  const triggerClearTable = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Clear Table & Settle?',
      description: `Process settlement and clear Table ${selectedTable?.number}? Active running orders will be finalized.`,
      confirmText: 'Yes, Settle & Clear',
      onConfirm: handleCheckout
    })
  }

  const triggerUpdateTableStatus = (status: 'available' | 'occupied' | 'billing') => {
    const statusLabels = {
      available: 'Available',
      occupied: 'Occupied',
      billing: 'Billing'
    }
    setConfirmDialog({
      isOpen: true,
      title: `Change Status to ${statusLabels[status]}?`,
      description: `Mark Table ${selectedTable?.number} status as ${statusLabels[status]}?`,
      confirmText: `Mark ${statusLabels[status]}`,
      onConfirm: () => updateTableStatus(selectedTable!.id, status)
    })
  }

  // --- Lock background scroll when modal/drawer/menu is open ---
  useEffect(() => {
    const mainEl = document.querySelector('main')
    if (!mainEl) return
    
    const shouldLock = (selectedTable && viewMode === 'tables') || viewMode === 'menu' || isCartOpen
    if (shouldLock) {
      mainEl.style.overflowY = 'hidden'
    } else {
      mainEl.style.overflowY = 'auto'
    }
    
    return () => {
      mainEl.style.overflowY = 'auto'
    }
  }, [selectedTable, viewMode, isCartOpen])

  // --- Fetch Tables & Subscriptions ---
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
                price,
                printer_type
              )
            )
          )
        `)
        .eq('restaurant_id', profile.restaurant_id)
        .order('number', { ascending: true })

      if (fetchError) throw fetchError

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
                  price,
                  printer_type
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

  // Fetch active orders for current table
  const fetchActiveOrders = async (tableId: string) => {
    setFetchingOrders(true)
    try {
      const { data, error: oError } = await supabase
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
              price,
              printer_type
            )
          )
        `)
        .eq('table_id', tableId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true })

      if (oError) throw oError
      setActiveOrders(data || [])
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, orders: data || [] } : t))
      )
    } catch (e) {
      console.error('Error fetching table orders:', e)
    } finally {
      setFetchingOrders(false)
    }
  }

  // Load fallback categories and menu items if database seeding is empty
  const loadFallbackMenu = () => {
    const fallbackCats = MENU_CATEGORIES.map((c, i) => ({
      id: `fallback-cat-${i}`,
      name: c.name,
      sort_order: c.sort_order
    }))

    const fallbackItems = MENU_ITEMS.map((item, i) => {
      const catIndex = MENU_CATEGORIES.findIndex(c => c.name === item.categoryName)
      const catId = catIndex !== -1 ? `fallback-cat-${catIndex}` : 'fallback-cat-0'
      const printer_type = item.printer_type || 
        MENU_CATEGORIES.find(c => c.name === item.categoryName)?.printer_type || 
        'kitchen'

      return {
        id: `fallback-item-${i}`,
        name: item.name,
        description: item.description || null,
        price: item.price,
        is_available: true,
        printer_type: printer_type as 'kitchen' | 'bar' | 'billing',
        category_id: catId
      }
    })

    setCategories(fallbackCats)
    setMenuItems(fallbackItems)
  }

  // --- Fetch Menu ---
  const fetchMenuData = async (forceRefresh = false) => {
    if (!profile?.restaurant_id) return
    setLoadingMenu(true)
    
    try {
      let cachedData = null
      if (!forceRefresh) {
        const cached = localStorage.getItem(`${MENU_CACHE_KEY}-${profile.restaurant_id}`)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (Date.now() - parsed.timestamp < CACHE_TTL) {
              cachedData = parsed
            }
          } catch (e) {
            console.error('Failed parsing menu cache', e)
          }
        }
      }

      if (cachedData) {
        setCategories(cachedData.categories)
        setMenuItems(cachedData.items)
        setLoadingMenu(false)
        return
      }

      // Load from db
      const { data: catData, error: catErr } = await supabase
        .from('menu_categories')
        .select('id, name, sort_order')
        .eq('restaurant_id', profile.restaurant_id)
        .order('sort_order', { ascending: true })

      if (catErr) throw catErr

      const { data: itemData, error: itemErr } = await supabase
        .from('menu_items')
        .select('id, name, description, price, is_available, printer_type, category_id')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('is_available', true)
        .order('name', { ascending: true })

      if (itemErr) throw itemErr

      // Auto seed if empty
      if (!catData || catData.length === 0 || !itemData || itemData.length === 0) {
        if (profile.role === 'admin' || profile.role === 'manager') {
          await seedMenuData(profile.restaurant_id)
          await fetchMenuData(true)
          return
        } else {
          // If captain and DB empty, load fallback static items
          loadFallbackMenu()
          setLoadingMenu(false)
          return
        }
      }

      setCategories(catData || [])
      setMenuItems(itemData || [])

      localStorage.setItem(
        `${MENU_CACHE_KEY}-${profile.restaurant_id}`,
        JSON.stringify({ categories: catData, items: itemData, timestamp: Date.now() })
      )
    } catch (err: any) {
      console.error('Menu load error:', err)
      // Fallback on network or query failure
      loadFallbackMenu()
    } finally {
      setLoadingMenu(false)
    }
  }

  const seedMenuData = async (restaurantId: string) => {
    try {
      await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId)
      const categoriesToInsert = MENU_CATEGORIES.map(c => ({
        restaurant_id: restaurantId,
        name: c.name,
        sort_order: c.sort_order
      }))
      const { data: insertedCats, error: catError } = await supabase
        .from('menu_categories')
        .insert(categoriesToInsert)
        .select()

      if (catError || !insertedCats) throw catError || new Error('Category seeding failed')
      const catMap = new Map(insertedCats.map((c: any) => [c.name, c.id]))

      const itemsToInsert = MENU_ITEMS.map(item => {
        const cat = MENU_CATEGORIES.find(c => c.name === item.categoryName)
        const printer_type = item.printer_type || cat?.printer_type || 'kitchen'
        return {
          restaurant_id: restaurantId,
          category_id: catMap.get(item.categoryName),
          name: item.name,
          description: item.description || null,
          price: item.price,
          is_available: true,
          printer_type
        }
      })

      await supabase.from('menu_items').insert(itemsToInsert)
      
      const { data: printers } = await supabase
        .from('printers')
        .select('name')
        .eq('restaurant_id', restaurantId)

      if (!printers || printers.length === 0) {
        const printersToSeed = [
          { restaurant_id: restaurantId, name: 'counter one', ip_address: '192.168.1.50', port: 9100, type: 'billing', is_active: true },
          { restaurant_id: restaurantId, name: 'kitchen one', ip_address: '192.168.1.100', port: 9100, type: 'kitchen', is_active: true },
          { restaurant_id: restaurantId, name: 'bar one', ip_address: '192.168.1.150', port: 9100, type: 'bar', is_active: true }
        ]
        await supabase.from('printers').insert(printersToSeed)
      }
    } catch (err) {
      console.error('Seed error:', err)
    }
  }

  // --- Table Status Update ---
  const updateTableStatus = async (tableId: string, newStatus: 'available' | 'occupied' | 'billing') => {
    setUpdatingTableId(tableId)
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status: newStatus } : t))
    )
    if (selectedTable && selectedTable.id === tableId) {
      setSelectedTable({ ...selectedTable, status: newStatus })
    }

    try {
      const { error: uErr } = await supabase
        .from('tables')
        .update({ status: newStatus })
        .eq('id', tableId)
      if (uErr) throw uErr
    } catch (err: any) {
      console.error('Table status error:', err?.message || err)
      if (err && typeof err === 'object') {
        console.error('Table status error details:', {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint
        })
      }
      fetchTables()
    } finally {
      setUpdatingTableId(null)
    }
  }

  // --- Realtime channels setup ---
  useEffect(() => {
    if (!profile?.restaurant_id) return

    fetchTables()
    fetchMenuData()

    const channel = supabase
      .channel('public:tables')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${profile.restaurant_id}` },
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
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${profile.restaurant_id}` },
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

  // --- Local storage cart binding per table ---
  useEffect(() => {
    if (!profile?.restaurant_id || !selectedTable || viewMode !== 'menu') return
    const cartKey = `tipsy-cart-${profile.restaurant_id}-${selectedTable.id}`
    const savedCart = localStorage.getItem(cartKey)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (err) {
        console.error('Failed to load cart cache:', err)
      }
    } else {
      setCart([])
    }
  }, [profile?.restaurant_id, selectedTable, viewMode])

  // --- Print Monitor Data Fetch & Subscription ---
  const fetchPrintMonitorData = async () => {
    if (!profile?.restaurant_id) return
    try {
      const { data: printersData } = await supabase
        .from('printers')
        .select('id, name, type, ip_address, connection_status, connection_error')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('is_active', true)
      if (printersData) {
        setActivePrinters(printersData)
      }

      const { data: jobsData } = await supabase
        .from('print_jobs')
        .select('id, payload, status, error_message, created_at')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (jobsData) {
        setRecentPrintJobs(jobsData)
      }
    } catch (e) {
      console.error('Error fetching print monitor data:', e)
    }
  }

  const handleRetryPrintJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('print_jobs')
        .update({
          status: 'pending',
          attempts: 0,
          error_message: null
        })
        .eq('id', jobId)
      if (error) throw error
      fetchPrintMonitorData()
    } catch (e: any) {
      console.error('Failed to retry print job:', e)
    }
  }

  const handleCancelPrintJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('print_jobs')
        .delete()
        .eq('id', jobId)
      if (error) throw error
      fetchPrintMonitorData()
    } catch (e: any) {
      console.error('Failed to cancel print job:', e)
    }
  }

  useEffect(() => {
    if (!profile?.restaurant_id) return
    
    fetchPrintMonitorData()

    const printersChannel = supabase
      .channel('realtime_printers_monitor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'printers', filter: `restaurant_id=eq.${profile.restaurant_id}` },
        () => { fetchPrintMonitorData() }
      )
      .subscribe()

    const jobsChannel = supabase
      .channel('realtime_jobs_monitor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'print_jobs', filter: `restaurant_id=eq.${profile.restaurant_id}` },
        (payload: any) => {
          fetchPrintMonitorData()
          const newJob = payload.new as any
          if (newJob) {
            const type = newJob.payload?.type || 'PRINT'
            const status = newJob.status
            const errorMsg = newJob.error_message
            const tableNo = newJob.payload?.tableNumber || ''
            
            let message = ''
            if (status === 'printed') {
              message = `${type} for Table ${tableNo} printed successfully.`
            } else if (status === 'failed') {
              message = `Failed printing ${type} for Table ${tableNo}: ${errorMsg || 'unknown error'}`
            }

            if (message) {
              setNewJobToast({
                id: newJob.id,
                type,
                status,
                message
              })
              setTimeout(() => {
                setNewJobToast(prev => prev?.id === newJob.id ? null : prev)
              }, 4000)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(printersChannel)
      supabase.removeChannel(jobsChannel)
    }
  }, [profile?.restaurant_id])

  const saveCartState = (newCart: CartItem[]) => {
    setCart(newCart)
    if (profile?.restaurant_id && selectedTable) {
      const cartKey = `tipsy-cart-${profile.restaurant_id}-${selectedTable.id}`
      if (newCart.length === 0) {
        localStorage.removeItem(cartKey)
      } else {
        localStorage.setItem(cartKey, JSON.stringify(newCart))
      }
    }
  }

  // --- Cart Helpers ---
  const addToCart = (item: MenuItem) => {
    const existing = cart.find(c => c.menuItem.id === item.id)
    if (existing) {
      const updated = cart.map(c => 
        c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      )
      saveCartState(updated)
    } else {
      const updated = [...cart, { menuItem: item, quantity: 1, notes: '' }]
      saveCartState(updated)
    }
  }

  const removeFromCart = (itemId: string) => {
    const existing = cart.find(c => c.menuItem.id === itemId)
    if (!existing) return
    if (existing.quantity === 1) {
      const updated = cart.filter(c => c.menuItem.id !== itemId)
      saveCartState(updated)
    } else {
      const updated = cart.map(c => 
        c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
      )
      saveCartState(updated)
    }
  }

  const getQtyInCart = (itemId: string) => {
    return cart.find(c => c.menuItem.id === itemId)?.quantity || 0
  }

  // --- Place Order Submission ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !profile?.restaurant_id || !selectedTable) return
    setSubmittingOrder(true)
    setError(null)

    const cartSubtotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0)
    const cartTotal = cartSubtotal * 1.05 // 5% flat tax

    try {
      // Create Order
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          restaurant_id: profile.restaurant_id,
          table_id: selectedTable.id,
          captain_id: profile.id,
          status: 'preparing',
          total_amount: cartTotal
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      // Create Order Items (ignoring fallback local IDs for DB safety)
      const orderItemsInsert = cart.map(c => {
        const isFallbackId = c.menuItem.id.startsWith('fallback-')
        return {
          restaurant_id: profile.restaurant_id,
          order_id: newOrder.id,
          menu_item_id: isFallbackId ? null : c.menuItem.id,
          quantity: c.quantity,
          notes: c.notes || null,
          price_at_order: c.menuItem.price
        }
      })

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsInsert)
      if (itemsErr) throw itemsErr

      // Set Table Status
      await updateTableStatus(selectedTable.id, 'occupied')

      // Schedule KOT Print jobs
      let restaurantName = 'Tipsy POS'
      try {
        const { data: restData } = await supabase
          .from('restaurants')
          .select('name')
          .eq('id', profile.restaurant_id)
          .single()
        if (restData?.name) restaurantName = restData.name
      } catch (e) {
        console.error(e)
      }

      const { data: printers } = await supabase
        .from('printers')
        .select('id, name, type, is_active')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('is_active', true)

      const itemsByPrinterType: Record<string, typeof cart> = {}
      cart.forEach(item => {
        const pType = item.menuItem.printer_type || 'kitchen'
        if (!itemsByPrinterType[pType]) itemsByPrinterType[pType] = []
        itemsByPrinterType[pType].push(item)
      })

      const printJobsToInsert: any[] = []
      for (const [printerType, groupedItems] of Object.entries(itemsByPrinterType)) {
        if (groupedItems.length === 0) continue
        let matchedPrinters = printers?.filter((p: any) => p.type === printerType) || []
        
        if (matchedPrinters.length === 0 && printers && printers.length > 0) {
          const kitchenPrinter = printers.find((p: any) => p.type === 'kitchen')
          matchedPrinters = kitchenPrinter ? [kitchenPrinter] : [printers[0]]
        }

        if (matchedPrinters.length === 0) continue

        const kotPayload = {
          type: 'KOT',
          restaurantName,
          tableName: 'Table',
          tableNumber: String(selectedTable.number),
          captainName: profile.name || 'Captain',
          kotNumber: `KOT-${newOrder.id.substring(0, 5).toUpperCase()}`,
          orderId: newOrder.id,
          timestamp: new Date().toISOString(),
          items: groupedItems.map(i => ({
            name: i.menuItem.name,
            quantity: i.quantity,
            notes: i.notes || ''
          }))
        }

        matchedPrinters.forEach((printer: any) => {
          printJobsToInsert.push({
            restaurant_id: profile.restaurant_id,
            printer_id: printer.id,
            payload: kotPayload,
            status: 'pending',
            attempts: 0
          })
        })
      }

      if (printJobsToInsert.length > 0) {
        await supabase.from('print_jobs').insert(printJobsToInsert)
      }

      // Cleanup
      saveCartState([])
      setOrderSuccess(true)
      setIsCartOpen(false)
      setTimeout(() => {
        setOrderSuccess(false)
        setViewMode('tables')
        setSelectedTable(null)
      }, 1000)
    } catch (e: any) {
      console.error(e)
      setError('Failed to submit order.')
    } finally {
      setSubmittingOrder(false)
    }
  }

  // --- Billing Mutators ---
  const handleUpdateItemQuantity = async (itemName: string, currentQty: number, change: number) => {
    if (!selectedTable) return
    const newQty = currentQty + change
    
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
        await supabase.from('order_items').delete().eq('id', targetItem.id)
      } else {
        await supabase.from('order_items').update({ quantity: newQty }).eq('id', targetItem.id)
      }

      const orderId = targetItem.order_id
      const { data: updatedItems } = await supabase
        .from('order_items')
        .select('quantity, price_at_order')
        .eq('order_id', orderId)

      const newTotal = updatedItems?.reduce((sum: number, item: any) => sum + (item.price_at_order * item.quantity), 0) || 0
      await supabase.from('orders').update({ total_amount: newTotal }).eq('id', orderId)
      await fetchActiveOrders(selectedTable.id)
    } catch (e) {
      console.error(e)
    }
  }

  const printBill = async (isPaid: boolean, orderId?: string) => {
    if (!profile?.restaurant_id || !selectedTable) return

    try {
      const { data: printers } = await supabase
        .from('printers')
        .select('id, name, type')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('type', 'billing')
        .eq('is_active', true)

      let targetPrinters = printers || []
      if (targetPrinters.length === 0) {
        const { data: anyPrinters } = await supabase
          .from('printers')
          .select('id, name, type')
          .eq('restaurant_id', profile.restaurant_id)
          .eq('is_active', true)
        if (anyPrinters && anyPrinters.length > 0) targetPrinters = [anyPrinters[0]]
      }

      if (targetPrinters.length === 0) return

      let restaurantName = 'Tipsy POS'
      let restaurantAddress = ''
      let restaurantPhone = ''
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

      const billPayload = {
        type: 'BILL',
        restaurantName,
        restaurantAddress,
        restaurantPhone,
        tableName: 'Table',
        tableNumber: String(selectedTable.number),
        capacity: selectedTable.capacity,
        captainName: profile.name || 'Captain',
        invoiceNumber: `INV-${orderId ? orderId.substring(0, 5).toUpperCase() : Math.floor(100000 + Math.random() * 900000).toString()}`,
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
        paymentMethod: isPaid ? paymentMethod : 'Pending',
        isPaid
      }

      const printJobs = targetPrinters.map((printer: any) => ({
        restaurant_id: profile.restaurant_id,
        printer_id: printer.id,
        payload: billPayload,
        status: 'pending',
        attempts: 0
      }))

      await supabase.from('print_jobs').insert(printJobs)
      alert('Invoice print scheduled!')
    } catch (e) {
      console.error(e)
    }
  }

  const handleCheckout = async () => {
    if (!profile?.restaurant_id || !selectedTable || activeOrders.length === 0) return
    setSubmittingPayment(true)
    setError(null)
    
    try {
      const primaryOrderId = activeOrders[0].id
      const orderIds = activeOrders.map(o => o.id)

      // Delete old items
      await supabase.from('order_items').delete().in('order_id', orderIds)

      // Insert aggregated items
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
          menu_item_id: menuItemId.startsWith('fallback-') ? null : menuItemId,
          quantity: item.quantity,
          price_at_order: item.price,
          notes
        }
      }).filter(ci => ci.menu_item_id !== null)

      await supabase.from('order_items').insert(consolidatedItems)

      // Update primary order
      await supabase
        .from('orders')
        .update({ total_amount: grandTotal, status: 'served' })
        .eq('id', primaryOrderId)

      // Delete other orders
      const otherOrderIds = orderIds.filter(id => id !== primaryOrderId)
      if (otherOrderIds.length > 0) {
        await supabase.from('orders').delete().in('id', otherOrderIds)
      }

      // Create Payment
      await supabase.from('payments').insert({
        restaurant_id: profile.restaurant_id,
        order_id: primaryOrderId,
        amount: grandTotal,
        method: paymentMethod,
        status: 'completed'
      })

      await updateTableStatus(selectedTable.id, 'available')
      setSelectedTable(null)
    } catch (e: any) {
      setError(`Checkout failed: ${e.message || e}`)
    } finally {
      setSubmittingPayment(false)
    }
  }

  // --- Dynamic Table/Billing Calculations ---
  useEffect(() => {
    if (selectedTable && selectedTable.status !== 'available') {
      const runningOrders = selectedTable.orders?.filter(
        (o: any) => o.status !== 'cancelled' && o.status !== 'served'
      ) || []
      setActiveOrders(runningOrders)
      setBillingMode(false)
      setTaxPercent(5)
      setVatPercent(0)
      setDiscountPercent(0)
      setServiceChargePercent(0)
      fetchActiveOrders(selectedTable.id)
    } else {
      setActiveOrders([])
      setBillingMode(false)
    }
  }, [selectedTable])

  const getAggregatedItems = () => {
    const itemMap = new Map<string, { name: string; quantity: number; price: number; printer_type?: string }>()
    activeOrders.forEach(order => {
      order.order_items?.forEach((oi: any) => {
        const name = oi.menu_items?.name || 'Unknown'
        const price = oi.price_at_order || 0
        const printer_type = oi.menu_items?.printer_type
        const existing = itemMap.get(name)
        if (existing) {
          existing.quantity += oi.quantity
        } else {
          itemMap.set(name, { name, quantity: oi.quantity, price, printer_type })
        }
      })
    })
    return Array.from(itemMap.values())
  }

  const aggregatedItems = getAggregatedItems()
  const subtotal = aggregatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const discountAmount = subtotal * (discountPercent / 100)
  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxAmount = taxableAmount * (taxPercent / 100)
  const vatAmount = taxableAmount * (vatPercent / 100)
  const serviceChargeAmount = subtotal * (serviceChargePercent / 100)
  const grandTotal = taxableAmount + taxAmount + vatAmount + serviceChargeAmount

  const getTableOccupiedDuration = (t: Table) => {
    const list = t.orders?.filter(o => o.status !== 'cancelled' && o.status !== 'served') || []
    if (list.length === 0) return null
    const oldest = list.reduce((old, o) => {
      const time = new Date(o.created_at).getTime()
      return time < old ? time : old
    }, Infinity)
    if (oldest === Infinity) return null
    const diff = Math.floor((Date.now() - oldest) / 60000)
    return diff < 1 ? 'Just now' : diff >= 60 ? `${Math.floor(diff/60)}h ${diff%60}m` : `${diff}m`
  }

  // --- Filtering Menu Items ---
  const categoryPrinterMap = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    menuItems.forEach(item => {
      if (!map[item.category_id]) map[item.category_id] = new Set()
      map[item.category_id].add(item.printer_type)
    })
    return map
  }, [menuItems])

  const filteredCategories = categories.filter(cat => {
    if (superCategory === 'all') return true
    const printers = categoryPrinterMap[cat.id]
    if (!printers) return false
    return superCategory === 'food' ? printers.has('kitchen') : printers.has('bar')
  })

  const filteredMenuItems = menuItems.filter(item => {
    if (superCategory === 'food' && item.printer_type !== 'kitchen') return false
    if (superCategory === 'drinks' && item.printer_type !== 'bar') return false
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return item.name.toLowerCase().includes(query) || (item.description && item.description.toLowerCase().includes(query))
    }
    return true
  })

  const isNonVeg = (name: string, categoryId: string) => {
    const itemName = name.toLowerCase()
    const cat = categories.find(c => c.id === categoryId)?.name.toLowerCase() || ''
    const keywords = ['chicken', 'fish', 'prawn', 'mutton', 'egg', 'wing', 'lamb', 'pork', 'beef', 'non-veg', 'non veg']
    return keywords.some(k => itemName.includes(k)) || cat.includes('non-veg') || cat.includes('non veg')
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider animate-pulse">Initializing Interface...</p>
        </div>
      </div>
    )
  }

  const availableCount = tables.filter((t) => t.status === 'available').length
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length
  const billingCount = tables.filter((t) => t.status === 'billing').length
  const occupancyRate = tables.length > 0 ? Math.round(((occupiedCount + billingCount) / tables.length) * 100) : 0

  return (
    <div className="space-y-5 animate-in fade-in duration-300 relative pb-12 text-zinc-900 dark:text-zinc-100 select-none">
      
      {/* ────────────────────────────────────────────────────────
          GRID MODE
          ──────────────────────────────────────────────────────── */}
      {viewMode === 'tables' && (
        <>
          {/* Top Status Header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none">Live Console</span>
              <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white mt-0.5">Tables Terminal</h2>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintMonitor(true)}
                className={`flex items-center gap-2 h-9 px-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 shadow-sm bg-white dark:bg-zinc-900 ${
                  activePrinters.length === 0
                    ? 'border-zinc-200 text-zinc-400 dark:border-zinc-800'
                    : activePrinters.some(p => p.connection_status === 'offline')
                    ? 'border-red-200 text-red-500 dark:border-red-950/50 bg-red-500/5 hover:bg-red-500/10'
                    : 'border-emerald-200 text-emerald-600 dark:border-emerald-950/50 bg-emerald-500/5 hover:bg-emerald-500/10'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  activePrinters.length === 0
                    ? 'bg-zinc-300'
                    : activePrinters.some(p => p.connection_status === 'offline')
                    ? 'bg-red-500 animate-pulse'
                    : 'bg-emerald-500'
                }`} />
                <span className="text-[10px] tracking-tight">Printers</span>
              </button>

              <button
                onClick={() => fetchTables(true)}
                disabled={syncing}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-900 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white active:scale-90 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between shadow-xs">
              <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</span>
              <button onClick={() => setError(null)} className="p-1"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Premium iOS Status Summary Banner */}
          <div className="p-4 rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-900 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <span>Dynamic Occupancy</span>
              <span className="text-orange-500 font-black">{occupancyRate}% Seated</span>
            </div>
            
            {/* Smooth progress bar */}
            <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-550 to-rose-500 transition-all duration-700 rounded-full" style={{ width: `${occupancyRate}%` }} />
            </div>

            {/* Apple style pill stats */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-[10px] font-bold">
                <span className="text-green-500 font-extrabold text-sm">{availableCount}</span>
                <span className="text-zinc-400 mt-0.5 text-[8.5px]">AVAILABLE</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-[10px] font-bold">
                <span className="text-orange-500 font-extrabold text-sm">{occupiedCount}</span>
                <span className="text-zinc-400 mt-0.5 text-[8.5px]">OCCUPIED</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-[10px] font-bold">
                <span className="text-blue-500 font-extrabold text-sm">{billingCount}</span>
                <span className="text-zinc-400 mt-0.5 text-[8.5px]">BILLING</span>
              </div>
            </div>
          </div>

          {/* Elegant Table Cards Grid */}
          <div className="grid grid-cols-3 gap-3.5">
            {tables.map((table) => {
              const themeConfig = {
                available: {
                  border: 'border-zinc-200/60 dark:border-zinc-900 bg-white dark:bg-zinc-900/40 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/60',
                  badge: 'bg-green-500',
                  statusColor: 'text-green-600 dark:text-green-400',
                  iconColor: 'text-green-500/20'
                },
                occupied: {
                  border: 'border-orange-500/20 dark:border-orange-500/35 bg-orange-500/[0.02] dark:bg-orange-500/[0.05] hover:bg-orange-500/[0.04] dark:hover:bg-orange-500/[0.08]',
                  badge: 'bg-orange-500',
                  statusColor: 'text-orange-600 dark:text-orange-400',
                  iconColor: 'text-orange-500/25'
                },
                billing: {
                  border: 'border-blue-500/25 dark:border-blue-500/35 bg-blue-500/[0.02] dark:bg-blue-500/[0.05] hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.08]',
                  badge: 'bg-blue-500',
                  statusColor: 'text-blue-600 dark:text-blue-400',
                  iconColor: 'text-blue-500/25'
                },
              }[table.status]

              const runOrders = table.orders?.filter(o => o.status !== 'cancelled' && o.status !== 'served') || []
              const totalAmount = runOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
              const itemsCount = runOrders.reduce((sum, o) => sum + (o.order_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0), 0)
              const elapsed = getTableOccupiedDuration(table)

              return (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  disabled={updatingTableId === table.id}
                  className={`flex flex-col justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.95] text-left h-28 relative shadow-xs bg-background ${themeConfig.border}`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div>
                      <span className="text-[7.5px] font-black text-zinc-400 uppercase tracking-widest block leading-none">Table</span>
                      <span className="text-lg font-black text-zinc-900 dark:text-white leading-none mt-0.5 inline-block">T{table.number}</span>
                    </div>
                    
                    <div className="flex items-center gap-0.5 text-[8px] font-bold text-zinc-450">
                      <Users className="w-2.5 h-2.5 text-zinc-400" />
                      {table.capacity}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[8.5px] font-extrabold uppercase tracking-wider">
                    <span className={`w-2 h-2 rounded-full ${themeConfig.badge}`} />
                    <span className={themeConfig.statusColor}>{table.status}</span>
                  </div>

                  <div className="w-full border-t border-zinc-100 dark:border-zinc-900/60 pt-2 flex justify-between items-center text-[9px] font-black text-zinc-800 dark:text-zinc-200">
                    {totalAmount > 0 ? (
                      <>
                        <span className="text-zinc-400 font-bold leading-none">{itemsCount} items {elapsed && `• ${elapsed}`}</span>
                        <span className="font-mono tabular-nums">₹{totalAmount.toFixed(0)}</span>
                      </>
                    ) : (
                      <span className="text-zinc-350 dark:text-zinc-700 font-extrabold italic leading-none">Empty</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────
          UNIFIED MENU / ORDERING VIEW (GPU-Accelerated Full-Frame Overlay)
          ──────────────────────────────────────────────────────── */}
      {viewMode === 'menu' && selectedTable && (
        <div className="fixed inset-0 z-[60] bg-zinc-50 dark:bg-zinc-950 flex flex-col p-4 animate-in slide-in-from-bottom duration-250 select-none">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200/80 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (cart.length > 0 && !confirm('Discard active items in cart?')) return
                  saveCartState([])
                  setViewMode('tables')
                  setSelectedTable(null)
                }}
                className="p-2 border border-zinc-200/80 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white active:scale-90 transition-all shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block leading-none">Ordering System</span>
                <h3 className="text-sm font-black text-zinc-900 dark:text-white leading-none mt-1">Table T{selectedTable.number}</h3>
              </div>
            </div>
            {orderSuccess && (
              <span className="text-[9px] font-black text-white bg-green-500 px-2.5 py-1 rounded-xl shadow-sm animate-bounce">
                Success
              </span>
            )}
          </div>

          {/* Segmented Super Category Picker */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-200/60 dark:bg-zinc-900/60 rounded-2xl mt-3 shrink-0">
            {['all', 'food', 'drinks'].map((id) => (
              <button
                key={id}
                onClick={() => {
                  setSuperCategory(id as any)
                  setSelectedCategory('all')
                }}
                className={`py-1.5 text-[10px] font-black rounded-xl transition-all active:scale-[0.97] cursor-pointer ${
                  superCategory === id 
                    ? 'bg-white text-zinc-950 dark:bg-zinc-800 dark:text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'
                }`}
              >
                {id === 'all' ? '🍽️ All' : id === 'food' ? '🍔 Food' : '🍹 Drinks'}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative mt-3 shrink-0">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search food, beverages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-250/70 dark:border-zinc-850 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 placeholder-zinc-400 transition-all font-medium text-zinc-900 dark:text-white"
            />
          </div>

          {/* Category horizontal pills */}
          <div className="flex gap-2 overflow-x-auto py-3.5 scrollbar-none select-none shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-[10px] font-black whitespace-nowrap border transition-all active:scale-95 ${
                selectedCategory === 'all' 
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-sm' 
                  : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-500'
              }`}
            >
              All Categories
            </button>
            {filteredCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-[10px] font-black whitespace-nowrap border transition-all active:scale-95 ${
                  selectedCategory === cat.id 
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-sm' 
                    : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-500'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items List (Scrollable Area) */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pb-24 pr-0.5">
            {loadingMenu ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Loading items...</p>
              </div>
            ) : filteredMenuItems.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-xs font-semibold">No items match filters.</div>
            ) : (
              filteredMenuItems.map(item => {
                const qty = getQtyInCart(item.id)
                const isVeg = !isNonVeg(item.name, item.category_id)
                
                return (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      qty > 0 ? 'border-orange-500/30 bg-orange-500/[0.01] shadow-xs' : 'border-zinc-200/80 dark:border-zinc-900 bg-white dark:bg-zinc-900/20'
                    }`}
                  >
                    <div className="space-y-1.5 pr-4 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`w-3.5 h-3.5 border flex items-center justify-center rounded-[4px] bg-white shrink-0 ${
                          isVeg ? 'border-green-500/70' : 'border-red-500/70'
                        }`}>
                          <span className={`w-1.5 h-1.5 ${isVeg ? 'bg-green-500 rounded-full' : 'bg-red-500 rotate-45'}`} />
                        </span>
                        
                        <h4 className="text-xs font-black text-zinc-900 dark:text-white leading-tight">{item.name}</h4>
                        
                        <span className="text-[7.5px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-zinc-150 dark:bg-zinc-800 text-zinc-400 border border-zinc-200/30 dark:border-zinc-700/30">
                          {item.printer_type}
                        </span>
                      </div>
                      
                      {item.description && (
                        <p className="text-[9.5px] text-zinc-400 dark:text-zinc-500 line-clamp-1 leading-none">{item.description}</p>
                      )}
                      
                      <span className="text-xs font-black text-zinc-900 dark:text-white block font-mono">₹{item.price.toFixed(0)}</span>
                    </div>

                    <div className="shrink-0 select-none">
                      {qty === 0 ? (
                        <button
                          onClick={() => addToCart(item)}
                          className="h-8 px-4 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl text-[10px] font-black hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm"
                        >
                          ADD
                        </button>
                      ) : (
                        <div className="flex items-center bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl h-8 font-black text-xs px-1.5 shadow-sm">
                          <button onClick={() => removeFromCart(item.id)} className="w-7 h-full flex items-center justify-center active:scale-75 cursor-pointer">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-5 text-center text-[10px] font-black font-mono">{qty}</span>
                          <button onClick={() => addToCart(item)} className="w-7 h-full flex items-center justify-center active:scale-75 cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Sticky Bottom Cart Panel Overlay */}
          {cart.length > 0 && (
            <div className="absolute bottom-5 left-4 right-4 bg-zinc-900/95 dark:bg-white/95 text-white dark:text-zinc-950 p-3 rounded-2xl flex items-center justify-between shadow-2xl backdrop-blur-md border border-white/10 dark:border-black/5 z-40 select-none">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="flex items-center gap-3 text-left text-xs font-bold cursor-pointer active:scale-95"
              >
                <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <div className="font-black text-white dark:text-zinc-900">{cart.reduce((s,c)=>s+c.quantity,0)} Items</div>
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono font-bold">
                    ₹{cart.reduce((s,c)=>s+(c.menuItem.price*c.quantity),0).toFixed(0)} + Tax
                  </div>
                </div>
              </button>

              <button
                onClick={triggerSendKOT}
                disabled={submittingOrder}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] px-5 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {submittingOrder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send KOT'}
              </button>
            </div>
          )}

          {/* Cart review overlay modal */}
          {isCartOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 backdrop-blur-xs select-none">
              <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-[30px] p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-250">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400">Review Cart Items</h4>
                  <button onClick={() => setIsCartOpen(false)} className="p-1"><X className="w-5 h-5 text-zinc-400" /></button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-none">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex flex-col p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 text-[11px] gap-2">
                      <div className="flex justify-between items-center font-bold">
                        <span className="font-extrabold text-zinc-900 dark:text-white">{item.menuItem.name}</span>
                        <span className="font-black font-mono">₹{(item.menuItem.price * item.quantity).toFixed(0)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        {editingNotesId === item.menuItem.id ? (
                          <input
                            type="text"
                            placeholder="Add chef instructions..."
                            value={item.notes}
                            onChange={(e) => {
                              const note = e.target.value
                              saveCartState(cart.map(c => c.menuItem.id === item.menuItem.id ? { ...c, notes: note } : c))
                            }}
                            onBlur={() => setEditingNotesId(null)}
                            autoFocus
                            className="bg-white dark:bg-zinc-900 text-[10px] px-2.5 py-1.5 rounded-lg flex-1 mr-4 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                          />
                        ) : (
                          <button 
                            onClick={() => setEditingNotesId(item.menuItem.id)}
                            className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-bold hover:text-orange-500 transition-colors"
                          >
                            {item.notes ? `📝 Instruction: ${item.notes}` : '+ Add Instruction'}
                          </button>
                        )}

                        <div className="flex items-center bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl h-7 px-1 shadow-xs">
                          <button onClick={() => removeFromCart(item.menuItem.id)} className="w-6"><Minus className="w-3 h-3 mx-auto" /></button>
                          <span className="w-4 text-center text-[9px] font-black font-mono">{item.quantity}</span>
                          <button onClick={() => addToCart(item.menuItem)} className="w-6"><Plus className="w-3 h-3 mx-auto" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-zinc-150 dark:border-zinc-800 flex justify-between text-xs font-black">
                  <span className="text-zinc-455 uppercase tracking-widest text-[9px]">Consolidated Subtotal</span>
                  <span className="text-orange-500 font-mono text-sm">₹{cart.reduce((s,c)=>s+(c.menuItem.price*c.quantity),0).toFixed(0)}</span>
                </div>

                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-black text-xs rounded-2xl active:scale-95 transition-all"
                >
                  Continue Adding Items
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          DRAWER / BOTTOM SHEET MODAL (Single screen actions)
          ──────────────────────────────────────────────────────── */}
      {selectedTable && viewMode === 'tables' && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center select-none">
          <div className="fixed inset-0 bg-zinc-950/45 backdrop-blur-xs transition-opacity duration-300" onClick={() => setSelectedTable(null)} />
          
          <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border-t border-zinc-200/60 dark:border-zinc-800 rounded-t-[32px] p-5 shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[85vh] flex flex-col">
            
            <div className="h-1.5 w-12 bg-zinc-250 dark:bg-zinc-800 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-white font-black text-sm shadow-md shadow-orange-500/10">
                  T{selectedTable.number}
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                    {billingMode ? 'Billing & Settlements' : 'Table Operations'}
                  </h3>
                  <p className="text-[9px] text-zinc-400 font-bold mt-0.5">
                    Seats: {selectedTable.capacity} pax • Status: <span className="capitalize text-orange-500 font-extrabold">{selectedTable.status}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTable(null)} 
                className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 dark:hover:text-white dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pane Content */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-0.5 scrollbar-none">
              {billingMode ? (
                <div className="space-y-4.5">
                  {fetchingOrders ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3">
                      <div className="w-7 h-7 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest animate-pulse">Compiling Bill...</p>
                    </div>
                  ) : activeOrders.length === 0 ? (
                    <div className="py-10 text-center text-xs text-zinc-400 font-black">No active KOT orders found.</div>
                  ) : (
                    <>
                      {/* Summary Header */}
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5 shrink-0">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Order Summary</span>
                        <span className="text-[9px] font-bold text-zinc-400">{aggregatedItems.length} items</span>
                      </div>

                      {/* Items list with quantity modifiers */}
                      <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-none pr-1">
                        {aggregatedItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10.5px] font-bold text-zinc-800 dark:text-zinc-200">
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-extrabold text-foreground">{item.name}</span>
                              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">₹{item.price.toFixed(0)} each</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center bg-zinc-150/50 dark:bg-zinc-800 rounded-xl h-6 p-0.5 border border-zinc-200/50 dark:border-zinc-800/80">
                                <button 
                                  onClick={() => handleUpdateItemQuantity(item.name, item.quantity, -1)}
                                  className="w-5 text-zinc-500 hover:text-zinc-805 dark:hover:text-zinc-200 transition-colors"
                                >
                                  <Minus className="w-2.5 h-2.5 mx-auto" />
                                </button>
                                <span className="w-4 text-center text-[9px] font-black text-foreground">{item.quantity}</span>
                                <button 
                                  onClick={() => handleUpdateItemQuantity(item.name, item.quantity, 1)}
                                  className="w-5 text-zinc-500 hover:text-zinc-805 dark:hover:text-zinc-200 transition-colors"
                                >
                                  <Plus className="w-2.5 h-2.5 mx-auto" />
                                </button>
                              </div>
                              <span className="w-14 text-right font-black font-mono text-foreground">₹{(item.price * item.quantity).toFixed(0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Cart Adjustments Dropdowns (Minimalist side-by-side row) */}
                      <div className="grid grid-cols-3 gap-2 bg-zinc-50/50 dark:bg-zinc-900/40 p-2.5 rounded-2xl border border-zinc-150 dark:border-zinc-850">
                        {/* Discount */}
                        <div className="space-y-0.5">
                          <span className="text-[8.5px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">Discount</span>
                          <select
                            value={discountPercent}
                            onChange={(e) => setDiscountPercent(Number(e.target.value))}
                            className="w-full bg-background border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-1.5 py-1 text-[10.5px] font-bold text-foreground focus:outline-none focus:border-orange-500 cursor-pointer"
                          >
                            {[0, 5, 10, 15, 20].map(val => (
                              <option key={val} value={val}>{val}% Off</option>
                            ))}
                          </select>
                        </div>

                        {/* GST */}
                        <div className="space-y-0.5">
                          <span className="text-[8.5px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">GST Tax</span>
                          <select
                            value={taxPercent}
                            onChange={(e) => setTaxPercent(Number(e.target.value))}
                            className="w-full bg-background border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-1.5 py-1 text-[10.5px] font-bold text-foreground focus:outline-none focus:border-orange-500 cursor-pointer"
                          >
                            {[0, 5, 12, 18, 28].map(val => (
                              <option key={val} value={val}>{val}% GST</option>
                            ))}
                          </select>
                        </div>

                        {/* VAT */}
                        <div className="space-y-0.5">
                          <span className="text-[8.5px] font-bold text-zinc-400 uppercase tracking-wider block px-0.5">VAT</span>
                          <select
                            value={vatPercent}
                            onChange={(e) => setVatPercent(Number(e.target.value))}
                            className="w-full bg-background border border-zinc-200/70 dark:border-zinc-800 rounded-xl px-1.5 py-1 text-[10.5px] font-bold text-foreground focus:outline-none focus:border-orange-500 cursor-pointer"
                          >
                            {[0, 5, 10, 14.5, 20].map(val => (
                              <option key={val} value={val}>{val}% VAT</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Checkout Computations (Sleek receipt-card style) */}
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
                        {serviceChargePercent > 0 && (
                          <div className="flex justify-between">
                            <span>Service Charge ({serviceChargePercent}%)</span>
                            <span className="text-zinc-900 dark:text-white font-mono font-black">₹{serviceChargeAmount.toFixed(2)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-xs font-black text-zinc-900 dark:text-white pt-2.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 mt-1">
                          <span className="uppercase tracking-widest text-[9.5px]">Amount to Pay</span>
                          <span className="text-base font-black text-orange-550 font-mono">₹{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div className="space-y-1.5">
                        <span className="text-[8.5px] font-black text-zinc-400 uppercase tracking-widest block px-0.5">Settlement Method</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['upi', 'cash', 'card'] as const).map(method => (
                            <button
                              key={method}
                              onClick={() => setPaymentMethod(method)}
                              className={`py-2 rounded-xl text-[10px] font-black border transition-all active:scale-95 cursor-pointer ${
                                paymentMethod === method 
                                  ? 'bg-zinc-950 text-white border-transparent dark:bg-white dark:text-zinc-950 shadow-sm' 
                                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                              }`}
                            >
                              {method === 'upi' ? '📱 UPI' : method === 'cash' ? '💵 Cash' : '💳 Card'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* REGULAR CONTROL PANE */
                <div className="space-y-4">
                  <div className="space-y-2 shrink-0">
                    <button
                      onClick={() => setViewMode('menu')}
                      className="flex w-full items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/10 active:scale-97 transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4 shrink-0" />
                      Take Order (Menu)
                    </button>

                    {selectedTable.status !== 'available' && (
                      <button
                        onClick={() => setBillingMode(true)}
                        className="flex w-full items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 text-indigo-500 font-black text-xs active:scale-97 transition-all cursor-pointer"
                      >
                        <Receipt className="w-4 h-4 shrink-0" />
                        Compile Bill & Checkout
                      </button>
                    )}
                  </div>

                  <span className="text-[8.5px] font-black text-zinc-400 uppercase tracking-widest block">Table Seating Status</span>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'available', icon: CheckCircle, label: 'Mark Available', desc: 'Table is empty, clean, and ready for new guests' },
                      { id: 'occupied', icon: Coffee, label: 'Mark Occupied', desc: 'Guests seated and actively taking orders' },
                      { id: 'billing', icon: Receipt, label: 'Mark Billing', desc: 'Dining completed, requested checkout receipt' }
                    ].map(statusItem => {
                      const Icon = statusItem.icon
                      const isMatch = selectedTable.status === statusItem.id
                      const textColors = {
                        available: 'text-green-600 border-green-500/20 bg-green-500/5',
                        occupied: 'text-orange-600 border-orange-500/20 bg-orange-500/5',
                        billing: 'text-blue-600 border-blue-500/20 bg-blue-500/5'
                      }[statusItem.id]

                      return (
                        <button
                          key={statusItem.id}
                          onClick={() => triggerUpdateTableStatus(statusItem.id as any)}
                          className={`flex items-center justify-between p-3 border rounded-2xl text-left active:scale-[0.97] transition-all cursor-pointer ${
                            isMatch ? textColors : 'border-zinc-200/60 dark:border-zinc-800 bg-background hover:bg-zinc-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 shrink-0" />
                            <div>
                              <h4 className="text-[10px] font-black leading-tight">{statusItem.label}</h4>
                              <p className="text-[8.5px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-none">{statusItem.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions button group */}
            <div className="pt-3.5 border-t border-zinc-150 dark:border-zinc-800 shrink-0 flex gap-2">
              {billingMode ? (
                <>
                  <button
                    onClick={() => setBillingMode(false)}
                    disabled={submittingPayment}
                    className="flex-1 py-3 border border-zinc-200 dark:border-zinc-800 bg-background text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl text-xs font-bold cursor-pointer disabled:opacity-50 active:scale-95 transition-all"
                  >
                    Back
                  </button>
                  {activeOrders.length > 0 && (
                    <>
                      <button
                        onClick={triggerPrintBill}
                        disabled={submittingPayment || fetchingOrders}
                        className="flex-1 py-3 border border-zinc-200 dark:border-zinc-800 bg-background text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl text-xs font-bold cursor-pointer disabled:opacity-50 active:scale-95 transition-all text-center"
                      >
                        Print Bill
                      </button>
                      <button
                        onClick={triggerClearTable}
                        disabled={submittingPayment || fetchingOrders}
                        className="flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50 text-center"
                      >
                        {submittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Clear Table'}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setSelectedTable(null)}
                  className="w-full py-3.5 border border-zinc-200 dark:border-zinc-800 bg-background text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-2xl text-xs font-bold active:scale-[0.97] transition-all cursor-pointer"
                >
                  Close Panel
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Dialog Overlay */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none">
          <div 
            className="fixed inset-0 bg-zinc-950/45 backdrop-blur-xs transition-opacity duration-300" 
            onClick={() => setConfirmDialog(null)} 
          />
          <div className="relative z-10 w-full max-w-xs bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col text-center space-y-4">
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <h3 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider">
                {confirmDialog.title}
              </h3>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold leading-normal">
                {confirmDialog.description}
              </p>
            </div>
            <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] font-black text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const cb = confirmDialog.onConfirm
                  setConfirmDialog(null)
                  await cb()
                }}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black active:scale-95 transition-all cursor-pointer"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Job Toast Notification */}
      {newJobToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border animate-in fade-in slide-in-from-top-4 duration-300 bg-white dark:bg-zinc-900 ${
          newJobToast.status === 'printed' 
            ? 'border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : 'border-red-500/20 text-red-500 dark:text-red-400'
        }`}>
          {newJobToast.status === 'printed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-black uppercase tracking-wider">
              {newJobToast.type} Print {newJobToast.status === 'printed' ? 'Success' : 'Failed'}
            </span>
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold mt-0.5">{newJobToast.message}</span>
          </div>
          <button 
            onClick={() => setNewJobToast(null)}
            className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 p-0.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 ml-1.5 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Printers & Print Jobs Monitor Modal */}
      {showPrintMonitor && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
          <div 
            className="fixed inset-0 bg-transparent" 
            onClick={() => setShowPrintMonitor(false)} 
          />
          <div className="relative z-10 bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm p-5 border border-zinc-200/60 dark:border-zinc-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest leading-none">POS Hardware</span>
                <h3 className="text-xs font-black tracking-wider text-zinc-900 dark:text-white mt-1 uppercase">Printer Terminal</h3>
              </div>
              <button 
                onClick={() => setShowPrintMonitor(false)}
                className="p-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-zinc-400 dark:text-zinc-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List of Printers */}
            <div className="space-y-1.5">
              <h4 className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Active Devices</h4>
              {activePrinters.length === 0 ? (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">No active printers configured.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {activePrinters.map(p => (
                    <div 
                      key={p.id} 
                      title={`${p.type.toUpperCase()} • ${p.ip_address}`}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all ${
                        p.connection_status === 'offline'
                          ? 'bg-red-500/5 border-red-500/10 text-red-550'
                          : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-650 dark:text-emerald-400'
                      }`}
                    >
                      <div className={`w-1 h-1 rounded-full shrink-0 ${
                        p.connection_status === 'offline' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
                      }`} />
                      <span>{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List of Recent Print Jobs */}
            <div className="space-y-2">
              <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-wider">Recent Jobs</h4>
              {recentPrintJobs.length === 0 ? (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">No recent print jobs.</p>
              ) : (
                <div className="grid gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {recentPrintJobs.map(job => {
                    const type = job.payload?.type || 'PRINT'
                    const table = job.payload?.tableNumber || '?'
                    const time = new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    
                    return (
                      <div key={job.id} className="p-2.5 rounded-2xl bg-zinc-55/30 dark:bg-zinc-800/10 border border-zinc-100/60 dark:border-zinc-850 text-[10px] space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-zinc-700 dark:text-zinc-300">{type} (T{table})</span>
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-550 font-bold mt-0.5">{time}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-black uppercase text-[7.5px] tracking-widest ${
                              job.status === 'printed'
                                ? 'text-emerald-650 dark:text-emerald-400'
                                : job.status === 'failed'
                                ? 'text-red-500'
                                : 'text-orange-500 animate-pulse'
                            }`}>
                              {job.status}
                            </span>
                            
                            {/* Action Buttons for non-completed jobs */}
                            {job.status !== 'printed' && (
                              <div className="flex items-center gap-1 ml-1 border-l border-zinc-200 dark:border-zinc-800/80 pl-1.5">
                                <button
                                  onClick={() => handleRetryPrintJob(job.id)}
                                  title="Retry Print"
                                  className="p-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-550 dark:text-zinc-400 active:scale-90"
                                >
                                  <RefreshCw className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={() => handleCancelPrintJob(job.id)}
                                  title="Cancel Print"
                                  className="p-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded-md transition-colors text-zinc-550 dark:text-zinc-400 active:scale-90"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Error Message display */}
                        {job.status === 'failed' && job.error_message && (
                          <div className="text-[7.5px] text-red-550 dark:text-red-400 font-semibold bg-red-500/5 p-1.5 rounded-lg border border-red-500/10 leading-normal">
                            Reason: {job.error_message}
                          </div>
                        )}

                        {/* Pending details display */}
                        {job.status === 'pending' && (
                          <div className="text-[7.5px] text-orange-550 dark:text-orange-400 font-semibold bg-orange-500/5 p-1.5 rounded-lg leading-normal">
                            Waiting in printer queue...
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
