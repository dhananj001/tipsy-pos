'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { 
  Printer, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  X,
  Wifi,
  WifiOff,
  Settings,
  ShieldAlert,
  RotateCcw,
  History,
  Activity,
  Trash
} from 'lucide-react'

interface PrinterConfig {
  id: string
  restaurant_id: string
  name: string
  ip_address: string
  port: number
  type: 'kitchen' | 'bar' | 'billing'
  is_active: boolean
  connection_status?: 'online' | 'offline'
  connection_error?: string | null
  last_connected_at?: string | null
  created_at?: string
  updated_at?: string
}

interface PrintJob {
  id: string
  restaurant_id: string
  printer_id: string
  payload: any
  status: 'pending' | 'processing' | 'printed' | 'failed'
  error_message: string | null
  attempts: number
  created_at: string
}

export default function PrintersManagementPage() {
  const { profile } = useAuth()
  const [printers, setPrinters] = useState<PrinterConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Print Jobs Queue States
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [retryLoading, setRetryLoading] = useState<Record<string, boolean>>({})
  const [jobsFilter, setJobsFilter] = useState<'all' | 'pending' | 'printed' | 'failed'>('all')
  const [clearingHistory, setClearingHistory] = useState(false)
  const [cancellingPending, setCancellingPending] = useState(false)

  // Form Modal States
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null)
  const [formName, setFormName] = useState('')
  const [formIp, setFormIp] = useState('')
  const [formPort, setFormPort] = useState('9100')
  const [formType, setFormType] = useState<'kitchen' | 'bar' | 'billing'>('kitchen')
  const [formActive, setFormActive] = useState(true)
  const [submittingForm, setSubmittingForm] = useState(false)

  // Test Print Loading Map
  const [testingPrinters, setTestingPrinters] = useState<Record<string, boolean>>({})

  const supabase = createClient()

  // 1. Fetch printers
  const fetchPrinters = async (showSyncState = false) => {
    if (!profile?.restaurant_id) return
    if (showSyncState) setSyncing(true)

    try {
      const { data, error: fetchErr } = await supabase
        .from('printers')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setPrinters(data as PrinterConfig[] || [])
      setError(null)
    } catch (err: any) {
      console.error('Error fetching printers:', err)
      setError(err.message || 'Failed to sync printer list.')
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  // 1.5. Fetch print jobs history
  const fetchPrintJobs = async () => {
    if (!profile?.restaurant_id) return
    try {
      const { data, error: jobsErr } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (jobsErr) throw jobsErr
      setPrintJobs(data as PrintJob[] || [])
    } catch (err: any) {
      console.error('Error fetching print jobs:', err)
    } finally {
      setLoadingJobs(false)
    }
  }

  // 2. Realtime sync on mount
  useEffect(() => {
    if (!profile?.restaurant_id) return

    fetchPrinters()
    fetchPrintJobs()

    // Subscribe to printers database changes
    const printersChannel = supabase
      .channel('admin:printers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'printers',
          filter: `restaurant_id=eq.${profile.restaurant_id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setPrinters((prev) => {
              if (prev.some((p) => p.id === payload.new.id)) return prev
              return [payload.new as PrinterConfig, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            setPrinters((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as PrinterConfig) : p))
            )
          } else if (payload.eventType === 'DELETE') {
            setPrinters((prev) => prev.filter((p) => p.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Subscribe to print_jobs database changes
    const jobsChannel = supabase
      .channel('admin:print_jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'print_jobs',
          filter: `restaurant_id=eq.${profile.restaurant_id}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setPrintJobs((prev) => {
              if (prev.some((j) => j.id === payload.new.id)) return prev
              return [payload.new as PrintJob, ...prev].slice(0, 20)
            })
          } else if (payload.eventType === 'UPDATE') {
            setPrintJobs((prev) =>
              prev.map((j) => (j.id === payload.new.id ? (payload.new as PrintJob) : j))
            )
          } else if (payload.eventType === 'DELETE') {
            setPrintJobs((prev) => prev.filter((j) => j.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(printersChannel)
      supabase.removeChannel(jobsChannel)
    }
  }, [profile?.restaurant_id])

  // 3. Open modal for Add
  const handleOpenAdd = () => {
    setEditingPrinter(null)
    setFormName('')
    setFormIp('')
    setFormPort('9100')
    setFormType('kitchen')
    setFormActive(true)
    setModalOpen(true)
  }

  // 4. Open modal for Edit
  const handleOpenEdit = (printer: PrinterConfig) => {
    setEditingPrinter(printer)
    setFormName(printer.name)
    setFormIp(printer.ip_address)
    setFormPort(String(printer.port))
    setFormType(printer.type)
    setFormActive(printer.is_active)
    setModalOpen(true)
  }

  // 5. Submit Form (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.restaurant_id) return

    // Input Validation
    if (!formName.trim()) {
      setError('Printer name is required.')
      return
    }

    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    const trimmedIp = formIp.trim()
    const isLocalOrSharedPath = trimmedIp.startsWith("\\\\") || trimmedIp.startsWith("//") || trimmedIp.startsWith("printer:")
    if (!ipRegex.test(trimmedIp) && !isLocalOrSharedPath) {
      setError('Please provide a valid IP address (e.g. 192.168.1.100) or shared printer path (e.g. \\\\localhost\\printer_name).')
      return
    }

    const portNum = parseInt(formPort.trim())
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setError('Port must be a valid number between 1 and 65535.')
      return
    }

    setSubmittingForm(true)
    setError(null)
    setSuccess(null)

    try {
      const printerData = {
        restaurant_id: profile.restaurant_id,
        name: formName.trim(),
        ip_address: formIp.trim(),
        port: portNum,
        type: formType,
        is_active: formActive
      }

      if (editingPrinter) {
        // Edit flow
        const { error: editErr } = await supabase
          .from('printers')
          .update(printerData)
          .eq('id', editingPrinter.id)

        if (editErr) throw editErr
        showSuccessAlert('Printer settings updated successfully!')
      } else {
        // Add flow
        const { error: addErr } = await supabase
          .from('printers')
          .insert([printerData])

        if (addErr) throw addErr
        showSuccessAlert('New LAN printer registered successfully!')
      }

      setModalOpen(false)
    } catch (err: any) {
      console.error('Error submitting printer form:', err)
      setError(err.message || 'Operation failed. Verify connectivity parameters.')
    } finally {
      setSubmittingForm(false)
    }
  }

  // 6. Delete printer
  const handleDelete = async (printerId: string) => {
    if (!window.confirm('Are you sure you want to delete this printer? This action is irreversible.')) return

    try {
      const { error: delErr } = await supabase
        .from('printers')
        .delete()
        .eq('id', printerId)

      if (delErr) throw delErr
      showSuccessAlert('Printer successfully deleted.')
    } catch (err: any) {
      console.error('Error deleting printer:', err)
      setError(delErrMessage(err))
    }
  }

  // 7. Toggle quick active state
  const handleToggleActive = async (printer: PrinterConfig) => {
    try {
      const { error: patchErr } = await supabase
        .from('printers')
        .update({ is_active: !printer.is_active })
        .eq('id', printer.id)

      if (patchErr) throw patchErr
      showSuccessAlert(`${printer.name} ${!printer.is_active ? 'enabled' : 'disabled'} successfully.`)
    } catch (err: any) {
      console.error('Error toggling active state:', err)
      setError(err.message)
    }
  }

  // 8. Test silent Lan Print (Insert print_jobs row)
  const handleTestPrint = async (printer: PrinterConfig) => {
    setTestingPrinters(prev => ({ ...prev, [printer.id]: true }))
    try {
      const testPayload = {
        type: 'GENERIC',
        title: 'PRINTER TEST CONNECTION',
        text: `This is a successful silent LAN test print from the Tipsy POS management panel.\n\nPrinter Details:\nName: ${printer.name}\nIP Address: ${printer.ip_address}\nPort: ${printer.port}\nType: ${printer.type.toUpperCase()}\n\nLAN printer server routing is operating normally!`
      }

      const { error: printErr } = await supabase
        .from('print_jobs')
        .insert([{
          restaurant_id: profile?.restaurant_id,
          printer_id: printer.id,
          payload: testPayload,
          status: 'pending',
          attempts: 0
        }])

      if (printErr) throw printErr
      showSuccessAlert(`Test job dispatched to ${printer.name}. Monitor print queue!`)
    } catch (err: any) {
      console.error('Failed test print job insertion:', err)
      setError(`Test print failed: ${err.message}`)
    } finally {
      setTestingPrinters(prev => ({ ...prev, [printer.id]: false }))
    }
  }

  // 9. Admin retry/reprint operations
  const handleRetryJob = async (jobId: string) => {
    setRetryLoading(prev => ({ ...prev, [jobId]: true }))
    try {
      const { error } = await supabase
        .from('print_jobs')
        .update({
          status: 'pending',
          error_message: null,
          attempts: 0
        })
        .eq('id', jobId)

      if (error) throw error
      showSuccessAlert('Print job queued for retry!')
    } catch (err: any) {
      setError(`Failed to retry job: ${err.message}`)
    } finally {
      setRetryLoading(prev => ({ ...prev, [jobId]: false }))
    }
  }

  const handleRetryAllFailed = async () => {
    const failedJobs = printJobs.filter(j => j.status === 'failed')
    if (failedJobs.length === 0) return
    
    setSyncing(true)
    try {
      const { error } = await supabase
        .from('print_jobs')
        .update({
          status: 'pending',
          error_message: null,
          attempts: 0
        })
        .in('id', failedJobs.map(j => j.id))

      if (error) throw error
      showSuccessAlert(`Re-queued ${failedJobs.length} failed jobs!`)
    } catch (err: any) {
      setError(`Failed to retry jobs: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleClearPrintedHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all successfully printed jobs from history?')) return
    setClearingHistory(true)
    try {
      const { error } = await supabase
        .from('print_jobs')
        .delete()
        .eq('restaurant_id', profile?.restaurant_id)
        .eq('status', 'printed')

      if (error) throw error
      showSuccessAlert('Successfully printed jobs cleared from log.')
      fetchPrintJobs()
    } catch (err: any) {
      setError(`Failed to clear history: ${err.message}`)
    } finally {
      setClearingHistory(false)
    }
  }

  const handleCancelAllPending = async () => {
    const pendingJobs = printJobs.filter(j => j.status === 'pending' || j.status === 'processing')
    if (pendingJobs.length === 0) return
    if (!window.confirm(`Are you sure you want to cancel and delete all ${pendingJobs.length} pending/processing print jobs?`)) return
    
    setCancellingPending(true)
    try {
      const { error } = await supabase
        .from('print_jobs')
        .delete()
        .eq('restaurant_id', profile?.restaurant_id)
        .in('status', ['pending', 'processing'])

      if (error) throw error
      showSuccessAlert(`Cancelled and deleted ${pendingJobs.length} pending print jobs.`)
      fetchPrintJobs()
    } catch (err: any) {
      setError(`Failed to cancel pending jobs: ${err.message}`)
    } finally {
      setCancellingPending(false)
    }
  }

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job record?')) return
    try {
      const { error } = await supabase
        .from('print_jobs')
        .delete()
        .eq('id', jobId)

      if (error) throw error
      showSuccessAlert('Print job deleted.')
    } catch (err: any) {
      setError(`Failed to delete job: ${err.message}`)
    }
  }

  const getJobDescription = (job: PrintJob) => {
    const payload = job.payload || {}
    const type = (payload.type || 'KOT').toUpperCase()
    const table = payload.tableName && payload.tableNumber ? `${payload.tableName} ${payload.tableNumber}` : ''
    
    if (type === 'KOT') {
      const itemsCount = payload.items?.length || 0
      return `KOT: ${table || 'No Table'} (${itemsCount} items)`
    } else if (type === 'BILL' || type === 'INVOICE') {
      const total = payload.grandTotal || payload.total || 0
      return `Bill: ${table || 'No Table'} (Total: Rs. ${parseFloat(total).toFixed(2)})`
    }
    return payload.title || payload.text?.substring(0, 30) || 'Generic Print Job'
  }

  const getPrinterName = (printerId: string) => {
    return printers.find(p => p.id === printerId)?.name || 'Unknown Printer'
  }

  // Helper alerts
  const showSuccessAlert = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3500)
  }

  const delErrMessage = (err: any) => {
    return err.message || 'Could not delete printer. It might be referenced by pending print jobs.'
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Synchronizing Printers configurations...</p>
        </div>
      </div>
    )
  }

    const isPrintServerActive = printers.some(p => {
      if (!p.updated_at) return false
      const diff = Date.now() - new Date(p.updated_at).getTime()
      return diff < 45000 // Pings run every 20s, allow 45s cushion
    })

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Header panel */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Printer className="w-6 h-6 text-indigo-500" />
              Hardware & Printers Console
            </h1>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-0.5">
              <p className="text-xs text-muted-foreground">Manage silent ESC/POS kitchen, bar, and invoice LAN printers</p>
              <span className="text-[10px] text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
              {isPrintServerActive ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Print Server Host: Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-zinc-400 bg-zinc-150 dark:bg-zinc-900 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  Print Server Host: Disconnected
                </span>
              )}
            </div>
          </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchPrinters(true)}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-background hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            Add LAN Printer
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="p-3 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:opacity-85">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid of Configured Hardware */}
      {printers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-850 bg-zinc-50/30 dark:bg-zinc-950/10">
          <Settings className="w-12 h-12 text-zinc-400 mx-auto animate-pulse" />
          <h3 className="text-sm font-bold text-foreground mt-4">No Network Printers Registered</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1.5">Configure your LAN escape sequence thermal printers (Kitchen KOT, Bar Drinks, or Billing Cashout) to activate real-time routing.</p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add First Printer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {printers.map((printer) => {
            const typeBadge = {
              kitchen: 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400',
              bar: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
              billing: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }[printer.type]

            const isTesting = testingPrinters[printer.id]

            return (
              <div 
                key={printer.id}
                className={`p-5 rounded-2xl border bg-background flex flex-col justify-between min-h-[14.5rem] transition-all ${
                  printer.is_active 
                    ? 'border-zinc-200/80 dark:border-zinc-900 shadow-sm'
                    : 'border-zinc-200/40 dark:border-zinc-900/40 opacity-70 bg-zinc-50/20 dark:bg-zinc-950/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-foreground truncate max-w-[180px]">{printer.name}</h3>
                      <span className={`inline-block border px-2 py-0.5 rounded-md text-[9px] font-black uppercase mt-1 tracking-wider ${typeBadge}`}>
                        {printer.type}
                      </span>
                    </div>

                    {/* Active Checkbox/Badge Toggle */}
                    <button
                      onClick={() => handleToggleActive(printer)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold cursor-pointer active:scale-95 transition-all select-none ${
                        printer.is_active
                          ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-600'
                          : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      {printer.is_active ? (
                        <>
                          <Wifi className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3 h-3" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">IP Addr:</span> 
                      <span className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-[11px]">{printer.ip_address}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">Port:</span> 
                      <span className="font-mono bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-[11px]">{printer.port}</span>
                    </p>

                    {printer.is_active && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-900/60">
                        <span className="font-bold text-foreground text-[10px] uppercase tracking-wider">Status:</span>
                        {printer.connection_status === 'online' ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full animate-in fade-in duration-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        ) : printer.connection_status === 'offline' ? (
                          <span 
                            className="inline-flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full cursor-help animate-in fade-in duration-300"
                            title={printer.connection_error || 'Offline'}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Offline
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-450" />
                            Awaiting Ping
                          </span>
                        )}

                        {printer.connection_status === 'offline' && printer.connection_error && (
                          <span className="text-[9px] text-rose-500 font-mono truncate max-w-[125px] block" title={printer.connection_error}>
                            ({printer.connection_error})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Operations bar */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleTestPrint(printer)}
                    disabled={isTesting || !printer.is_active}
                    className="flex-1 py-1.5 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 font-bold text-[10px] rounded-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {isTesting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(printer)}
                      className="p-2 border border-zinc-200 bg-background hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-foreground rounded-lg cursor-pointer active:scale-95 transition-all"
                      title="Edit Printer Configurations"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(printer.id)}
                      className="p-2 border border-red-200 bg-background hover:bg-red-50 dark:border-red-950/30 dark:hover:bg-red-950/20 text-red-500 rounded-lg cursor-pointer active:scale-95 transition-all"
                      title="Remove Hardware"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Live Print Queue Panel */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-background p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 dark:border-zinc-900 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <History className="w-5 h-5 text-indigo-500" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Live Print Queue Monitor</h2>
              <p className="text-xs text-muted-foreground">Monitor real-time print execution status and retry failed jobs</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRetryAllFailed}
              disabled={printJobs.filter(j => j.status === 'failed').length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 text-xs font-bold disabled:opacity-40 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry All Failed
            </button>

            <button
              onClick={handleClearPrintedHistory}
              disabled={clearingHistory || printJobs.filter(j => j.status === 'printed').length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-250 bg-background hover:bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold disabled:opacity-40 transition-all cursor-pointer"
            >
              <Trash className="w-3.5 h-3.5" />
              Clear History
            </button>

            <button
              onClick={handleCancelAllPending}
              disabled={cancellingPending || printJobs.filter(j => j.status === 'pending' || j.status === 'processing').length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-250 bg-background hover:bg-red-50 text-red-500 dark:border-zinc-800 dark:hover:bg-red-950/20 text-xs font-bold disabled:opacity-40 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Cancel All Pending
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'pending', 'printed', 'failed'] as const).map((filter) => {
            const count = filter === 'all' 
              ? printJobs.length 
              : printJobs.filter(j => j.status === filter || (filter === 'pending' && j.status === 'processing')).length
            
            const isActive = jobsFilter === filter
            return (
              <button
                key={filter}
                onClick={() => setJobsFilter(filter)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer capitalize ${
                  isActive 
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-500/10'
                    : 'border-zinc-200 bg-background text-muted-foreground hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                }`}
              >
                {filter === 'pending' ? 'Pending / Processing' : filter} ({count})
              </button>
            )
          })}
        </div>

        {/* Queue Table */}
        {loadingJobs ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : printJobs.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-zinc-50/50 dark:bg-zinc-950/10 border border-dashed border-zinc-200 dark:border-zinc-850">
            <Activity className="w-8 h-8 text-zinc-400 mx-auto animate-pulse" />
            <p className="text-xs text-muted-foreground mt-2">No print jobs found in queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-150 dark:border-zinc-900">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-150 dark:border-zinc-900 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Time & ID</th>
                  <th className="p-3.5">Printer Target</th>
                  <th className="p-3.5">Job Detail</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Attempts</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-900 text-xs">
                {printJobs
                  .filter(job => {
                    if (jobsFilter === 'all') return true
                    if (jobsFilter === 'pending') return job.status === 'pending' || job.status === 'processing'
                    return job.status === jobsFilter
                  })
                  .map((job) => {
                    const formattedTime = new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    
                    const statusConfig = {
                      pending: { badge: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600', text: 'Pending', icon: <Loader2 className="w-3 h-3 animate-spin text-yellow-500" /> },
                      processing: { badge: 'bg-blue-500/10 border-blue-500/20 text-blue-600', text: 'Processing', icon: <Loader2 className="w-3 h-3 animate-spin text-blue-500" /> },
                      printed: { badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600', text: 'Printed', icon: <CheckCircle className="w-3 h-3 text-emerald-500" /> },
                      failed: { badge: 'bg-red-500/10 border-red-500/20 text-red-600', text: 'Failed', icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" /> }
                    }[job.status]

                    const isRetrying = retryLoading[job.id]

                    return (
                      <React.Fragment key={job.id}>
                        <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-all">
                          <td className="p-3.5 pl-4 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                            <span className="font-bold text-foreground block">{formattedTime}</span>
                            <span>#{job.id.substring(0, 8)}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-extrabold text-foreground">{getPrinterName(job.printer_id)}</span>
                          </td>
                          <td className="p-3.5 font-bold text-zinc-700 dark:text-zinc-300">
                            {getJobDescription(job)}
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1.5 border px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${statusConfig.badge}`}>
                              {statusConfig.icon}
                              <span>{statusConfig.text}</span>
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-[10px] text-zinc-500 font-bold">
                            {job.attempts}
                          </td>
                          <td className="p-3.5 pr-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleRetryJob(job.id)}
                                disabled={isRetrying}
                                className="p-1.5 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 rounded-lg active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                                title="Reprint / Retry Job"
                              >
                                {isRetrying ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteJob(job.id)}
                                className="p-1.5 border border-red-200 bg-background hover:bg-red-50 dark:border-red-950/30 dark:hover:bg-red-950/20 text-red-500 rounded-lg active:scale-95 transition-all cursor-pointer"
                                title="Delete Log Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Error Message Sub-Row */}
                        {job.status === 'failed' && job.error_message && (
                          <tr className="bg-red-500/5">
                            <td colSpan={6} className="p-3 pl-12 pr-4 border-t-0 text-[11px]">
                              <div className="flex items-start gap-2 text-red-600 dark:text-red-400 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
                                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-extrabold block">Print Error Occurred:</span>
                                  <span className="font-mono">{job.error_message}</span>
                                  <span className="text-[10px] text-muted-foreground block mt-1">
                                    💡 Suggestions: Check if printer is online (IP {printers.find(p => p.id === job.printer_id)?.ip_address || 'N/A'}), check paper, and ensure local print-server is running on the host PC.
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Add Printer modal backdrop dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          <div className="relative z-10 w-full max-w-md bg-background border border-zinc-200 dark:border-zinc-900 rounded-2xl p-6 shadow-2xl animate-in fade-in duration-200">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-150 dark:border-zinc-900">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-black text-foreground">
                  {editingPrinter ? 'Edit Network Printer' : 'Register LAN Printer'}
                </h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-0.5">Printer Label Name</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Kitchen KOT Printer"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-250 bg-background dark:border-zinc-800 text-foreground placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* IP and Port row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-0.5">LAN IP / Shared Path</label>
                  <input 
                    type="text" 
                    value={formIp}
                    onChange={(e) => setFormIp(e.target.value)}
                    placeholder="192.168.1.100 or \\localhost\rp3160"
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-zinc-250 bg-background dark:border-zinc-800 text-foreground placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Use IP address for network printers, or Windows share path for local USB printers.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-0.5">Connection Port</label>
                  <input 
                    type="text" 
                    value={formPort}
                    onChange={(e) => setFormPort(e.target.value)}
                    placeholder="9100"
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl border border-zinc-250 bg-background dark:border-zinc-800 text-foreground placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Printer Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-0.5">Hardware Purpose / Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['kitchen', 'bar', 'billing'] as const).map((t) => {
                    const isSelected = formType === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormType(t)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-extrabold select-none transition-all text-center border cursor-pointer uppercase tracking-wider ${
                          isSelected 
                            ? 'bg-zinc-900 text-zinc-50 border-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:border-white shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/20 dark:border-zinc-850 dark:bg-zinc-950/20">
                <div>
                  <h4 className="text-xs font-bold">Hardware Enabled</h4>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Allow order queues to route to this terminal</p>
                </div>
                <input 
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-indigo-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-900 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submittingForm}
                  className="px-5 py-2.5 rounded-xl border border-zinc-250 bg-background text-foreground hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-xs font-bold cursor-pointer disabled:opacity-50 select-none"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 select-none"
                >
                  {submittingForm ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Saving Parameters...</span>
                    </>
                  ) : (
                    <span>Register Terminal</span>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}
