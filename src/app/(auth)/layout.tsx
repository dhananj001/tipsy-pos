'use client'

import React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
