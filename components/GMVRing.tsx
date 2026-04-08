'use client'

import { useEffect, useState } from 'react'
import { CreatorLevel, LEVEL_BADGE_COLORS } from '@/lib/types'

interface GMVRingProps {
  gmv: number
  target: number
  level: string
  nextLevel: string | null
}

export default function GMVRing({ gmv, target, level, nextLevel }: GMVRingProps) {
  const [animated, setAnimated] = useState(false)

  const radius = 70
  const circumference = 2 * Math.PI * radius
  const progress = target > 0 ? Math.min(gmv / target, 1) : 1
  const offset = animated ? circumference - progress * circumference : circumference

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const remaining = target - gmv

  function formatUsd(val: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <h3 className="font-dm-sans font-semibold text-gray-500 text-xs uppercase tracking-wider">
          Tu GMV
        </h3>
        <span className="font-dm-sans text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
          {level}
        </span>
      </div>

      {/* SVG Ring */}
      <div className="relative" style={{ width: 180, height: 180 }}>
        <svg width="180" height="180" className="rotate-[-90deg]">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="12" />
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={LEVEL_BADGE_COLORS[level as CreatorLevel]?.text ?? '#F4A7C3'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-dm-sans font-bold text-2xl text-brand-black leading-none">
            {formatUsd(gmv)}
          </span>
          <span className="font-dm-sans text-xs text-gray-400 mt-1">
            de {formatUsd(target)}
          </span>
        </div>
      </div>

      <div className="text-center">
        {nextLevel ? (
          <p className="font-dm-sans text-sm text-gray-600">
            <span className="font-semibold text-brand-green">
              {formatUsd(Math.max(remaining, 0))}
            </span>{' '}
            más para llegar a{' '}
            <span className="font-semibold">{nextLevel}</span>
          </p>
        ) : (
          <p className="font-dm-sans text-sm text-amber-600 font-semibold">
            🏆 ¡Nivel máximo alcanzado!
          </p>
        )}

        <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full bg-brand-pink transition-all duration-1000"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 font-dm-sans mt-1">
          {Math.round(progress * 100)}% al siguiente nivel
        </p>
      </div>
    </div>
  )
}
