'use server'

import fs from 'fs'
import path from 'path'
import { createClient as createServerClient } from '@/lib/supabase/server'

interface ParsedItem {
  name: string
  description: string | null
  price: number
  variants: Array<{ name: string; price: number }> | null
  printer_type: 'kitchen' | 'bar' | 'billing'
  categoryName: string
  segment: 'food' | 'cardboard'
}

// Helper to verify the calling user is an authorized admin/manager
async function verifyAdminPermission() {
  const supabase = await createServerClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized: Active session required.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, restaurant_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Unauthorized: Could not load user profile.')
  }

  if (profile.role !== 'admin' && profile.role !== 'manager') {
    throw new Error('Unauthorized: Admin or Manager privileges required.')
  }

  return { profile, user }
}

function parseMenuMarkdown(fileContent: string): ParsedItem[] {
  const lines = fileContent.split('\n')
  let currentSegment: 'food' | 'cardboard' = 'food'
  let currentCategory = ''
  let currentItem: ParsedItem | null = null
  const items: ParsedItem[] = []

  // Helper to determine printer routing
  function getPrinterType(categoryName: string): 'kitchen' | 'bar' | 'billing' {
    const name = categoryName.toUpperCase()
    const barCategories = [
      'COCKTAILS', 'PALOMA', 'BEERS', 'WINE', 'LIQUEURS', 'TEQUILA', 'MOCKTAILS',
      'PREMIUM WHISKEY', 'IMPORTED WHISKEY', 'SINGLE MALT WHISKEY', 'VODKA', 'GIN',
      'RUM AND BRANDI', 'SOFT BEVERAGES', 'INVENTED COCKTAILS', 'BUILT TALL',
      'SPARKLING COCKTAILS', 'SANGRIA', 'DRAUGHT BEER', 'SHOTS'
    ]
    if (barCategories.some(bc => name.includes(bc))) {
      return 'bar'
    }
    return 'kitchen'
  }

  // Helper to dynamically extract variant names from price string count and item name
  function getVariantNames(name: string, count: number): string[] {
    const cleanName = name.replace(/\(|\)/g, '')
    const parts = cleanName.split('/')
    if (parts.length >= count) {
      const options = parts.slice(-count).map(p => p.trim())
      options[0] = options[0].split(/\s+/).pop() || options[0]
      return options.map(o => o.charAt(0).toUpperCase() + o.slice(1).toLowerCase())
    }
    if (count === 2) return ['Half', 'Full']
    if (count === 3) return ['Regular', 'Large', 'Jumbo']
    return Array.from({ length: count }, (_, i) => `Option ${i + 1}`)
  }

  for (let line of lines) {
    line = line.trim()
    if (!line) continue

    // 1. Detect Segment
    if (line.startsWith('## Segment:')) {
      const segStr = line.replace('## Segment:', '').trim().toLowerCase()
      currentSegment = segStr === 'cardboard' ? 'cardboard' : 'food'
      continue
    }

    // 2. Detect Category
    if (line.startsWith('### Category:')) {
      currentCategory = line.replace('### Category:', '').trim()
      continue
    }

    // 3. Detect Item Name
    if (line.startsWith('- **') && line.endsWith('**')) {
      if (currentItem) {
        items.push(currentItem)
      }
      
      const itemName = line.slice(4, -2).trim()
      currentItem = {
        name: itemName,
        description: null,
        price: 0,
        variants: null,
        printer_type: getPrinterType(currentCategory),
        categoryName: currentCategory,
        segment: currentSegment
      }
      continue
    }

    if (!currentItem) continue

    // 4. Parse Base Price
    if (line.startsWith('- Base Price:')) {
      const valStr = line.replace('- Base Price:', '').trim()
      currentItem.price = parseFloat(valStr)
      continue
    }

    // 5. Parse Description
    if (line.startsWith('- Description:')) {
      const descMatch = line.match(/\(([^)]+)\)/)
      if (descMatch) {
        currentItem.description = descMatch[1].trim()
      }
      continue
    }

    // 6. Parse prices (multi-price variant shortcut)
    if (line.startsWith('- Prices:')) {
      const pricesStr = line.replace('- Prices:', '').trim()
      const priceParts = pricesStr.split('/').map(p => parseFloat(p.trim())).filter(p => !isNaN(p))
      if (priceParts.length > 0) {
        const names = getVariantNames(currentItem.name, priceParts.length)
        currentItem.variants = priceParts.map((p, idx) => ({
          name: names[idx] || `Option ${idx + 1}`,
          price: p
        }))
        currentItem.price = priceParts[0]
      }
      continue
    }

    // 7. Parse Explicit size price variant
    const varMatch = line.match(/^-\s*([^:]+):\s*(\d+)$/)
    if (varMatch) {
      const varName = varMatch[1].trim()
      const varPrice = parseFloat(varMatch[2])
      if (!currentItem.variants) {
        currentItem.variants = []
      }
      currentItem.variants.push({
        name: varName,
        price: varPrice
      })
      if (currentItem.price === 0 || isNaN(currentItem.price)) {
        currentItem.price = varPrice
      }
    }
  }

  if (currentItem) {
    items.push(currentItem)
  }

  // Filter out items with no valid price and no variants
  return items.filter(item => {
    const hasVariants = item.variants && item.variants.length > 0
    const hasBasePrice = !isNaN(item.price) && item.price > 0
    return hasVariants || hasBasePrice
  })
}

