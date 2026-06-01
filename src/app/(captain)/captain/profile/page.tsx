'use client'

import React from 'react'
import { useAuth } from '@/providers/auth-provider'
import { Shield, Warehouse, RefreshCw, Printer } from 'lucide-react'

export default function ProfilePage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Staff Terminal</h2>
        <p className="text-xs text-muted-foreground">Manage profile, terminal settings and print checks</p>
      </div>

      <div className="space-y-4">
        {/* Profile Card */}
        <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-950 bg-background/50 space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 font-extrabold text-lg text-white">
              {profile?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{profile?.name || 'Staff User'}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{profile?.email || 'staff@tipsypos.com'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 border-t border-zinc-100 dark:border-zinc-900 pt-3">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold uppercase tracking-wider">{profile?.role || 'captain'}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Warehouse className="w-3.5 h-3.5 text-amber-500" />
              <span className="truncate">{profile?.restaurant_id || 'Outlet #1'}</span>
            </div>
          </div>
        </div>

        {/* Terminal Utilities */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Utilities</h3>
          
          <button className="flex w-full items-center justify-between p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-900 bg-background/30 text-left active:scale-[0.99] transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <Printer className="w-4 h-4 text-muted-foreground" />
              <div>
                <h4 className="text-xs font-bold">Local Printer Test</h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">Send diagnostic receipt to LAN Billing Printer</p>
              </div>
            </div>
          </button>

          <button className="flex w-full items-center justify-between p-3.5 rounded-xl border border-zinc-200/50 dark:border-zinc-900 bg-background/30 text-left active:scale-[0.99] transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <div>
                <h4 className="text-xs font-bold">Sync Database Cache</h4>
                <p className="text-[9px] text-muted-foreground mt-0.5">Force reload active tables and menu indexes</p>
              </div>
            </div>
          </button>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={signOut}
          className="w-full py-3.5 rounded-xl border border-red-200/60 text-red-500 font-bold text-xs bg-red-500/5 active:scale-[0.99] transition-all hover:bg-red-500/10 dark:border-red-950/40 dark:bg-red-950/5 dark:hover:bg-red-950/20 text-center"
        >
          Logout Terminal Session
        </button>
      </div>
    </div>
  )
}
