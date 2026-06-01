'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, Shield, Grid, ClipboardList, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  // Clear states on mount
  useEffect(() => {
    setError(null)
    setInfo(null)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)
    
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (signInError) {
        setError(signInError.message)
      } else if (data?.user) {
        const role = data.user.user_metadata?.role || 'captain'
        const searchParams = new URLSearchParams(window.location.search)
        const nextUrl = searchParams.get('next')
        
        if (nextUrl) {
          router.push(nextUrl)
        } else {
          router.push(role === 'admin' || role === 'manager' ? '/dashboard' : '/captain/tables')
        }
        router.refresh()
      }
    } catch (err) {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Bypass simulator: checks if user exists in Supabase. If not, auto-registers them!
  const handleMockLogin = async (role: 'captain' | 'manager' | 'admin') => {
    setLoading(true)
    setError(null)
    setInfo(null)
    
    const email = `${role}@tipsypos.com`
    const password = 'password123'
    const name = {
      captain: 'Demo Captain',
      manager: 'Demo Manager',
      admin: 'Demo Admin'
    }[role]
    
    try {
      // 1. Try to sign in with standard demo credentials
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (signInError) {
        // 2. If user doesn't exist, let's automatically sign them up!
        if (
          signInError.message.includes('Invalid login credentials') || 
          signInError.status === 400 || 
          signInError.message.includes('User not found')
        ) {
          setInfo(`Setting up sandbox credentials for ${role}...`)
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                role,
                name,
              }
            }
          })
          
          if (signUpError) {
            setError(`Auto-registration failed: ${signUpError.message}`)
            setInfo(null)
            return
          }
          
          // 3. Try to sign in again after auto-signup
          if (signUpData?.session) {
            router.push(role === 'captain' ? '/captain/tables' : '/dashboard')
            router.refresh()
            return
          } else {
            // Try to sign in again if no immediate session is returned (e.g. standard email confirmation disabled flow)
            const { data: secondData, error: secondSignInError } = await supabase.auth.signInWithPassword({
              email,
              password,
            })
            
            if (secondSignInError) {
              if (secondSignInError.message.includes('Email not confirmed')) {
                setError('Demo user created! Please confirm the email in your Supabase Auth dashboard, or disable "Confirm email" in Auth Settings.')
              } else {
                setError(`Setup completed but sign-in failed: ${secondSignInError.message}`)
              }
              setInfo(null)
              return
            }
            
            if (secondData?.user) {
              router.push(role === 'captain' ? '/captain/tables' : '/dashboard')
              router.refresh()
              return
            }
          }
        } else {
          setError(signInError.message)
          return
        }
      }
      
      if (data?.user) {
        router.push(role === 'captain' ? '/captain/tables' : '/dashboard')
        router.refresh()
      }
      
    } catch (err) {
      setError('Simulation setup failed. Please make sure Supabase is connected.')
      setInfo(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6 sm:p-8 rounded-3xl border border-zinc-200/80 bg-background shadow-xl dark:border-zinc-900 animate-in zoom-in-95 duration-200">
      
      {/* Brand Header */}
      <div className="text-center space-y-2 animate-in slide-in-from-top-3 duration-300">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 font-extrabold text-white text-xl shadow-lg shadow-amber-500/20">
          T
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Sign In to Tipsy POS</h2>
        <p className="text-xs text-muted-foreground">Select a sandbox role or enter your credentials</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 text-xs font-semibold text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl animate-shake">
          {error}
        </div>
      )}

      {info && (
        <div className="p-3 text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {info}
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
            disabled={loading}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200/80 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
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
            disabled={loading}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200/80 bg-background text-foreground dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 flex items-center justify-center gap-2 tracking-wide disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          Authenticate Session
        </button>
      </form>

      {/* Quick Sandbox Bypass */}
      <div className="relative flex items-center justify-center my-6">
        <span className="absolute w-full h-[1px] bg-zinc-100 dark:bg-zinc-900"></span>
        <span className="relative text-[9px] font-bold text-muted-foreground bg-background px-3 uppercase tracking-wider">Sandbox Quick Logins</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => handleMockLogin('captain')}
          disabled={loading}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-900 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900/50 active:scale-95 transition-all text-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Grid className="w-5 h-5 text-amber-500" />
          <span className="text-[10px] font-bold text-foreground">Captain</span>
          <span className="text-[8px] text-muted-foreground leading-none">Terminal</span>
        </button>

        <button
          onClick={() => handleMockLogin('manager')}
          disabled={loading}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-900 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900/50 active:scale-95 transition-all text-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <ClipboardList className="w-5 h-5 text-emerald-500" />
          <span className="text-[10px] font-bold text-foreground">Manager</span>
          <span className="text-[8px] text-muted-foreground leading-none">Dashboard</span>
        </button>

        <button
          onClick={() => handleMockLogin('admin')}
          disabled={loading}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-900 bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900/50 active:scale-95 transition-all text-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Shield className="w-5 h-5 text-indigo-500" />
          <span className="text-[10px] font-bold text-foreground">Admin</span>
          <span className="text-[8px] text-muted-foreground leading-none">Control Room</span>
        </button>
      </div>

    </div>
  )
}
