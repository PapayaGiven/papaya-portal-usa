'use client'

import { useState } from 'react'
import { CreatorLevel } from '@/lib/types'
import { hasCreativeBank } from '@/lib/levelAccess'
import CreativeBank from '@/components/CreativeBank'
import MyVideosLog, { type StrategyProductForLog } from '@/components/MyVideosLog'
import type { VideoLogRow } from '@/app/strategy/actions'

interface StrategyTabsProps {
  level: CreatorLevel
  productsContent: React.ReactNode
  videoLogProducts: StrategyProductForLog[]
  videoLogWeekStart: string
  videoLogVideos: VideoLogRow[]
  creativeProducts: {
    id: string
    productName: string
    hooks: string[]
    scripts: string | null
    trends: string | null
  }[]
}

export default function StrategyTabs({
  level,
  productsContent,
  videoLogProducts,
  videoLogWeekStart,
  videoLogVideos,
  creativeProducts,
}: StrategyTabsProps) {
  const [activeTab, setActiveTab] = useState<'productos' | 'videos' | 'banco'>('productos')
  const showCreativeBank = hasCreativeBank(level)

  const tabs = [
    { id: 'productos' as const, label: 'Productos' },
    { id: 'videos' as const, label: 'Mis videos' },
    { id: 'banco' as const, label: 'Banco creativo' },
  ]

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 rounded-lg font-dm-sans text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-brand-black shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'banco' && !showCreativeBank && ' 🔒'}
          </button>
        ))}
      </div>

      {activeTab === 'productos' && <div>{productsContent}</div>}

      {activeTab === 'videos' && (
        <MyVideosLog
          strategyProducts={videoLogProducts}
          initialWeekStart={videoLogWeekStart}
          initialVideos={videoLogVideos}
        />
      )}

      {activeTab === 'banco' && (
        showCreativeBank ? (
          <CreativeBank products={creativeProducts} />
        ) : (
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 backdrop-blur-sm bg-white/60 z-10 flex flex-col items-center justify-center">
              <p className="text-4xl mb-3">🔒</p>
              <h2 className="font-playfair text-2xl text-brand-black mb-2">Banco creativo</h2>
              <p className="font-dm-sans text-gray-500 text-sm">Se desbloquea en Growth 🔒</p>
            </div>
            <div className="opacity-30 space-y-4">
              <div className="h-8 bg-gray-200 rounded-lg w-3/4 mx-auto" />
              <div className="h-6 bg-gray-200 rounded-lg w-1/2 mx-auto" />
              <div className="h-20 bg-gray-200 rounded-lg w-full" />
              <div className="h-20 bg-gray-200 rounded-lg w-full" />
            </div>
          </div>
        )
      )}
    </div>
  )
}
