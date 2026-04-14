'use client'

import { useState } from 'react'
import { CreatorLevel } from '@/lib/types'
import { hasCreativeBank } from '@/lib/levelAccess'
import ContentCalendar from '@/components/ContentCalendar'
import CreativeBank from '@/components/CreativeBank'

interface StrategyTabsProps {
  level: CreatorLevel
  productsContent: React.ReactNode
  creatorId: string
  weeklyChecklist: { date: string; completed: boolean; videos_done?: number }[]
  levelConfigVideosPerDay: number
  creativeProducts: {
    id: string
    productName: string
    hooks: string[]
    scripts: string | null
    trends: string | null
  }[]
}

export default function StrategyTabs({ level, productsContent, creatorId, weeklyChecklist, levelConfigVideosPerDay, creativeProducts }: StrategyTabsProps) {
  const [activeTab, setActiveTab] = useState<'productos' | 'calendario' | 'banco'>('productos')
  const showCreativeBank = hasCreativeBank(level)

  const tabs = [
    { id: 'productos' as const, label: 'Productos' },
    { id: 'calendario' as const, label: 'Calendario de contenido' },
    { id: 'banco' as const, label: 'Banco creativo' },
  ]

  return (
    <div>
      {/* Tab navigation */}
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

      {/* Tab content */}
      {activeTab === 'productos' && (
        <div>{productsContent}</div>
      )}

      {activeTab === 'calendario' && (
        <ContentCalendar
          creatorId={creatorId}
          weeklyChecklist={weeklyChecklist}
          videosPerDay={levelConfigVideosPerDay}
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
