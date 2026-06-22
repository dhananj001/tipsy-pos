'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Database,
  Loader2,
  Trash2,
  Play
} from 'lucide-react'

declare global {
  interface Window {
    XLSX: any
  }
}

interface ParsedRow {
  [key: string]: any
}

interface SheetData {
  sheetName: string
  rows: ParsedRow[]
  headers: string[]
}

export default function MenuImportPage() {
  const { profile } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  
  // Column mapping states
  const [nameCol, setNameCol] = useState('')
  const [priceCol, setPriceCol] = useState('')
  const [categoryCol, setCategoryCol] = useState('')
  const [descCol, setDescCol] = useState('')
  const [printerCol, setPrinterCol] = useState('')
  
  // 1. Inject SheetJS CDN Script
  useEffect(() => {
    if (window.XLSX) {
      setScriptLoaded(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => setError('Failed to load excel parsing library.')
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  // 2. Fetch and Parse local Excel file
  const loadExcelFile = async () => {
    if (!window.XLSX) {
      setError('Excel library is still loading, please wait.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    setSheets([])
    
    try {
      const res = await fetch('/api/read-excel')
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to read spreadsheet file.')
      }

      // Convert base64 to array buffer
      const binaryString = window.atob(data.base64)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      const workbook = window.XLSX.read(bytes.buffer, { type: 'array' })
      const parsedSheets: SheetData[] = []
      
      workbook.SheetNames.forEach((sheetName: string) => {
        const worksheet = workbook.Sheets[sheetName]
        // Get rows as JSON objects (including empty rows, header in first row)
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as ParsedRow[]
        
        if (jsonData.length > 0) {
          const headers = Object.keys(jsonData[0])
          parsedSheets.push({
            sheetName,
            rows: jsonData,
            headers
          })
        }
      })
      
      if (parsedSheets.length === 0) {
        throw new Error('No data found in the spreadsheet.')
      }
      
      setSheets(parsedSheets)
      setSelectedSheet(parsedSheets[0].sheetName)
      autoDetectColumns(parsedSheets[0].headers)
      setSuccess('Excel file loaded and parsed successfully!')
    } catch (err: any) {
      console.error('Error loading excel:', err)
      setError(err.message || 'An error occurred while loading the excel file.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-detect mappings based on header name matches
  const autoDetectColumns = (headers: string[]) => {
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    headers.forEach(h => {
      const c = clean(h)
      if (c.includes('name') || c.includes('title') || c.includes('item') || c.includes('dish')) {
        setNameCol(h)
      } else if (c.includes('price') || c.includes('rate') || c.includes('cost') || c.includes('mrp')) {
        setPriceCol(h)
      } else if (c.includes('category') || c.includes('cat') || c.includes('group') || c.includes('type')) {
        setCategoryCol(h)
      } else if (c.includes('desc') || c.includes('detail') || c.includes('info')) {
        setDescCol(h)
      } else if (c.includes('print') || c.includes('kot') || c.includes('route')) {
        setPrinterCol(h)
      }
    })
  }

  // Update mappings when sheet changes
  useEffect(() => {
    const sheet = sheets.find(s => s.sheetName === selectedSheet)
    if (sheet) {
      autoDetectColumns(sheet.headers)
    }
  }, [selectedSheet, sheets])

  const handleSyncDatabase = async () => {
    if (!profile?.restaurant_id) {
      setError('You must be logged in to sync the database.')
      return
    }
    const activeSheet = sheets.find(s => s.sheetName === selectedSheet)
    if (!activeSheet) {
      setError('Please select a sheet first.')
      return
    }
    if (!nameCol) {
      setError('Please specify the column containing item names.')
      return
    }
    if (!priceCol) {
      setError('Please specify the column containing item prices.')
      return
    }
    if (!categoryCol) {
      setError('Please specify the column containing item categories.')
      return
    }

    if (!confirm('WARNING: This will delete ALL existing menu items and categories for your restaurant and replace them with the data from this sheet. Are you sure you want to proceed?')) {
      return
    }

    setSyncing(true)
    setError(null)
    setSuccess(null)

    try {
      const restaurant_id = profile.restaurant_id
      const rows = activeSheet.rows

      // 1. Extract categories and create unique category names
      const categoryNames = Array.from(
        new Set(
          rows
            .map(row => String(row[categoryCol] || '').trim())
            .filter(name => name !== '')
        )
      )

      if (categoryNames.length === 0) {
        throw new Error('No categories found in the selected category column.')
      }

      console.log('Categories to create:', categoryNames)

      // 2. Delete previous menu entries (foreign key cascade deletes menu_items)
      const { error: deleteCatsError } = await supabase
        .from('menu_categories')
        .delete()
        .eq('restaurant_id', restaurant_id)

      if (deleteCatsError) {
        throw new Error(`Failed to delete previous categories: ${deleteCatsError.message}`)
      }

      // 3. Insert new categories
      const categoriesToInsert = categoryNames.map((name, index) => ({
        restaurant_id,
        name,
        sort_order: index * 10
      }))

      const { data: insertedCats, error: insertCatsError } = await supabase
        .from('menu_categories')
        .insert(categoriesToInsert)
        .select()

      if (insertCatsError || !insertedCats) {
        throw new Error(`Failed to insert categories: ${insertCatsError?.message || 'No categories returned'}`)
      }

      // Create a mapping of Category Name -> ID
      const categoryMap = new Map<string, string>()
      insertedCats.forEach(cat => {
        categoryMap.set(cat.name.toLowerCase(), cat.id)
      })

      // 4. Map and insert menu items
      const itemsToInsert = rows
        .map(row => {
          const rawName = String(row[nameCol] || '').trim()
          const rawPrice = parseFloat(String(row[priceCol] || '0').replace(/[^0-9.]/g, ''))
          const rawCatName = String(row[categoryCol] || '').trim()
          const rawDesc = descCol ? String(row[descCol] || '').trim() : ''
          const rawPrinter = printerCol ? String(row[printerCol] || '').trim().toLowerCase() : ''

          if (!rawName || isNaN(rawPrice)) {
            return null // Skip invalid rows
          }

          const catId = categoryMap.get(rawCatName.toLowerCase())
          if (!catId) {
            return null // Skip if no category matching
          }

          // Resolve printer routing
          let printer_type: 'kitchen' | 'bar' | 'billing' = 'kitchen'
          if (rawPrinter.includes('bar') || rawPrinter.includes('beverage') || rawPrinter.includes('drink')) {
            printer_type = 'bar'
          } else if (rawPrinter.includes('bill') || rawPrinter.includes('counter')) {
            printer_type = 'billing'
          }

          return {
            restaurant_id,
            category_id: catId,
            name: rawName,
            description: rawDesc || null,
            price: rawPrice,
            is_available: true,
            printer_type
          }
        })
        .filter(item => item !== null)

      if (itemsToInsert.length === 0) {
        throw new Error('No valid menu items to import after mapping.')
      }

      console.log(`Inserting ${itemsToInsert.length} menu items...`)

      const { error: insertItemsError } = await supabase
        .from('menu_items')
        .insert(itemsToInsert)

      if (insertItemsError) {
        throw new Error(`Failed to insert menu items: ${insertItemsError.message}`)
      }

      setSuccess(`Successfully synchronized! Imported ${categoryNames.length} categories and ${itemsToInsert.length} menu items.`)
    } catch (err: any) {
      console.error('Sync error:', err)
      setError(err.message || 'Failed to synchronize database.')
    } finally {
      setSyncing(false)
    }
  }

  // Load preview data from the active sheet
  const activeSheet = sheets.find(s => s.sheetName === selectedSheet)
  const previewRows = activeSheet ? activeSheet.rows.slice(0, 10) : []

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Navigation */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/dashboard/menu')}
          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-foreground cursor-pointer transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-500" />
            Excel Menu Importer
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Parse, map, and synchronize the database with the new spreadsheet menu</p>
        </div>
      </div>

      {/* Main Alert Notification */}
      {error && (
        <div className="p-4 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{success}</span>
        </div>
      )}

      {/* Loader step */}
      {!scriptLoaded ? (
        <div className="flex h-[30vh] w-full items-center justify-center rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-background/50 backdrop-blur-md">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-muted-foreground text-xs font-semibold">Initializing sheet parser libraries...</p>
          </div>
        </div>
      ) : sheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-background/30 backdrop-blur-md text-center max-w-xl mx-auto space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Sync with TIPSY BBE NEW MENU.XLSX</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-sm">
              We detected the Excel menu file in the repository. Click the button below to load and inspect its sheets and columns before import.
            </p>
          </div>
          <button
            onClick={loadExcelFile}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reading Excel File...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Load Excel File from Server
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mapping settings */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-900 bg-background/50 backdrop-blur-md space-y-4">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-500" />
                Column Mapping Config
              </h3>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Select Sheet</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {sheets.map(s => (
                    <option key={s.sheetName} value={s.sheetName}>{s.sheetName} ({s.rows.length} rows)</option>
                  ))}
                </select>
              </div>

              {activeSheet && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Dish/Item Name Column *</label>
                    <select
                      value={nameCol}
                      onChange={(e) => setNameCol(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {activeSheet.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Price Column *</label>
                    <select
                      value={priceCol}
                      onChange={(e) => setPriceCol(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {activeSheet.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Category Column *</label>
                    <select
                      value={categoryCol}
                      onChange={(e) => setCategoryCol(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {activeSheet.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Description Column (Optional)</label>
                    <select
                      value={descCol}
                      onChange={(e) => setDescCol(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- None --</option>
                      {activeSheet.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Printer Routing Column (Optional)</label>
                    <select
                      value={printerCol}
                      onChange={(e) => setPrinterCol(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- None --</option>
                      {activeSheet.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 space-y-3">
                <div className="p-3 text-[10px] leading-relaxed font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Proceeding will permanently delete all existing categories and dishes from the database and seed the new records.
                  </span>
                </div>

                <button
                  onClick={handleSyncDatabase}
                  disabled={syncing || !nameCol || !priceCol || !categoryCol}
                  className="w-full py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/15 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Synchronizing DB...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Wipe & Sync New Menu
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Preview panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-900 bg-background/50 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground">
                  Excel Data Preview (First 10 rows)
                </h3>
                <span className="text-[10px] font-bold text-muted-foreground uppercase bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded">
                  {activeSheet?.rows.length} Total Rows
                </span>
              </div>

              <div className="overflow-x-auto border border-zinc-100 dark:border-zinc-900 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-900 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {activeSheet?.headers.map(h => (
                        <th key={h} className="p-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-900 font-medium text-foreground">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                        {activeSheet?.headers.map(h => (
                          <td key={h} className="p-3 max-w-[150px] truncate">{String(row[h] || '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
