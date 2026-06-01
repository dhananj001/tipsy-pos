'use client'

import React from 'react'
import {
  Users,
  Grid,
  ClipboardList,
  DollarSign
} from 'lucide-react'

export default function AdminDashboardPage() {
  const cards = [
    { title: 'Total Sales', value: '$2,450.80', desc: '+15.2% from yesterday', icon: DollarSign, color: 'text-emerald-500 bg-emerald-500/10' },
    { title: 'Active Tables', value: '8 / 12', desc: '66% Occupancy Rate', icon: Grid, color: 'text-blue-500 bg-blue-500/10' },
    { title: 'Live Orders', value: '3 Running', desc: 'Average prep time: 14m', icon: ClipboardList, color: 'text-amber-500 bg-amber-500/10' },
    { title: 'Active Staff', value: '4 Captains', desc: '2 Managers logged in', icon: Users, color: 'text-indigo-500 bg-indigo-500/10' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Management Overview</h1>
        <p className="text-xs text-muted-foreground">Real-time summaries of restaurant sales and service operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/50 flex items-center justify-between shadow-sm"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{card.title}</span>
                <h3 className="text-2xl font-black tracking-tight text-foreground">{card.value}</h3>
                <p className="text-[10px] text-muted-foreground">{card.desc}</p>
              </div>
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${card.color}`}>
                <Icon className="h-5 w-5 shrink-0" />
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Grid: Live Feed & Quick Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Recent Billing Activity</h3>
              <p className="text-[10px] text-muted-foreground">Latest receipts closed through the checkout counter</p>
            </div>
            <button className="text-[10px] font-bold text-amber-600 hover:underline">View All Sales</button>
          </div>
          
          <div className="space-y-3.5">
            {[
              { id: 'TX-2089', table: 4, method: 'UPI', amount: 78.40, time: '3m ago' },
              { id: 'TX-2088', table: 9, method: 'Cash', amount: 142.00, time: '11m ago' },
              { id: 'TX-2087', table: 2, method: 'Card', amount: 35.50, time: '20m ago' },
            ].map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-zinc-150 dark:border-zinc-900 last:border-0 text-xs">
                <div>
                  <p className="font-bold text-foreground">Table #{tx.table} Closed</p>
                  <p className="text-[10px] text-muted-foreground">{tx.id} • {tx.method}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-foreground">${tx.amount.toFixed(2)}</p>
                  <p className="text-[9px] text-muted-foreground">{tx.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-200/60 dark:border-zinc-900 bg-background/50 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Today's Hot Sellers</h3>
            <p className="text-[10px] text-muted-foreground">Most popular menu dishes ordered by quantity</p>
          </div>

          <div className="space-y-4">
            {[
              { name: 'Spicy Bourbon Chicken Wings', qty: 34, cat: 'Appetizers' },
              { name: 'Truffle Mushroom Cream Pasta', qty: 28, cat: 'Mains' },
              { name: 'Classic Old Fashioned Cocktail', qty: 24, cat: 'Beverages' },
            ].map((dish, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 font-bold text-xs text-amber-600">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold truncate text-foreground">{dish.name}</h4>
                  <p className="text-[9px] text-muted-foreground">{dish.cat}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-foreground">{dish.qty}</span>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-widest font-bold">Qty</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
