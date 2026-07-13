'use client'

import { useEffect, useState } from 'react'
import { X, Download, Share } from 'lucide-react'

export function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // 1. Register or Unregister Service Worker based on environment
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        const registerSW = async () => {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js')
            console.log('PWA: Service Worker registered successfully with scope:', registration.scope)
          } catch (error) {
            console.error('PWA: Service Worker registration failed:', error)
          }
        }

        if (document.readyState === 'complete') {
          registerSW()
        } else {
          window.addEventListener('load', registerSW)
        }
      } else {
        // Dev Mode: Unregister active service workers to prevent cached stale assets
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister()
            console.log('PWA: Service Worker unregistered for development mode')
          }
        })
      }
    }

    // 2. Check if already running in PWA standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
        || (navigator as any).standalone 
        || document.referrer.includes('android-app://')
      setIsStandalone(isStandaloneMode)
      
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
      setIsIOS(isIOSDevice)
    }
    checkStandalone()

    // 3. Listen to beforeinstallprompt (Android / Chrome Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      // Save the event so it can be triggered later.
      setDeferredPrompt(e)
      
      // Check if user dismissed it in localStorage
      const isDismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true'
      if (!isDismissed) {
        setShowBanner(true)
      }
    }

    // For iOS, if they haven't dismissed it and are not standalone, show the custom Safari helper banner after a short delay
    const showIOSPromptIfNeeded = () => {
      const isDismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true'
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
      
      if (isIOSDevice && !isStandaloneMode && !isDismissed) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // Check iOS prompt after a short 3-second delay so it is less intrusive
    const timer = setTimeout(showIOSPromptIfNeeded, 3000)

    // 4. Listen to successful installation
    const handleAppInstalled = () => {
      console.log('PWA: Tipsy POS installed successfully!')
      setShowBanner(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      clearTimeout(timer)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    
    // Show the native browser install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    console.log(`PWA: User response to install prompt: ${outcome}`)
    
    // Reset deferred prompt
    setDeferredPrompt(null)
    setShowBanner(false)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    // Mark as dismissed in localStorage so we don't annoy the user on subsequent page loads
    localStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  // Render nothing if standalone or banner is hidden
  if (isStandalone || !showBanner) {
    return null
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md p-4 rounded-3xl bg-zinc-900/95 dark:bg-black/90 text-white border border-zinc-800/80 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="flex items-start gap-3">
        {/* Brand Icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 font-extrabold text-white text-lg shadow-md shadow-amber-500/20">
          T
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <h4 className="text-sm font-bold tracking-tight text-white">Install Tipsy POS</h4>
          <p className="text-[11px] text-zinc-400 leading-normal">
            {isIOS 
              ? 'Add Tipsy POS to your home screen for a fast, full-screen app experience on iOS.' 
              : 'Add to your home screen for rapid ordering, offline support, and full-screen view.'}
          </p>
          
          {/* iOS instruction helper */}
          {isIOS && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-medium pt-1">
              <Share className="w-3.5 h-3.5 shrink-0" />
              <span>Tap Share in Safari then <b>"Add to Home Screen"</b></span>
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button 
          onClick={handleDismiss}
          className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons (Only for Android/Desktop where triggerable) */}
      {!isIOS && deferredPrompt && (
        <div className="flex justify-end gap-2.5 mt-3 pt-2.5 border-t border-zinc-800/50">
          <button 
            onClick={handleDismiss}
            className="px-3.5 py-1.5 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Not Now
          </button>
          <button 
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[11px] font-black hover:opacity-90 active:scale-[0.98] transition-all shadow-md shadow-amber-500/10"
          >
            <Download className="w-3.5 h-3.5" />
            Install App
          </button>
        </div>
      )}
    </div>
  )
}
