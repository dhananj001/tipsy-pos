'use client'

import React, { useEffect, useState } from 'react'
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
  DollarSign 
} from 'lucide-react'

// Strong TypeScript Definitions
interface Category {
  id: string
  restaurant_id: string
  name: string
  sort_order: number
  created_at: string
}

interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  description: string | null
  price: number
  is_available: boolean
  printer_type: 'kitchen' | 'bar' | 'billing'
  created_at: string
}

export default function MenuManagementPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items')
  
  // Data States
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal / Form States
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  // Item Form Fields
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemCategory, setItemCategory] = useState('')
  const [itemPrinter, setItemPrinter] = useState<'kitchen' | 'bar' | 'billing'>('kitchen')
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})

  // Category Form Fields
  const [catName, setCatName] = useState('')
  const [catOrder, setCatOrder] = useState('0')
  const [catErrors, setCatErrors] = useState<Record<string, string>>({})

  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  // 1. Initial Data Seeding & Fetching
  const fetchMenuData = async () => {
    if (!profile?.restaurant_id) return
    setLoading(true)
    setError(null)
    
    try {
      // Fetch Categories
      const { data: catData, error: catError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('sort_order', { ascending: true })

      if (catError) throw catError

      // Fetch Items
      const { data: itemData, error: itemError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('name', { ascending: true })

      if (itemError) throw itemError

      // Auto-Seed Initial Sandbox Menu Data if completely empty
      if ((!catData || catData.length === 0) && (!itemData || itemData.length === 0)) {
        const seedCategories = [
          { restaurant_id: profile.restaurant_id, name: 'Mains', sort_order: 1 },
          { restaurant_id: profile.restaurant_id, name: 'Beverages', sort_order: 2 },
          { restaurant_id: profile.restaurant_id, name: 'Appetizers', sort_order: 0 }
        ]

        const { data: newCats, error: seedCatError } = await supabase
          .from('menu_categories')
          .upsert(seedCategories, { onConflict: 'restaurant_id,name' })
          .select()

        if (seedCatError) throw seedCatError

        if (newCats && newCats.length > 0) {
          const appCat = newCats.find(c => c.name === 'Appetizers')?.id || newCats[0].id
          const mainCat = newCats.find(c => c.name === 'Mains')?.id || newCats[0].id
          const bevCat = newCats.find(c => c.name === 'Beverages')?.id || newCats[0].id

          const seedItems = [
            { restaurant_id: profile.restaurant_id, category_id: appCat, name: 'Garlic Bread', price: 6.99, printer_type: 'kitchen' as const, is_available: true, description: 'Toasted baguette with herb garlic butter' },
            { restaurant_id: profile.restaurant_id, category_id: mainCat, name: 'Classic Margherita Pizza', price: 14.50, printer_type: 'kitchen' as const, is_available: true, description: 'Fresh mozzarella, san marzano tomatoes, fresh basil' },
            { restaurant_id: profile.restaurant_id, category_id: bevCat, name: 'Spiced Craft Mojito', price: 9.50, printer_type: 'bar' as const, is_available: true, description: 'Fresh mint, spiced rum, raw lime juice, sparkling water' }
          ]

          const { error: seedItemError } = await supabase
            .from('menu_items')
            .insert(seedItems)

          if (seedItemError) throw seedItemError
          
          // Re-fetch clean copy
          fetchMenuData()
          return
        }
      }

      setCategories(catData || [])
      setMenuItems(itemData || [])
    } catch (err: any) {
      console.error('Error fetching menu layouts:', err)
      setError(err.message || 'Failed to sync menu data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMenuData()
  }, [profile?.restaurant_id])

  // 2. Optimistic Toggle Availability
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
    } catch (err: any) {
      console.error('Failed availability patch:', err)
      // Rollback
      setMenuItems(prev => 
        prev.map(i => i.id === item.id ? { ...i, is_available: item.is_available } : i)
      )
      setError(`Failed to update item availability: ${err.message}`)
    }
  }

  // 3. Delete Actions
  const deleteMenuItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return
    const originalItems = [...menuItems]
    
    // Optimistic UI Delete
    setMenuItems(prev => prev.filter(i => i.id !== id))

    try {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    } catch (err: any) {
      // Rollback
      setMenuItems(originalItems)
      setError(`Failed to delete item: ${err.message}`)
    }
  }

  const deleteCategory = async (id: string) => {
    const itemInCat = menuItems.some(i => i.category_id === id)
    if (itemInCat) {
      alert('Cannot delete category containing active menu items. Reassign or delete the items first.')
      return
    }
    if (!confirm('Are you sure you want to delete this category?')) return
    const originalCats = [...categories]

    // Optimistic UI Delete
    setCategories(prev => prev.filter(c => c.id !== id))

    try {
      const { error: deleteError } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
    } catch (err: any) {
      // Rollback
      setCategories(originalCats)
      setError(`Failed to delete category: ${err.message}`)
    }
  }

  // 4. Forms Resets & Open Modal Helpers
  const openItemModal = (item: MenuItem | null = null) => {
    setEditingItem(item)
    setItemName(item ? item.name : '')
    setItemDescription(item ? item.description || '' : '')
    setItemPrice(item ? item.price.toString() : '')
    setItemCategory(item ? item.category_id : (categories[0]?.id || ''))
    setItemPrinter(item ? item.printer_type : 'kitchen')
    setItemErrors({})
    setItemModalOpen(true)
  }

  const openCategoryModal = (cat: Category | null = null) => {
    setEditingCategory(cat)
    setCatName(cat ? cat.name : '')
    setCatOrder(cat ? cat.sort_order.toString() : '0')
    setCatErrors({})
    setCategoryModalOpen(true)
  }

  // 5. Submit Form Validation and Execution
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.restaurant_id) return

    // Field Validation
    const errors: Record<string, string> = {}
    if (!itemName.trim()) errors.name = 'Name is required'
    if (!itemPrice.trim() || isNaN(Number(itemPrice)) || Number(itemPrice) <= 0) {
      errors.price = 'Price must be a valid positive number'
    }
    if (!itemCategory) errors.category = 'Please assign a category'
    
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
      printer_type: itemPrinter
    }

    try {
      if (editingItem) {
        const { error: putError } = await supabase
          .from('menu_items')
          .update(payload)
          .eq('id', editingItem.id)

        if (putError) throw putError
      } else {
        const { error: postError } = await supabase
          .from('menu_items')
          .insert([payload])

        if (postError) throw postError
      }

      setItemModalOpen(false)
      fetchMenuData()
    } catch (err: any) {
      setError(`Failed to save menu item: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.restaurant_id) return

    // Field Validation
    const errors: Record<string, string> = {}
    if (!catName.trim()) errors.name = 'Category name is required'
    if (isNaN(Number(catOrder)) || Number(catOrder) < 0) errors.order = 'Sort order must be zero or positive'

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
      } else {
        const { error: postError } = await supabase
          .from('menu_categories')
          .insert([payload])

        if (postError) throw postError
      }

      setCategoryModalOpen(false)
      fetchMenuData()
    } catch (err: any) {
      setError(`Failed to save category: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Loading Menu Editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-500" />
            Menu Management Console
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Control categories, item lists, printer mapping, and plate availability</p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'items' ? (
            <button
              onClick={() => openItemModal()}
              disabled={categories.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Menu Item
            </button>
          ) : (
            <button
              onClick={() => openCategoryModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/10 active:scale-95 transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              Add Category
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'items'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Menu Items ({menuItems.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Categories ({categories.length})
        </button>
      </div>

      {/* Categories Empty Warnings */}
      {categories.length === 0 && activeTab === 'items' && (
        <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900/10 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 max-w-md mx-auto space-y-3">
          <Layers className="w-8 h-8 mx-auto text-muted-foreground opacity-60" />
          <h3 className="text-sm font-bold text-foreground">No Categories Configured</h3>
          <p className="text-xs text-muted-foreground">You must set up at least one category folder before creating menu items.</p>
          <button
            onClick={() => setActiveTab('categories')}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-all cursor-pointer"
          >
            Go to Categories
          </button>
        </div>
      )}

      {/* Items Tab View */}
      {activeTab === 'items' && categories.length > 0 && (
        <div className="overflow-hidden border border-zinc-200 dark:border-zinc-900 rounded-2xl bg-background/50 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Item details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Printer Routing</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900 text-xs">
                {menuItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No menu items found. Add one above!
                    </td>
                  </tr>
                ) : (
                  menuItems.map((item) => {
                    const categoryName = categories.find(c => c.id === item.category_id)?.name || 'Unassigned'
                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                        <td className="p-4">
                          <p className="font-bold text-foreground">{item.name}</p>
                          {item.description && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xs truncate">{item.description}</p>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 font-semibold text-[10px] border border-zinc-200/20">
                            <Tag className="w-2.5 h-2.5" />
                            {categoryName}
                          </span>
                        </td>
                        <td className="p-4 font-black">${item.price.toFixed(2)}</td>
                        <td className="p-4 uppercase font-bold text-[10px] tracking-wider text-zinc-500 flex items-center gap-1.5 mt-2.5">
                          <Printer className="w-3.5 h-3.5" />
                          {item.printer_type}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleItemAvailability(item)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                              item.is_available
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                                : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                            }`}
                          >
                            {item.is_available ? 'Available' : 'Sold Out'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openItemModal(item)}
                              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-900 bg-background hover:bg-zinc-50 text-zinc-500 hover:text-foreground cursor-pointer transition-all active:scale-95"
                              title="Edit Item"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteMenuItem(item.id)}
                              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-900 bg-background hover:bg-red-50 text-zinc-500 hover:text-red-500 cursor-pointer transition-all active:scale-95"
                              title="Delete Item"
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
      )}

      {/* Categories Tab View */}
      {activeTab === 'categories' && (
        <div className="overflow-hidden border border-zinc-200 dark:border-zinc-900 rounded-2xl bg-background/50 backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Category Name</th>
                  <th className="p-4">Sort Order Priority</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900 text-xs">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-muted-foreground">
                      No categories configured. Create one above!
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                      <td className="p-4 font-bold text-foreground">{cat.name}</td>
                      <td className="p-4 font-mono font-bold text-muted-foreground">{cat.sort_order}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openCategoryModal(cat)}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-900 bg-background hover:bg-zinc-50 text-zinc-500 hover:text-foreground cursor-pointer transition-all active:scale-95"
                            title="Edit Category"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-900 bg-background hover:bg-red-50 text-zinc-500 hover:text-red-500 cursor-pointer transition-all active:scale-95"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reusable Item Form Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setItemModalOpen(false)} />
          
          <form 
            onSubmit={handleItemSubmit}
            className="relative z-10 w-full max-w-md bg-background border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-900">
              <h3 className="text-sm font-black text-foreground">
                {editingItem ? 'Edit Menu Item' : 'Create Menu Item'}
              </h3>
              <button 
                type="button" 
                onClick={() => setItemModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Details */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Item Name *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Classic Pepperoni Pizza"
                />
                {itemErrors.name && <p className="text-[10px] text-red-500 font-semibold">{itemErrors.name}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Description</label>
                <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Summarize dish toppings, ingredients, or allergens..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Price ($) *
                  </label>
                  <input
                    type="text"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="12.99"
                  />
                  {itemErrors.price && <p className="text-[10px] text-red-500 font-semibold">{itemErrors.price}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Category *
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {itemErrors.category && <p className="text-[10px] text-red-500 font-semibold">{itemErrors.category}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5" /> Printer Routing Group
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['kitchen', 'bar', 'billing'] as const).map((printer) => (
                    <button
                      key={printer}
                      type="button"
                      onClick={() => setItemPrinter(printer)}
                      className={`py-2 text-center rounded-xl border text-[10px] font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer ${
                        itemPrinter === printer
                          ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 font-extrabold'
                          : 'border-zinc-200 dark:border-zinc-900 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      {printer}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-zinc-150 dark:border-zinc-900 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-250 bg-background text-foreground hover:bg-zinc-50 dark:border-zinc-850 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Save Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reusable Category Form Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setCategoryModalOpen(false)} />
          
          <form 
            onSubmit={handleCategorySubmit}
            className="relative z-10 w-full max-w-sm bg-background border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-900">
              <h3 className="text-sm font-black text-foreground">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button 
                type="button" 
                onClick={() => setCategoryModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Category Name *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. Appetizers"
                />
                {catErrors.name && <p className="text-[10px] text-red-500 font-semibold">{catErrors.name}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Sort Order Priority</label>
                <input
                  type="number"
                  value={catOrder}
                  onChange={(e) => setCatOrder(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. 0 (loads first)"
                />
                {catErrors.order && <p className="text-[10px] text-red-500 font-semibold">{catErrors.order}</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-150 dark:border-zinc-900 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-250 bg-background text-foreground hover:bg-zinc-50 dark:border-zinc-850 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Save Category
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  )
}
