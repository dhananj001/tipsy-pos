'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, Shield, Grid } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Bypass simulator for rapid UI/UX validation before DB seeds are loaded
  const handleMockLogin = (role: 'captain' | 'admin') => {
    setLoading(true)
    setError(null)
    
    try {
      // Direct navigation to layouts for evaluation
      window.location.href = role === 'admin' ? '/dashboard' : '/captain/tables'
    } catch (err) {
      setError('Simulation bypass failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6 sm:p-8 rounded-3xl border border-zinc-200/80 bg-background shadow-xl dark:border-zinc-900">
      
      {/* Brand Header */}
      <div className="text-center space-y-2 animate-in slide-in-from-top-3 duration-300">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 font-extrabold text-white text-xl shadow-lg shadow-amber-500/20">
          T
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Sign In to Tipsy POS</h2>
        <p className="text-xs text-muted-foreground">Select a role or sign in with your credentials</p>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl animate-shake">
          {error}
        </div>
      )}

      {/* Credentials Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200/80 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="e.g. manager@tipsypos.com"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200/80 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          Authenticate Session
        </button>
      </form>

      {/* Quick Scaffolding Bypass */}
      <div className="relative flex items-center justify-center my-6">
        <span className="absolute w-full h-[1px] bg-zinc-100 dark:bg-zinc-900"></span>
        <span className="relative text-[9px] font-bold text-muted-foreground bg-background px-3 uppercase tracking-wider">Scaffolding bypasses</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleMockLogin('captain')}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-900 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900/50 active:scale-95 transition-all text-center gap-1.5 cursor-pointer"
        >
          <Grid className="w-5 h-5 text-amber-500" />
          <span className="text-[10px] font-bold text-foreground">Captain Terminal</span>
          <span className="text-[8px] text-muted-foreground">Mobile Ordering</span>
        </button>

        <button
          onClick={() => handleMockLogin('admin')}
          className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-900 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900/50 active:scale-95 transition-all text-center gap-1.5 cursor-pointer"
        >
          <Shield className="w-5 h-5 text-indigo-500" />
          <span className="text-[10px] font-bold text-foreground">Admin Center</span>
          <span className="text-[8px] text-muted-foreground">Dashboard Hub</span>
        </button>
      </div>

    </div>
  )
}
