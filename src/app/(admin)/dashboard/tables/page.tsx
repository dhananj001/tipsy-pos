'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function DeprecatedAdminTablesPage() {
  const router = useRouter()

  useEffect(() => {
    // Permanent redirect to single unified floor dashboard
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
          Redirecting to Restaurant Floor...
        </p>
      </div>
    </div>
  )
}
