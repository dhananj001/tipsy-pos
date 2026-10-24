import React from 'react'
import Image from 'next/image'

interface TipsyLogoProps {
  size?: number | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  priority?: boolean
}

const sizeMap = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
}

export function TipsyLogo({ size = 'md', className = '', priority = false }: TipsyLogoProps) {
  const pixelSize = typeof size === 'number' ? size : sizeMap[size] || 36

  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-tr from-amber-500/15 to-orange-500/15 border border-amber-500/20 p-0.5 shadow-sm overflow-hidden ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <Image
        src="/logo.png"
        alt="Tipsy POS"
        width={pixelSize * 2}
        height={pixelSize * 2}
        className="w-full h-full object-contain drop-shadow-sm"
        priority={priority}
      />
    </div>
  )
}
