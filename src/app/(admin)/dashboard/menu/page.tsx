'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  BookOpen, 
  Plus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  FolderPlus, 
  Tag, 
  Layers, 
  Printer, 
  Search,
  RotateCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UtensilsCrossed,
  CheckCircle2,
  Copy,
  Filter,
  DollarSign,
  ArrowUpDown
} from 'lucide-react'

// Strong TypeScript Definitions
interface Category {
  id: string
  restaurant_id: string
  name: string
  sort_order: number
  created_at?: string
}

interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  is_veg: boolean
  is_available: boolean
  printer_type: 'kitchen' | 'bar' | 'billing'
  created_at?: string
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100]

export default function MenuManagementPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items')
  
  // Data States
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Search & Filter States (Items Tab)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [selectedPrinterFilter, setSelectedPrinterFilter] = useState<string>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'sold_out'>('all')
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non_veg'>('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'>('name_asc')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // Search & Filter States (Categories Tab)
  const [catSearchQuery, setCatSearchQuery] = useState('')

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Modal / Form States
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [quickAddCount, setQuickAddCount] = useState(0)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Item Form Fields
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemCategory, setItemCategory] = useState('')
  const [itemIsVeg, setItemIsVeg] = useState<boolean>(true)
  const [itemPrinter, setItemPrinter] = useState<'kitchen' | 'bar' | 'billing'>('kitchen')
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})
  const [keepModalOpenAfterSave, setKeepModalOpenAfterSave] = useState(false)

  // Category Form Fields
  const [catName, setCatName] = useState('')
  const [catOrder, setCatOrder] = useState('0')
  const [catErrors, setCatErrors] = useState<Record<string, string>>({})

  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type })
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev))
    }, 3500)
  }

  // 1. Initial Data Fetching
  const fetchMenuData = async (isManualRefresh = false) => {
    if (!profile?.restaurant_id) return
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    
    try {
      if (isManualRefresh) {
        try {
          const keysToRemove = [
            `tipsy-menu-cache-v1-${profile.restaurant_id}`,
            `tipsy-menu-cache-v2-${profile.restaurant_id}`
          ]
          keysToRemove.forEach((k) => localStorage.removeItem(k))
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('tipsy-menu-cache')) {
              localStorage.removeItem(key)
            }
          }
        } catch (e) {
          console.warn('Could not clear local storage cache:', e)
        }
      }

      // Fetch Categories
      const { data: catData, error: catError } = await supabase
        .from('menu_categories')
        .select('id, name, sort_order, restaurant_id')
        .eq('restaurant_id', profile.restaurant_id)
        .order('sort_order', { ascending: true })

      if (catError) throw catError

      // Fetch Items with explicit columns
      const { data: itemData, error: itemError } = await supabase
        .from('menu_items')
        .select('id, name, description, price, is_veg, is_available, printer_type, category_id, restaurant_id')
        .eq('restaurant_id', profile.restaurant_id)
        .order('name', { ascending: true })

      if (itemError) throw itemError

      setCategories(catData || [])
      setMenuItems(itemData || [])

      if (isManualRefresh) {
        showToast('Local cache purged & refreshed!', 'success')
      }
    } catch (err: any) {
      console.error('Error fetching menu layouts:', err)
      setError(err?.message || 'Failed to sync menu data.')
      showToast(err?.message || 'Failed to sync menu', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMenuData()
  }, [profile?.restaurant_id])

  // Reset to first page whenever search or filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategoryFilter, selectedPrinterFilter, availabilityFilter, vegFilter, sortBy, itemsPerPage])

  // Active Filter Count Badge for Mobile
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedCategoryFilter !== 'all') count++
    if (selectedPrinterFilter !== 'all') count++
    if (availabilityFilter !== 'all') count++
    if (vegFilter !== 'all') count++
    if (sortBy !== 'name_asc') count++
    return count
  }, [selectedCategoryFilter, selectedPrinterFilter, availabilityFilter, vegFilter, sortBy])

  // 2. Filter & Sort Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesName = item.name.toLowerCase().includes(query)
        const matchesDesc = (item.description || '').toLowerCase().includes(query)
        if (!matchesName && !matchesDesc) return false
      }

      if (selectedCategoryFilter !== 'all' && item.category_id !== selectedCategoryFilter) {
        return false
      }

      if (selectedPrinterFilter !== 'all' && item.printer_type !== selectedPrinterFilter) {
        return false
      }

      if (availabilityFilter === 'available' && !item.is_available) return false
      if (availabilityFilter === 'sold_out' && item.is_available) return false

      if (vegFilter === 'veg' && !item.is_veg) return false
      if (vegFilter === 'non_veg' && item.is_veg) return false

      return true
    }).sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
      if (sortBy === 'price_asc') return a.price - b.price
      if (sortBy === 'price_desc') return b.price - a.price
      return 0
    })
  }, [menuItems, searchQuery, selectedCategoryFilter, selectedPrinterFilter, availabilityFilter, vegFilter, sortBy])

  // Filter Categories
  const filteredCategories = useMemo(() => {
    if (!catSearchQuery.trim()) return categories
    const q = catSearchQuery.toLowerCase().trim()
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, catSearchQuery])

  // Pagination Slicing
  const totalItems = filteredMenuItems.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredMenuItems.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredMenuItems, currentPage, itemsPerPage])

  // Category items count lookup
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>()
    menuItems.forEach((i) => {
      map.set(i.category_id, (map.get(i.category_id) || 0) + 1)
    })
    return map
  }, [menuItems])

  // 3. Optimistic Toggle Availability
  const toggleItemAvailability = async (item: MenuItem) => {
    const updatedStatus = !item.is_available
    
    // Optimistic Update
    setMenuItems(prev => 
      prev.map(i => i.id === item.id ? { ...i, is_available: updatedStatus } : i)
    )

    try {
      const { error: patchError } = await supabase
        .from('menu_items')
        .update({ is_available: updatedStatus })
        .eq('id', item.id)

      if (patchError) throw patchError
      showToast(`${item.name}: ${updatedStatus ? 'Available' : '86\'d (Sold Out)'}`)
    } catch (err: any) {
      console.error('Failed availability patch:', err)
      setMenuItems(prev => 
        prev.map(i => i.id === item.id ? { ...i, is_available: item.is_available } : i)
      )
      showToast(`Failed to update status: ${err.message}`, 'error')
    }
  }

  // 4. Delete Actions
  const deleteMenuItem = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}" from menu?`)) return
    const originalItems = [...menuItems]
    
    setMenuItems(prev => prev.filter(i => i.id !== item.id))

    try {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', item.id)

      if (deleteError) throw deleteError
      showToast(`"${item.name}" deleted.`)
    } catch (err: any) {
      setMenuItems(originalItems)
      showToast(`Delete failed: ${err.message}`, 'error')
    }
  }

  const deleteCategory = async (cat: Category) => {
    const itemInCat = menuItems.some(i => i.category_id === cat.id)
    if (itemInCat) {
      alert(`Cannot delete "${cat.name}". It contains ${categoryCounts.get(cat.id) || 0} active menu items. Reassign or delete those items first.`)
      return
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return
    const originalCats = [...categories]

    setCategories(prev => prev.filter(c => c.id !== cat.id))

    try {
      const { error: deleteError } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', cat.id)

      if (deleteError) throw deleteError
      showToast(`Category "${cat.name}" deleted.`)
    } catch (err: any) {
      setCategories(originalCats)
      showToast(`Delete failed: ${err.message}`, 'error')
    }
  }

  // 5. Open Modal Helpers
  const openItemModal = (item: MenuItem | null = null, defaultCatId?: string) => {
    setEditingItem(item)
    setItemName(item ? item.name : '')
    setItemDescription(item ? item.description || '' : '')
    setItemPrice(item ? item.price.toString() : '')
    setItemCategory(item ? item.category_id : defaultCatId || (categories[0]?.id || ''))
    setItemIsVeg(item ? (item.is_veg ?? true) : true)
    setItemPrinter(item ? item.printer_type : 'kitchen')
    setItemErrors({})
    setKeepModalOpenAfterSave(false)
    setItemModalOpen(true)
  }

  const duplicateItem = (item: MenuItem) => {
    setEditingItem(null)
    setItemName(`${item.name} (Copy)`)
    setItemDescription(item.description || '')
    setItemPrice(item.price.toString())
    setItemCategory(item.category_id)
    setItemIsVeg(item.is_veg ?? true)
    setItemPrinter(item.printer_type)
    setItemErrors({})
    setKeepModalOpenAfterSave(false)
    setItemModalOpen(true)
  }

  const openCategoryModal = (cat: Category | null = null) => {
    setEditingCategory(cat)
    setCatName(cat ? cat.name : '')
    setCatOrder(cat ? cat.sort_order.toString() : `${categories.length * 10}`)
    setCatErrors({})
    setCategoryModalOpen(true)
  }

  // 6. Submit Form
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.restaurant_id) return

    const errors: Record<string, string> = {}
    if (!itemName.trim()) errors.name = 'Item name is required'
    if (!itemPrice.trim() || isNaN(Number(itemPrice)) || Number(itemPrice) <= 0) {
      errors.price = 'Price must be a valid number'
    }
    if (!itemCategory) errors.category = 'Select a category'
    
    if (Object.keys(errors).length > 0) {
      setItemErrors(errors)
      return
    }

    setSubmitting(true)
    const payload = {
      restaurant_id: profile.restaurant_id,
      category_id: itemCategory,
      name: itemName.trim(),
      description: itemDescription.trim() || null,
      price: Number(itemPrice),
      is_veg: itemIsVeg,
      printer_type: itemPrinter
    }

    try {
      if (editingItem) {
        const { error: putError } = await supabase
          .from('menu_items')
          .update(payload)
          .eq('id', editingItem.id)

        if (putError) throw putError
        showToast(`Updated "${itemName.trim()}"`)
        setItemModalOpen(false)
      } else {
        const { error: postError } = await supabase
          .from('menu_items')
          .insert([payload])

        if (postError) throw postError
        showToast(`Added "${itemName.trim()}"`)
        setQuickAddCount(prev => prev + 1)

        if (keepModalOpenAfterSave) {
          setItemName('')
          setItemDescription('')
          setItemPrice('')
          setItemErrors({})
        } else {
          setItemModalOpen(false)
        }
      }

      fetchMenuData(true)
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.restaurant_id) return

    const errors: Record<string, string> = {}
    if (!catName.trim()) errors.name = 'Category name is required'
    if (isNaN(Number(catOrder)) || Number(catOrder) < 0) errors.order = 'Sort order must be 0 or positive'

    if (Object.keys(errors).length > 0) {
      setCatErrors(errors)
      return
    }

    setSubmitting(true)
    const payload = {
      restaurant_id: profile.restaurant_id,
      name: catName.trim(),
      sort_order: Math.floor(Number(catOrder))
    }

    try {
      if (editingCategory) {
        const { error: putError } = await supabase
          .from('menu_categories')
          .update(payload)
          .eq('id', editingCategory.id)

        if (putError) throw putError
        showToast(`Category "${catName.trim()}" updated`)
      } else {
        const { error: postError } = await supabase
          .from('menu_categories')
          .insert([payload])

        if (postError) throw postError
        showToast(`Category "${catName.trim()}" created`)
      }

      setCategoryModalOpen(false)
      fetchMenuData(true)
    } catch (err: any) {
      showToast(`Category save failed: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse tracking-wide uppercase">
            Loading Menu...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 lg:pb-12 animate-in fade-in duration-300">
      
      {/* Native Mobile Toast Notification */}
      {toastMsg && (
        <div 
          className={`fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom-4 duration-200 ${
            toastMsg.type === 'success' 
              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-800' 
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
          )}
          <span className="flex-1 truncate">{toastMsg.text}</span>
        </div>
      )}

      {/* App Bar / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-background/80 p-3.5 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                Menu Editor
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                  POS
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground hidden sm:block">
                Manage items, categories, pricing, and printer routing
              </p>
            </div>
          </div>

          {/* Quick sync on mobile */}
          <button
            onClick={() => fetchMenuData(true)}
            disabled={refreshing}
            className="sm:hidden p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background text-foreground active:scale-95 transition-all cursor-pointer"
            title="Purge cache"
          >
            <RotateCw className={`w-4 h-4 text-indigo-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Desktop Header Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button
            onClick={() => fetchMenuData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-900 text-foreground text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Purge captain local cache and refetch fresh database records"
          >
            <RotateCw className={`w-3.5 h-3.5 text-indigo-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Purging Cache...' : 'Sync & Clear Cache'}</span>
          </button>

          {activeTab === 'items' ? (
            <button
              onClick={() => openItemModal()}
              disabled={categories.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Menu Item
            </button>
          ) : (
            <button
              onClick={() => openCategoryModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              Add Category
            </button>
          )}
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

      {/* Segmented Native iOS/Android Style Tab Controller */}
      <div className="p-1 bg-zinc-100 dark:bg-zinc-900/90 rounded-2xl flex items-center border border-zinc-200/50 dark:border-zinc-800/50">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === 'items'
              ? 'bg-white dark:bg-zinc-800 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Items ({menuItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-white dark:bg-zinc-800 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Categories ({categories.length})</span>
        </button>
      </div>

      {/* TAB 1: MENU ITEMS */}
      {activeTab === 'items' && (
        <div className="space-y-3 sm:space-y-4">
          
          {/* Mobile Search & Filter Action Bar */}
          <div className="bg-background/90 p-3 sm:p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
            
            {/* Search Input Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item or ingredient..."
                  className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-foreground p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Mobile Filter Sheet Trigger Button */}
              <button
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                className={`lg:hidden relative p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  activeFilterCount > 0
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : 'border-zinc-200 dark:border-zinc-800 bg-background text-muted-foreground'
                }`}
                title="Filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Horizontal Scrollable Category Pills (Touch friendly native POS swipe) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs -mx-1 px-1">
              <button
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({menuItems.length})
              </button>
              {categories.map((c) => {
                const count = categoryCounts.get(c.id) || 0
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategoryFilter(c.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      selectedCategoryFilter === c.id
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                        : 'bg-zinc-100 dark:bg-zinc-800/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {c.name} ({count})
                  </button>
                )
              })}
            </div>

            {/* Desktop Full Filters Bar (hidden on mobile, expandable via drawer) */}
            <div className={`space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60 ${mobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Printer Routing</label>
                  <select
                    value={selectedPrinterFilter}
                    onChange={(e) => setSelectedPrinterFilter(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="all">All Printers</option>
                    <option value="kitchen">Kitchen (KOT)</option>
                    <option value="bar">Bar (BOT)</option>
                    <option value="billing">Billing</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Status</label>
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="sold_out">Sold Out (86)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Dietary</label>
                  <select
                    value={vegFilter}
                    onChange={(e) => setVegFilter(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="all">Veg & Non-Veg</option>
                    <option value="veg">Vegetarian Only</option>
                    <option value="non_veg">Non-Veg Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Sort Items</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="name_asc">Name: A to Z</option>
                    <option value="name_desc">Name: Z to A</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      setSelectedCategoryFilter('all')
                      setSelectedPrinterFilter('all')
                      setAvailabilityFilter('all')
                      setVegFilter('all')
                      setSortBy('name_asc')
                      setSearchQuery('')
                    }}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* MOBILE VIEW: Touch-Friendly Card List */}
          <div className="block lg:hidden space-y-2.5">
            {paginatedItems.length === 0 ? (
              <div className="p-8 text-center bg-background rounded-2xl border border-zinc-200 dark:border-zinc-800 text-muted-foreground">
                <p className="font-bold text-sm text-foreground">No menu items found</p>
                <p className="text-xs mt-1">Try resetting filters or search query.</p>
              </div>
            ) : (
              paginatedItems.map((item) => {
                const category = categories.find(c => c.id === item.category_id)
                return (
                  <div 
                    key={item.id}
                    className="p-3.5 bg-background border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-sm space-y-2.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Veg / Non-Veg Indicator */}
                        <span 
                          className={`mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded border shrink-0 ${
                            item.is_veg
                              ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                              : 'border-rose-600 bg-rose-50 dark:bg-rose-950/30'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        </span>

                        <div className="min-w-0">
                          <h4 className="font-bold text-foreground text-sm leading-tight truncate">
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {item.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                              {category?.name || 'Unassigned'}
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              item.printer_type === 'kitchen' 
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' 
                                : item.printer_type === 'bar'
                                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                            }`}>
                              {item.printer_type}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Price Badge */}
                      <div className="font-black text-sm text-foreground text-right shrink-0">
                        ₹{item.price.toFixed(2)}
                      </div>
                    </div>

                    {/* Touch Action Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      {/* Availability Button */}
                      <button
                        onClick={() => toggleItemAvailability(item)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all active:scale-95 cursor-pointer ${
                          item.is_available
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.is_available ? 'Available' : 'Sold Out (86)'}
                      </button>

                      {/* Edit, Copy, Delete */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => duplicateItem(item)}
                          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-foreground active:scale-90"
                          title="Duplicate Item"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openItemModal(item)}
                          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-foreground active:scale-90"
                          title="Edit Item"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item)}
                          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-rose-50 dark:bg-rose-950/30 text-rose-600 active:scale-90"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* DESKTOP VIEW: Data Table (hidden on mobile) */}
          <div className="hidden lg:block overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-background shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 w-12 text-center">Diet</th>
                    <th className="p-4">Item Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Printer Routing</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-muted-foreground">
                        <p className="font-bold text-sm text-foreground">No menu items match your filter</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const category = categories.find(c => c.id === item.category_id)
                      return (
                        <tr key={item.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                          <td className="p-4 text-center">
                            <span 
                              className={`inline-flex items-center justify-center w-4 h-4 rounded border ${
                                item.is_veg
                                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                                  : 'border-rose-600 bg-rose-50 dark:bg-rose-950/30'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-foreground text-sm flex items-center gap-2">
                              {item.name}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 max-w-sm">
                                {item.description}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-foreground font-semibold text-[11px]">
                              <Tag className="w-3 h-3 text-muted-foreground" />
                              {category?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td className="p-4 font-black text-sm text-foreground">
                            ₹{item.price.toFixed(2)}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              item.printer_type === 'kitchen'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                : item.printer_type === 'bar'
                                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                            }`}>
                              <Printer className="w-3 h-3" />
                              {item.printer_type}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => toggleItemAvailability(item)}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wide transition-all active:scale-95 cursor-pointer ${
                                item.is_available
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                              }`}
                            >
                              {item.is_available ? 'Available' : 'Sold Out (86)'}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => duplicateItem(item)}
                                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-95"
                                title="Duplicate"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openItemModal(item)}
                                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground cursor-pointer transition-all active:scale-95"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteMenuItem(item)}
                                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-rose-50 text-muted-foreground hover:text-rose-600 dark:hover:bg-rose-950/30 cursor-pointer transition-all active:scale-95"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-background text-xs font-semibold">
              <div className="text-muted-foreground text-center sm:text-left text-[11px] sm:text-xs">
                Showing <span className="font-bold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-bold text-foreground">
                  {Math.min(currentPage * itemsPerPage, totalItems)}
                </span>{' '}
                of <span className="font-bold text-foreground">{totalItems}</span> items
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background disabled:opacity-30 cursor-pointer"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1 font-bold text-xs bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                  {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background disabled:opacity-30 cursor-pointer"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-3 bg-background/80 p-3.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                placeholder="Search category name..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              {catSearchQuery && (
                <button
                  onClick={() => setCatSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-muted-foreground font-semibold">
              Total: <span className="font-bold text-foreground">{categories.length}</span>
            </div>
          </div>

          {/* Mobile Category Cards */}
          <div className="block lg:hidden space-y-2.5">
            {filteredCategories.length === 0 ? (
              <div className="p-8 text-center bg-background rounded-2xl border border-zinc-200 dark:border-zinc-800 text-muted-foreground">
                <p className="font-bold text-sm text-foreground">No categories found</p>
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const count = categoryCounts.get(cat.id) || 0
                return (
                  <div key={cat.id} className="p-3.5 bg-background border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                          #{cat.sort_order}
                        </span>
                        <h4 className="font-bold text-foreground text-sm">{cat.name}</h4>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <button
                        onClick={() => openItemModal(null, cat.id)}
                        className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold inline-flex items-center gap-1 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Dish
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openCategoryModal(cat)}
                          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-foreground active:scale-90"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat)}
                          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-rose-50 dark:bg-rose-950/30 text-rose-600 active:scale-90"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Desktop Category Table */}
          <div className="hidden lg:block overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-background shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Sort Order</th>
                  <th className="p-4">Category Name</th>
                  <th className="p-4">Linked Items</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                {filteredCategories.map((cat) => {
                  const count = categoryCounts.get(cat.id) || 0
                  return (
                    <tr key={cat.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                        #{cat.sort_order}
                      </td>
                      <td className="p-4 font-bold text-foreground text-sm">
                        {cat.name}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-foreground font-bold text-xs">
                          {count} {count === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openItemModal(null, cat.id)}
                            className="px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold hover:bg-indigo-100 cursor-pointer inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add Item
                          </button>
                          <button
                            onClick={() => openCategoryModal(cat)}
                            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCategory(cat)}
                            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background hover:bg-rose-50 text-muted-foreground hover:text-rose-600 dark:hover:bg-rose-950/30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) on Mobile Screens */}
      <div className="fixed bottom-6 right-5 z-40 lg:hidden">
        <button
          onClick={() => {
            if (activeTab === 'items') openItemModal()
            else openCategoryModal()
          }}
          className="w-14 h-14 rounded-full bg-indigo-600 text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer border-2 border-white dark:border-zinc-900"
          title="Add New"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* NATIVE BOTTOM SHEET / MODAL: ITEM FORM */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setItemModalOpen(false)} />
          
          <form 
            onSubmit={handleItemSubmit}
            className="relative z-10 w-full sm:max-w-lg bg-background border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
          >
            {/* Grab handle on mobile */}
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    {editingItem ? 'Edit Menu Item' : 'New Menu Item'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {editingItem ? 'Update specifications & price' : 'Add dish to active digital menu'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setItemModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Item Name *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-xs"
                  placeholder="e.g. Truffle Fries / Negroni"
                  autoFocus
                />
                {itemErrors.name && <p className="text-[10px] text-rose-500 font-bold">{itemErrors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                    placeholder="250.00"
                  />
                  {itemErrors.price && <p className="text-[10px] text-rose-500 font-bold">{itemErrors.price}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    Category *
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-xs cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {itemErrors.category && <p className="text-[10px] text-rose-500 font-bold">{itemErrors.category}</p>}
                </div>
              </div>

              {/* Dietary Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Dietary Tag</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemIsVeg(true)}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      itemIsVeg
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-black'
                        : 'border-zinc-200 dark:border-zinc-800 text-muted-foreground'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    Vegetarian
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemIsVeg(false)}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      !itemIsVeg
                        ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-black'
                        : 'border-zinc-200 dark:border-zinc-800 text-muted-foreground'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    Non-Vegetarian
                  </button>
                </div>
              </div>

              {/* Printer Routing Group */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Thermal Routing Group
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['kitchen', 'bar', 'billing'] as const).map((printer) => (
                    <button
                      key={printer}
                      type="button"
                      onClick={() => setItemPrinter(printer)}
                      className={`py-2.5 text-center rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        itemPrinter === printer
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                          : 'border-zinc-200 dark:border-zinc-800 text-muted-foreground'
                      }`}
                    >
                      {printer === 'kitchen' ? 'Kitchen (KOT)' : printer === 'bar' ? 'Bar (BOT)' : 'Billing'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Kitchen Notes / Description</label>
                <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs"
                  placeholder="Ingredients or allergens..."
                />
              </div>

              {!editingItem && (
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="keepOpenCheckbox"
                    checked={keepModalOpenAfterSave}
                    onChange={(e) => setKeepModalOpenAfterSave(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="keepOpenCheckbox" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                    Fast Entry: Keep open for next item
                  </label>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-semibold">
                {!editingItem && quickAddCount > 0 && `✨ Added ${quickAddCount}`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background text-foreground text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {editingItem ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* NATIVE BOTTOM SHEET / MODAL: CATEGORY FORM */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setCategoryModalOpen(false)} />
          
          <form 
            onSubmit={handleCategorySubmit}
            className="relative z-10 w-full sm:max-w-sm bg-background border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
          >
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    {editingCategory ? 'Edit Category' : 'New Category'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">POS Section Header</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setCategoryModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Category Name *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                  placeholder="e.g. Appetizers / Desserts"
                  autoFocus
                />
                {catErrors.name && <p className="text-[10px] text-rose-500 font-bold">{catErrors.name}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Display Order (Lower = Top)</label>
                <input
                  type="number"
                  value={catOrder}
                  onChange={(e) => setCatOrder(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                  placeholder="0, 10, 20..."
                />
                {catErrors.order && <p className="text-[10px] text-rose-500 font-bold">{catErrors.order}</p>}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background text-foreground text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