/**
 * Server Action: Read and parse the local menu markdown file,
 * then seed the menu categories and menu items tables.
 */
export async function seedMenuAction() {
  try {
    const { profile } = await verifyAdminPermission()
    const supabase = await createServerClient()

    // 1. Read markdown file
    const filePath = path.join(process.cwd(), 'menu', 'accurate_tipsy_menu.md')
    if (!fs.existsSync(filePath)) {
      throw new Error(`Menu file not found at ${filePath}`)
    }
    const fileContent = fs.readFileSync(filePath, 'utf8')

    // 2. Parse items
    const parsedItems = parseMenuMarkdown(fileContent)
    if (parsedItems.length === 0) {
      throw new Error('No valid menu items parsed from markdown.')
    }

    // 3. Extract unique categories and their segments
    const categoryMap = new Map<string, { segment: 'food' | 'cardboard'; sort_order: number }>()
    let sortOrder = 1
    for (const item of parsedItems) {
      if (!categoryMap.has(item.categoryName)) {
        categoryMap.set(item.categoryName, {
          segment: item.segment,
          sort_order: sortOrder++
        })
      }
    }

    // 4. Delete existing menu categories and items for this restaurant
    const { error: deleteItemsErr } = await supabase
      .from('menu_items')
      .delete()
      .eq('restaurant_id', profile.restaurant_id)

    if (deleteItemsErr) throw deleteItemsErr

    const { error: deleteCatsErr } = await supabase
      .from('menu_categories')
      .delete()
      .eq('restaurant_id', profile.restaurant_id)

    if (deleteCatsErr) throw deleteCatsErr

    // 5. Insert new categories
    const categoriesInsert = Array.from(categoryMap.entries()).map(([name, val]) => ({
      restaurant_id: profile.restaurant_id,
      name,
      segment: val.segment,
      sort_order: val.sort_order
    }))

    const { data: categoriesData, error: insertCatsErr } = await supabase
      .from('menu_categories')
      .insert(categoriesInsert)
      .select()

    if (insertCatsErr) throw insertCatsErr
    if (!categoriesData) throw new Error('Failed to retrieve seeded categories.')

    // 6. Map category name to generated UUID
    const categoryIdByName = new Map<string, string>()
    categoriesData.forEach(cat => {
      categoryIdByName.set(cat.name, cat.id)
    })

    // 7. Insert items
    const itemsInsert = parsedItems.map(item => ({
      restaurant_id: profile.restaurant_id,
      category_id: categoryIdByName.get(item.categoryName)!,
      name: item.name,
      description: item.description,
      price: item.price,
      variants: item.variants,
      is_available: true,
      printer_type: item.printer_type
    }))

    const { error: insertItemsErr } = await supabase
      .from('menu_items')
      .insert(itemsInsert)

    if (insertItemsErr) throw insertItemsErr

    return {
      success: true,
      message: `Successfully synchronized database with ${parsedItems.length} menu items across ${categoriesData.length} categories.`
    }
  } catch (err: any) {
    console.error('Error in seedMenuAction Server Action:', err)
    return {
      success: false,
      error: err.message || 'Failed to sync menu.'
    }
  }
}
