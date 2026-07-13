'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Grid, ClipboardList, User, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/providers/theme-provider'

export default function CaptainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, signOut, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (profile) {
        if (profile.role !== 'captain' && profile.role !== 'admin' && profile.role !== 'manager') {
          router.push('/dashboard')
        }
      }
    }
  }, [loading, user, profile, router])

  if (loading || !user || !profile || (profile.role !== 'captain' && profile.role !== 'admin' && profile.role !== 'manager')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Loading Captain Terminal...</p>
        </div>
      </div>
    )
  }

  const navItems = [
    { label: 'Tables', href: '/captain/tables', icon: Grid },
    { label: 'Bills', href: '/captain/orders', icon: ClipboardList },
    { label: 'Profile', href: '/captain/profile', icon: User },
  ]

  return (
    <div className="flex h-[100dvh] w-full justify-center bg-background md:bg-zinc-50 md:dark:bg-zinc-950 overflow-hidden">
      {/* Mobile Frame Container (Constrained width on desktop, full screen on mobile) */}
      <div className="relative flex h-full w-full max-w-md flex-col md:border-x md:border-zinc-200/80 bg-background md:shadow-2xl md:dark:border-zinc-900/80 overflow-hidden [transform:translateZ(0)]">
        
        {/* Sleek Top Header */}
        <header className="flex h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] shrink-0 items-center justify-between border-b border-zinc-100 bg-background/85 px-4 backdrop-blur-md dark:border-zinc-900">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 font-bold text-white shadow-md shadow-amber-500/20">
              T
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">Tipsy POS</h1>
              <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">Captain Terminal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Minimalist Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/80 text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            
            {/* Quick Logout */}
            <button
              onClick={signOut}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200/60 text-red-500 transition-colors hover:bg-red-50 dark:border-red-950/40 dark:hover:bg-red-950/20"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Dynamic Main Body Scroll Area */}
        <main className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {children}
        </main>

        {/* Floating Bottom Touch Bar Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 z-50 flex h-[calc(5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] items-center justify-around border-t border-zinc-100 bg-background/95 px-6 pt-2 shadow-lg backdrop-blur-md dark:border-zinc-900">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isActive
                    ? 'text-foreground font-semibold scale-105'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div
                  className={`flex h-9 w-12 items-center justify-center rounded-xl transition-all ${
                    isActive
                      ? 'bg-zinc-900/5 dark:bg-zinc-100/5 text-amber-500'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[9px] tracking-wide font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
