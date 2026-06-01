'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Shield, Grid, CheckCircle2, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/providers/theme-provider'

export default function Home() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* Sleek Top Navbar */}
      <header className="flex h-16 shrink-0 items-center justify-between px-6 md:px-12 border-b border-zinc-200/50 bg-background/80 backdrop-blur-md dark:border-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 font-extrabold text-white text-base shadow-md shadow-amber-500/20">
            T
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">Tipsy POS</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-650 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
          </button>
          
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 dark:bg-white dark:text-zinc-950 rounded-xl hover:opacity-90 active:scale-95 transition-all"
          >
            Launch App
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto py-16 space-y-8">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-widest leading-none">
          <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse"></span>
          Step 1: Project Initialization Complete
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
            The Ultra-Fast <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500 bg-clip-text text-transparent">
              Restaurant Point of Sale
            </span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Tipsy POS is a production-ready starter boilerplate designed for high-stress food workflows with real-time sync, printer routing, and a mobile-first waiter setup.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center max-w-xs sm:max-w-none">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold shadow-lg shadow-zinc-900/10 dark:shadow-white/5 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Enter Login Screen
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12 border-t border-zinc-200/50 dark:border-zinc-900/50 text-left">
          
          <div className="p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/35 space-y-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Grid className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Captain Terminal</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Mobile-first responsive ordering workflow with tables grids, rapid tap menu selectors, and running KOT managers.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/35 space-y-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Admin Control Room</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Collapsible desktop sidebar controls with analytics dashboards, printer management panels, and staff profile trackers.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/35 space-y-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Supabase SSR Ready</h3>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Pre-configured cookie refresh middleware, client helper hooks, and auth state subscription listeners ready for step 2.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-zinc-200/50 dark:border-zinc-900/50 flex items-center justify-center px-6">
        <p className="text-[10px] text-muted-foreground font-semibold">© 2026 Tipsy POS. Powered by Next.js & Supabase.</p>
      </footer>

    </div>
  )
}

