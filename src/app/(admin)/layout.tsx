'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Grid,
  Utensils,
  ClipboardList,
  Printer,
  Users,
  TrendingUp,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, signOut, loading } = useAuth()
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (profile) {
        if (profile.role !== 'admin' && profile.role !== 'manager') {
          router.push('/captain/tables')
        }
      }
    }
  }, [loading, user, profile, router])

  if (loading || !user || !profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground text-xs font-semibold animate-pulse">Loading Admin Control Room...</p>
        </div>
      </div>
    )
  }

  const menuItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Table Layout', href: '/dashboard/tables', icon: Grid },
    { label: 'Menu Editor', href: '/dashboard/menu', icon: Utensils },
    { label: 'Live Orders', href: '/dashboard/orders', icon: ClipboardList },
    { label: 'Printers', href: '/dashboard/printers', icon: Printer },
    { label: 'Staff Management', href: '/dashboard/staff', icon: Users },
    { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
  ]

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      
      {/* 1. Mobile Drawer Navigation Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 2. Sidebar Navigation (Shared between Desktop permanent & Mobile drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-200/80 bg-background transition-all duration-300 dark:border-zinc-900/80 lg:static lg:z-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Sidebar Header Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-100 px-4 dark:border-zinc-900">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 font-extrabold text-white shadow-md shadow-amber-500/20">
              T
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-foreground leading-none">Tipsy POS</span>
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">Control Center</span>
              </div>
            )}
          </div>
          
          {/* Mobile Drawer Close Button */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 lg:hidden dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                    : 'text-zinc-650 hover:text-foreground hover:bg-zinc-100/70 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-900/50'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer User Info & Collapser */}
        <div className="border-t border-zinc-100 p-3 space-y-3 dark:border-zinc-900">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-150 dark:bg-zinc-900 font-extrabold text-sm text-foreground">
                {profile?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate leading-none">{profile?.name || 'Administrator'}</span>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase mt-0.5 tracking-wider">{profile?.role || 'admin'}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {/* Sidebar toggle for desktop */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden h-9 w-9 items-center justify-center rounded-lg border border-zinc-200/80 text-zinc-500 hover:bg-zinc-50 lg:flex dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Logout Button */}
            <button
              onClick={signOut}
              className={`flex h-9 items-center justify-center rounded-lg border border-red-200/60 text-red-500 transition-colors hover:bg-red-50 dark:border-red-950/40 dark:hover:bg-red-950/20 ${
                sidebarCollapsed ? 'w-9' : 'flex-1 gap-2 text-xs font-bold'
              }`}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* 3. Main Workspace Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Sleek Top Header Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-background px-4 dark:border-zinc-900/80">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 lg:hidden dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <span className="text-xs font-bold text-muted-foreground hidden sm:inline">Outlet Terminal #1</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Premium Theme Switcher */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200/80 text-zinc-650 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
            </button>
            
            <div className="h-5 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1"></div>
            
            <span className="text-[10px] font-extrabold tracking-widest text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase flex items-center gap-1.5 leading-none">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Live Server Connected
            </span>
          </div>
        </header>

        {/* Dynamic Workspace Scroll Container */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-zinc-50 dark:bg-zinc-950/20">
          {children}
        </main>
      </div>
    </div>
  )
}
