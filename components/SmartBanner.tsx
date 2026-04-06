'use client'

import { useState } from 'react'

interface BannerData {
  type: 'urgent' | 'tasks' | 'products' | 'gmv'
  title: string
  message: string
}

interface SmartBannerProps {
  banner: BannerData | null
}

const BANNER_STYLES = {
  urgent: {
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-800',
    icon: '⚡',
    close: 'text-rose-400 hover:text-rose-600',
  },
  tasks: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    icon: '📋',
    close: 'text-amber-400 hover:text-amber-600',
  },
  products: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-800',
    icon: '💎',
    close: 'text-emerald-400 hover:text-emerald-600',
  },
  gmv: {
    bg: 'bg-pink-50 border-pink-200',
    text: 'text-pink-800',
    icon: '🎯',
    close: 'text-pink-400 hover:text-pink-600',
  },
}

export default function SmartBanner({ banner }: SmartBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (!banner || dismissed) return null

  const styles = BANNER_STYLES[banner.type]

  return (
    <div
      className={`w-full border rounded-xl px-4 py-3 flex items-start gap-3 ${styles.bg} border-opacity-60`}
    >
      <span className="text-lg shrink-0 mt-0.5">{styles.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-dm-sans font-semibold text-sm ${styles.text}`}>
          {banner.title}
        </p>
        <p className={`font-dm-sans text-sm mt-0.5 opacity-80 ${styles.text}`}>
          {banner.message}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className={`shrink-0 mt-0.5 transition-colors ${styles.close}`}
        aria-label="Cerrar banner"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  )
}
