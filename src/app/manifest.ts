import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tipsy POS',
    short_name: 'Tipsy',
    description: 'High-performance, minimal and ultra-fast restaurant POS with real-time operations.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090b', // Zinc-950 dark mode background
    theme_color: '#09090b',      // Zinc-950 dark mode header
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
