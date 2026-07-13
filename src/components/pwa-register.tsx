'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          console.log('PWA: Service Worker registered successfully with scope:', registration.scope)
        } catch (error) {
          console.error('PWA: Service Worker registration failed:', error)
        }
      }

      // Register SW on load to optimize initial page loading performance
      if (document.readyState === 'complete') {
        registerSW()
      } else {
        window.addEventListener('load', registerSW)
        return () => window.removeEventListener('load', registerSW)
      }
    }
  }, [])

  return null
}
