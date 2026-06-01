'use client'

import React from 'react'

export default function OrdersPage() {
  const mockOrders = [
    { id: '108', table: 3, items: 4, total: 54.20, status: 'Preparing', time: '12m ago' },
    { id: '109', table: 7, items: 2, total: 24.50, status: 'Ready', time: '5m ago' },
    { id: '107', table: 1, items: 5, total: 89.90, status: 'Served', time: '25m ago' },
  ]

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Active Orders</h2>
        <p className="text-xs text-muted-foreground">Monitor running orders and preparation statuses</p>
      </div>

      <div className="space-y-3">
        {mockOrders.map((order) => {
          const statusStyles = {
            'Preparing': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            'Ready': 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 animate-pulse',
            'Served': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 border-transparent',
          }[order.status as 'Preparing' | 'Ready' | 'Served']

          return (
            <div
              key={order.id}
              className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-950 bg-background/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 font-extrabold text-lg text-foreground">
                  T{order.table}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Order #{order.id}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{order.items} Items • {order.time}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-extrabold tracking-tight">${order.total.toFixed(2)}</span>
                <div className="mt-1">
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${statusStyles}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
