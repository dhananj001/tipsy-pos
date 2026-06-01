'use client'

import React from 'react'

export default function TablesPage() {
  // Scaffolding mock tables for UI presentation
  const mockTables = Array.from({ length: 12 }, (_, i) => ({
    id: `table-${i + 1}`,
    number: i + 1,
    capacity: [2, 4, 6, 8][i % 4],
    status: ['available', 'occupied', 'billing'][i % 3],
    currentOrderTotal: [0, 42.50, 125.00][i % 3],
  }))

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Tables Grid</h2>
          <p className="text-xs text-muted-foreground">Select a table to take order or manage</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
          Live Sync
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-3 gap-3">
        {mockTables.map((table) => {
          const statusColors = {
            available: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/15',
            occupied: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15',
            billing: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/15',
          }[table.status as 'available' | 'occupied' | 'billing']

          const statusBadge = {
            available: 'bg-green-500',
            occupied: 'bg-amber-500',
            billing: 'bg-blue-500',
          }[table.status as 'available' | 'occupied' | 'billing']

          return (
            <button
              key={table.id}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 text-center ${statusColors} h-28 relative overflow-hidden`}
            >
              {/* Status Indicator */}
              <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${statusBadge}`}></span>
              
              <span className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase opacity-85">Table</span>
              <span className="text-2xl font-extrabold tracking-tight">{table.number}</span>
              <span className="text-[9px] font-semibold opacity-75 mt-0.5">{table.capacity} Pax</span>
              
              {table.currentOrderTotal > 0 && (
                <span className="absolute bottom-2 text-[9px] font-extrabold tracking-tight px-1.5 py-0.5 rounded-md bg-zinc-950/5 dark:bg-white/5">
                  ${table.currentOrderTotal.toFixed(2)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
