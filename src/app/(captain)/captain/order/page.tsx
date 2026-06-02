'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ClipboardList, 
  ShoppingBag, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  X,
  FileText,
  RefreshCw,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface Table {
  id: string
  number: number
  capacity: number
  status: 'available' | 'occupied' | 'billing'
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

function OrderPageContent() {
  const { profile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tableId = searchParams.get('tableId')

  const supabase = createClient()

  // State Variables
  const [table, setTable] = useState<Table | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  
  // UI States
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)

  // 1. Fetch initial details: Table, Categories, Menu Items
  const fetchData = async (forceSeed = false) => {
    if (!profile?.restaurant_id || !tableId) return
    setLoading(true)
    setError(null)
    
    try {
      // A. Fetch Selected Table Info
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('id, number, capacity, status')
        .eq('id', tableId)
        .single()

      if (tableError) throw tableError
      setTable(tableData as Table)

      // B. Fetch Menu Categories
      const { data: catData, error: catError } = await supabase
        .from('menu_categories')
        .select('id, name, sort_order')
        .eq('restaurant_id', profile.restaurant_id)
        .order('sort_order', { ascending: true })

      if (catError) throw catError

      // C. Fetch Menu Items
      const { data: itemData, error: itemError } = await supabase
        .from('menu_items')
        .select('id, name, description, price, is_available, printer_type, category_id')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('is_available', true)
        .order('name', { ascending: true })

      if (itemError) throw itemError

      // D. Auto-seed Mock Menu if empty or requested
      if ((!catData || catData.length === 0 || !itemData || itemData.length === 0) || forceSeed) {
        if (profile.role === 'admin' || profile.role === 'manager') {
          setSeeding(true)
          await seedMenuData(profile.restaurant_id)
          
          // Re-fetch after seeding
          const { data: seedCat } = await supabase
            .from('menu_categories')
            .select('id, name, sort_order')
            .eq('restaurant_id', profile.restaurant_id)
            .order('sort_order', { ascending: true })
            
          const { data: seedItem } = await supabase
            .from('menu_items')
            .select('id, name, description, price, is_available, printer_type, category_id')
            .eq('restaurant_id', profile.restaurant_id)
            .eq('is_available', true)
            .order('name', { ascending: true })

          setCategories(seedCat || [])
          setMenuItems(seedItem || [])
        } else {
          setError("The restaurant menu is currently empty. Please log in as a Manager or Admin to initialize and seed the POS menu items.")
        }
      } else {
        setCategories(catData as MenuCategory[])
        setMenuItems(itemData as MenuItem[])
      }

    } catch (err: any) {
      console.error('Error fetching POS data:', err?.message || err)
      setError(err.message || 'Failed to retrieve tables or menu configuration.')
    } finally {
      setLoading(false)
      setSeeding(false)
    }
  }

  // Seeder helper to generate awesome starting menus
  const seedMenuData = async (restaurantId: string) => {
    try {
      // Clean existing (for safety in force-seed)
      const { error: delErr } = await supabase
        .from('menu_categories')
        .delete()
        .eq('restaurant_id', restaurantId)
      
      if (delErr) throw delErr

      const categoriesToSeed = [
        { name: 'Drinks', sort_order: 1, restaurant_id: restaurantId },
        { name: 'Starters', sort_order: 2, restaurant_id: restaurantId },
        { name: 'Mains', sort_order: 3, restaurant_id: restaurantId },
        { name: 'Desserts', sort_order: 4, restaurant_id: restaurantId },
      ]

      const { data: insertedCats, error: catError } = await supabase
        .from('menu_categories')
        .insert(categoriesToSeed)
        .select()

      if (catError || !insertedCats) throw catError || new Error('Seeding categories returned empty response')

      const catMap = new Map(insertedCats.map(c => [c.name, c.id]))

      const itemsToSeed = [
        // Drinks
        { restaurant_id: restaurantId, category_id: catMap.get('Drinks'), name: 'Mojito Fresh', description: 'Lime, fresh mint leaves, white rum, brown sugar & sparkling club soda', price: 6.50, is_available: true, printer_type: 'bar' },
        { restaurant_id: restaurantId, category_id: catMap.get('Drinks'), name: 'Old Fashioned', description: 'Rich rye whiskey with aromatic bitters & orange zest peel', price: 9.00, is_available: true, printer_type: 'bar' },
        { restaurant_id: restaurantId, category_id: catMap.get('Drinks'), name: 'Tipsy IPA Beer', description: 'Locally crafted crisp double-hopped premium IPA', price: 7.00, is_available: true, printer_type: 'bar' },
        { restaurant_id: restaurantId, category_id: catMap.get('Drinks'), name: 'Cabernet Red Wine', description: 'Robust, elegant red wine glass with hints of cherry & oak', price: 8.50, is_available: true, printer_type: 'bar' },
        
        // Starters
        { restaurant_id: restaurantId, category_id: catMap.get('Starters'), name: 'Buffalo Wings', description: 'Tangy hot buffalo glazed wings served with garlic ranch and celery', price: 10.50, is_available: true, printer_type: 'kitchen' },
        { restaurant_id: restaurantId, category_id: catMap.get('Starters'), name: 'Truffle Parm Fries', description: 'Crispy thick fries tossed in white truffle oil, rosemary & shredded parmesan', price: 7.50, is_available: true, printer_type: 'kitchen' },
        { restaurant_id: restaurantId, category_id: catMap.get('Starters'), name: 'Tomato Bruschetta', description: 'Grilled farm bread topped with diced vine tomatoes, sweet basil & extra virgin oil', price: 8.00, is_available: true, printer_type: 'kitchen' },
        
        // Mains
        { restaurant_id: restaurantId, category_id: catMap.get('Mains'), name: 'Signature POS Burger', description: 'Double flame-grilled angus beef patty, smoked cheddar, garlic aioli & brioche bun', price: 15.00, is_available: true, printer_type: 'kitchen' },
        { restaurant_id: restaurantId, category_id: catMap.get('Mains'), name: 'Ribeye Steak House', description: '12oz juicy prime grass-fed steak plated with herb butter & roasted baby potatoes', price: 28.00, is_available: true, printer_type: 'kitchen' },
        { restaurant_id: restaurantId, category_id: catMap.get('Mains'), name: 'Porcini Risotto', description: 'Rich, creamy slow-cooked arborio rice loaded with wild porcini and parmesan curls', price: 16.50, is_available: true, printer_type: 'kitchen' },
        { restaurant_id: restaurantId, category_id: catMap.get('Mains'), name: 'Woodfire Margherita Pizza', description: 'Artisanal thin sourdough crust, san marzano tomato base, fresh buffalo mozzarella & basil', price: 13.00, is_available: true, printer_type: 'kitchen' },
        
        // Desserts
        { restaurant_id: restaurantId, category_id: catMap.get('Desserts'), name: 'Molten Lava Cake', description: 'Warm dark chocolate cake bursting with liquid fudge, vanilla gelato scoop', price: 8.00, is_available: true, printer_type: 'kitchen' },
        { restaurant_id: restaurantId, category_id: catMap.get('Desserts'), name: 'NY Strawberry Cheesecake', description: 'Rich, smooth authentic cream cheese cake decorated with wild strawberry glaze', price: 7.50, is_available: true, printer_type: 'kitchen' },
        { restaurant_id: restaurantId, category_id: catMap.get('Desserts'), name: 'Classic Espresso Tiramisu', description: 'Espresso-soaked ladyfingers, rich whipped egg-free mascarpone mousse & cocoa', price: 8.50, is_available: true, printer_type: 'kitchen' }
      ]

      const { error: itemError } = await supabase.from('menu_items').insert(itemsToSeed)
      if (itemError) throw itemError
    } catch (err: any) {
      console.error('Menu seeding exception:', err?.message || err)
      throw err
    }
  }

  // Load tables & menu on start
  useEffect(() => {
    if (profile?.restaurant_id && tableId) {
      fetchData()
    }
  }, [profile?.restaurant_id, tableId])

  // 2. LocalStorage Caching for persistent cart per table
  useEffect(() => {
    if (!profile?.restaurant_id || !tableId) return
    const cartKey = `tipsy-cart-${profile.restaurant_id}-${tableId}`
    const savedCart = localStorage.getItem(cartKey)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (err) {
        console.error('Failed to load cached cart:', err)
      }
    }
  }, [profile?.restaurant_id, tableId])

  const updateCartState = (newCart: CartItem[]) => {
    setCart(newCart)
    if (profile?.restaurant_id && tableId) {
      const cartKey = `tipsy-cart-${profile.restaurant_id}-${tableId}`
      if (newCart.length === 0) {
        localStorage.removeItem(cartKey)
      } else {
        localStorage.setItem(cartKey, JSON.stringify(newCart))
      }
    }
  }

  // 3. Cart Manipulations
  const addToCart = (item: MenuItem) => {
    const existing = cart.find(c => c.menuItem.id === item.id)
    if (existing) {
      const updated = cart.map(c => 
        c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      )
      updateCartState(updated)
    } else {
      const updated = [...cart, { menuItem: item, quantity: 1, notes: '' }]
      updateCartState(updated)
    }
  }

  const removeFromCart = (itemId: string) => {
    const existing = cart.find(c => c.menuItem.id === itemId)
    if (!existing) return
    
    if (existing.quantity === 1) {
      const updated = cart.filter(c => c.menuItem.id !== itemId)
      updateCartState(updated)
    } else {
      const updated = cart.map(c => 
        c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
      )
      updateCartState(updated)
    }
  }

  const updateItemNotes = (itemId: string, notes: string) => {
    const updated = cart.map(c => 
      c.menuItem.id === itemId ? { ...c, notes } : c
    )
    updateCartState(updated)
  }

  const getQuantityInCart = (itemId: string) => {
    const item = cart.find(c => c.menuItem.id === itemId)
    return item ? item.quantity : 0
  }

  const getNotesInCart = (itemId: string) => {
    const item = cart.find(c => c.menuItem.id === itemId)
    return item ? item.notes : ''
  }

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0)
  const taxRate = 0.05 // 5% GST standard mock
  const cartTax = cartSubtotal * taxRate
  const cartTotal = cartSubtotal + cartTax
  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // 4. Place Order Submission to Supabase
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !profile?.restaurant_id || !tableId || !table) return
    setSubmitting(true)
    setError(null)

    try {
      // A. Create Order entry
      const { data: newOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          restaurant_id: profile.restaurant_id,
          table_id: tableId,
          captain_id: profile.id,
          status: 'preparing',
          total_amount: cartTotal
        })
        .select()
        .single()

      if (orderErr) throw orderErr
      if (!newOrder) throw new Error("Failed to initialize orders record")

      // B. Create Order Items entries
      const orderItemsInsert = cart.map(c => ({
        restaurant_id: profile.restaurant_id,
        order_id: newOrder.id,
        menu_item_id: c.menuItem.id,
        quantity: c.quantity,
        notes: c.notes || null,
        price_at_order: c.menuItem.price
      }))

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(orderItemsInsert)

      if (itemsErr) throw itemsErr

      // C. Set Table status to "occupied" in realtime
      const { error: tableErr } = await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', tableId)

      if (tableErr) throw tableErr

      // D. ROUTING & ROUTED KOT PRINT JOBS GENERATION
      // Fetch restaurant name
      let restaurantName = 'Tipsy POS'
      try {
        const { data: restData } = await supabase
          .from('restaurants')
          .select('name')
          .eq('id', profile.restaurant_id)
          .single()
        if (restData?.name) {
          restaurantName = restData.name
        }
      } catch (e) {
        console.error('Failed to fetch restaurant name for KOT:', e)
      }

      // Fetch active printers for the restaurant
      const { data: printers, error: printersErr } = await supabase
        .from('printers')
        .select('id, name, type, is_active')
        .eq('restaurant_id', profile.restaurant_id)
        .eq('is_active', true)

      if (printersErr) {
        console.error('Failed to fetch printers for routing:', printersErr)
      }

      // Group cart items by printer_type (kitchen/bar)
      const itemsByPrinterType: Record<string, typeof cart> = {}
      cart.forEach(item => {
        const pType = item.menuItem.printer_type || 'kitchen'
        if (!itemsByPrinterType[pType]) {
          itemsByPrinterType[pType] = []
        }
        itemsByPrinterType[pType].push(item)
      })

      // Generate print jobs for each printer type group
      const printJobsToInsert: any[] = []

      for (const [printerType, groupedItems] of Object.entries(itemsByPrinterType)) {
        if (groupedItems.length === 0) continue

        // Resolve matching printers
        let matchedPrinters = printers?.filter(p => p.type === printerType) || []

        // Fallback routing: if no printer found for type (e.g. bar), send to kitchen printer or any active printer
        if (matchedPrinters.length === 0 && printers && printers.length > 0) {
          console.warn(`No active printers found for type [${printerType}]. Attempting fallback routing...`)
          const kitchenPrinter = printers.find(p => p.type === 'kitchen')
          matchedPrinters = kitchenPrinter ? [kitchenPrinter] : [printers[0]]
        }

        // If still no printers, skip and log warning
        if (matchedPrinters.length === 0) {
          console.error(`No printers configured at all. Could not schedule KOT for [${printerType}] items.`)
          continue
        }

        // Format KOT slip payload
        const kotPayload = {
          type: 'KOT',
          restaurantName,
          tableName: 'Table',
          tableNumber: String(table.number),
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

        // Create job for each matching printer
        matchedPrinters.forEach(printer => {
          printJobsToInsert.push({
            restaurant_id: profile.restaurant_id,
            printer_id: printer.id,
            payload: kotPayload,
            status: 'pending',
            attempts: 0
          })
        })
      }

      // Insert print jobs in Supabase (will trigger the local print server via Realtime!)
      if (printJobsToInsert.length > 0) {
        const { error: printJobsErr } = await supabase
          .from('print_jobs')
          .insert(printJobsToInsert)

        if (printJobsErr) {
          console.error('Failed to submit KOT print jobs:', printJobsErr)
        } else {
          console.log(`Successfully scheduled ${printJobsToInsert.length} KOT print jobs.`)
        }
      }

      // E. Order Succeeded! Clean local storage cache, trigger checkmark splash, auto route back
      updateCartState([])
      setIsCartOpen(false)
      setSuccess(true)
      
      setTimeout(() => {
        router.push('/captain/tables')
      }, 2200)

    } catch (err: any) {
      console.error('Order creation exception:', err)
      setError(err.message || 'Failed to place order. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtering Menu Items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  // Full Page Loader
  if (loading) {
    return (
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-9 h-9 text-amber-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-bold animate-pulse">
            {seeding ? 'Building Restaurant Menu...' : 'Fetching Restaurant Menu...'}
          </p>
        </div>
      </div>
    )
  }

  if (!tableId || !table) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center p-6 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 animate-bounce" />
        <h3 className="text-md font-bold text-foreground">No Table Selected</h3>
        <p className="text-xs text-muted-foreground max-w-xs">You must choose a dining table to begin taking orders.</p>
        <Link 
          href="/captain/tables" 
          className="px-6 py-2.5 bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 font-bold rounded-xl text-xs"
        >
          Go select Table
        </Link>
      </div>
    )
  }

  return (
    <div className="relative min-h-[90vh] flex flex-col pb-24">
      {/* 1. Sleek Sub-Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-900/60 mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/captain/tables"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-background text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-base font-extrabold flex items-center gap-1.5">
              Table T{table.number}
              <span className="inline-block text-[8px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Seated
              </span>
            </h2>
            <p className="text-[10px] text-muted-foreground">Taking orders • Max {table.capacity} Pax</p>
          </div>
        </div>

        <button 
          onClick={() => fetchData(true)}
          disabled={seeding}
          className="flex h-8 items-center gap-1.5 px-3 rounded-lg border border-zinc-200 text-zinc-500 bg-background text-[10px] font-bold hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 active:scale-95 transition-all disabled:opacity-50"
          title="Force reset & seed mock menu data"
        >
          <RefreshCw className={`w-3 h-3 ${seeding ? 'animate-spin' : ''}`} />
          Reload Menu
        </button>
      </div>

      {error && (
        <div className="p-3 text-[11px] font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 mb-3">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:opacity-85">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 2. Interactive Search Box */}
      <div className="relative mb-4 shrink-0">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Quick search dishes, cocktails..."
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

      {/* 3. Horizontal Pill Categories Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none shrink-0 select-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap active:scale-95 transition-all ${
            selectedCategory === 'all'
              ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 font-black shadow-md shadow-zinc-950/15 dark:shadow-white/5'
              : 'border border-zinc-200 bg-background text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900'
          }`}
        >
          All Items
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap active:scale-95 transition-all ${
              selectedCategory === cat.id
                ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950 font-black shadow-md shadow-zinc-950/15 dark:shadow-white/5'
                : 'border border-zinc-200 bg-background text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 4. Menu Items Vertical Touch Panel */}
      <div className="flex-1 space-y-3.5">
        {filteredMenuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-3xl space-y-2 mt-4">
            <ClipboardList className="w-8 h-8 opacity-45" />
            <p className="text-xs font-semibold">No items match your filters</p>
            <button 
              onClick={() => { setSelectedCategory('all'); setSearchQuery('') }} 
              className="text-[10px] font-black text-amber-500 uppercase hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredMenuItems.map((item) => {
            const qty = getQuantityInCart(item.id)
            const notes = getNotesInCart(item.id)
            const isEditingNotes = editingNotesId === item.id
            
            // Tag color by printer routing
            const printTags = {
              kitchen: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
              bar: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
              billing: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            }[item.printer_type]

            return (
              <div 
                key={item.id}
                className={`flex flex-col p-4.5 rounded-2xl border transition-all duration-200 bg-background ${
                  qty > 0 
                    ? 'border-amber-500/40 bg-amber-500/[0.015] shadow-sm shadow-amber-500/5' 
                    : 'border-zinc-150/80 dark:border-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-850 shadow-none'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left content description */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-black text-foreground">{item.name}</h4>
                      <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${printTags}`}>
                        {item.printer_type}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="text-sm font-black text-foreground pt-0.5">
                      ${item.price.toFixed(2)}
                    </div>
                  </div>

                  {/* Right hand chunky Touch quantity controls */}
                  <div className="flex flex-col items-end shrink-0 justify-center">
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex h-8 items-center justify-center px-4 rounded-xl border border-zinc-250 bg-background text-xs font-black hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 active:scale-95 transition-all text-foreground cursor-pointer select-none"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        ADD
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="flex items-center h-8 bg-zinc-900 dark:bg-zinc-50 rounded-xl px-1 text-white dark:text-zinc-950 font-black text-xs select-none">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="flex items-center justify-center w-6 h-6 hover:opacity-80 active:scale-75 transition-all shrink-0 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          
                          <span className="w-6 text-center text-xs tabular-nums font-bold">
                            {qty}
                          </span>

                          <button
                            onClick={() => addToCart(item)}
                            className="flex items-center justify-center w-6 h-6 hover:opacity-80 active:scale-75 transition-all shrink-0 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Fast inline Notes Toggle */}
                        <button
                          onClick={() => setEditingNotesId(isEditingNotes ? null : item.id)}
                          className={`text-[8.5px] font-bold uppercase tracking-wider flex items-center gap-1 py-0.5 px-1.5 rounded transition-all ${
                            notes 
                              ? 'text-amber-500 bg-amber-500/10 font-extrabold' 
                              : 'text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-900'
                          }`}
                        >
                          <FileText className="w-2.5 h-2.5" />
                          {notes ? 'Edit Note' : 'Add Note'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline text entry field for individual dish instructions */}
                {qty > 0 && isEditingNotes && (
                  <div className="mt-3.5 pt-3 border-t border-zinc-150/60 dark:border-zinc-900/60 flex items-center gap-2 animate-in fade-in duration-200">
                    <input
                      type="text"
                      placeholder="E.g. No ice, extra spicy, sauce on side..."
                      value={notes}
                      onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl focus:outline-none focus:border-amber-500 dark:focus:border-amber-500 text-foreground placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                    />
                    <button
                      onClick={() => setEditingNotesId(null)}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[10px] font-extrabold active:scale-95 transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 5. Persistent Cart Pinned Bottom Floating Bar */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-24 left-0 right-0 z-40 px-4 max-w-md mx-auto animate-in slide-in-from-bottom duration-250 select-none">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex w-full items-center justify-between p-3.5 bg-zinc-900/95 dark:bg-zinc-900/90 text-white dark:text-zinc-50 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10 active:scale-[0.98] transition-all cursor-pointer hover:bg-zinc-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-extrabold text-xs">
                {cartTotalItems}
              </div>
              <div className="text-left">
                <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-wider">Review Cart</span>
                <span className="text-xs font-black">${cartSubtotal.toFixed(2)} subtotal</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-xs">
              View Order
              <ChevronRight className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
          </button>
        </div>
      )}

      {/* 6. Review Cart & Placement Bottom Sheet Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Drawer Sheet Body */}
          <div className="relative z-10 w-full max-w-md bg-background border border-zinc-200 dark:border-zinc-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[82vh] flex flex-col">
            {/* Touch Grab Handle */}
            <div className="h-1.5 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-4 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-150 dark:border-zinc-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 font-black text-sm">
                  T{table.number}
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">Confirm Table Order</h3>
                  <p className="text-[10px] text-muted-foreground">{cartTotalItems} dishes ready to submit</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-foreground cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable Cart Items review body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-2 px-1">Selected Dishes</span>
              
              {cart.map((c) => (
                <div 
                  key={c.menuItem.id}
                  className="flex flex-col p-3 rounded-xl border border-zinc-150 dark:border-zinc-900/60 bg-zinc-50/25 dark:bg-zinc-950/20 gap-2.5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-black text-foreground">{c.menuItem.name}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground mt-0.5">
                        ${c.menuItem.price.toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center gap-2 select-none">
                      {/* Quantity Modifier */}
                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 rounded-lg px-1 text-foreground font-black text-[11px] h-7">
                        <button
                          onClick={() => removeFromCart(c.menuItem.id)}
                          className="flex items-center justify-center w-5.5 h-5.5 hover:opacity-75 active:scale-75 transition-all cursor-pointer"
                        >
                          <Minus className="w-3 h-3 text-muted-foreground" />
                        </button>
                        
                        <span className="w-5 text-center text-[10px] font-bold tabular-nums">
                          {c.quantity}
                        </span>

                        <button
                          onClick={() => addToCart(c.menuItem)}
                          className="flex items-center justify-center w-5.5 h-5.5 hover:opacity-75 active:scale-75 transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>

                      <div className="text-xs font-black w-14 text-right">
                        ${(c.menuItem.price * c.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Inline editable Notes input */}
                  <div className="flex items-center gap-2 bg-background border border-zinc-200 dark:border-zinc-900 rounded-xl px-2.5 py-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Add chef notes (no spice, garlic etc)..."
                      value={c.notes}
                      onChange={(e) => updateItemNotes(c.menuItem.id, e.target.value)}
                      className="flex-1 bg-transparent text-[10px] font-semibold text-foreground focus:outline-none border-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Summary details */}
            <div className="border-t border-zinc-150 dark:border-zinc-900 pt-4 pb-5 space-y-2 shrink-0">
              <div className="flex justify-between text-[11px] font-semibold text-muted-foreground px-1">
                <span>Cart Subtotal</span>
                <span className="font-bold text-foreground">${cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-muted-foreground px-1">
                <span>Tax (5% GST Mock)</span>
                <span className="font-bold text-foreground">${cartTax.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-xs font-black text-foreground pt-1 px-1 border-t border-dashed border-zinc-200 dark:border-zinc-900">
                <span className="uppercase tracking-wider">Total Bill Amount</span>
                <span className="text-sm font-black text-amber-500">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Action CTA Submission buttons */}
            <div className="flex gap-2.5 shrink-0">
              <button
                onClick={() => setIsCartOpen(false)}
                disabled={submitting}
                className="flex-1 py-3 border border-zinc-250 dark:border-zinc-800 bg-background text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900 font-bold rounded-xl text-xs cursor-pointer select-none active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Close Cart
              </button>

              <button
                onClick={handlePlaceOrder}
                disabled={submitting || cart.length === 0}
                className="flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer select-none disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Sending KOT...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-white" />
                    Place KOT Order
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. Full Page Tactile Order Success Overlay Splash */}
      {success && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md select-none animate-in fade-in duration-300">
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-emerald-500 animate-bounce mx-auto" />
            <h2 className="text-xl font-black text-foreground tracking-tight">KOT Sent to Kitchen!</h2>
            <p className="text-xs text-muted-foreground font-semibold max-w-xs px-6">
              Order has been created successfully. Redirecting you to tables dashboard...
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Initializing Order Screen...</p>
        </div>
      </div>
    }>
      <OrderPageContent />
    </Suspense>
  )
}
