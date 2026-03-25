'use client'

import { useEffect, useState } from 'react'
import { Campaign } from '@/lib/types'

interface CampaignCardProps {
  campaign: Campaign
}

function getTimeRemaining(deadline: string | null): string {
  if (!deadline) return ''
  const now = Date.now()
  const end = new Date(deadline).getTime()
  const diff = end - now

  if (diff <= 0) return 'Abgelaufen'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const days = Math.floor(hours / 24)

  if (days >= 1) {
    return `${days} Tag${days !== 1 ? 'e' : ''} ${hours % 24}h`
  }
  return `${hours}h ${minutes}m`
}

const LEVEL_COLORS: Record<string, string> = {
  Initiation: 'bg-gray-100 text-gray-600',
  Rising: 'bg-pink-100 text-pink-700',
  Pro: 'bg-emerald-100 text-emerald-700',
  Elite: 'bg-amber-100 text-amber-700',
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(campaign.deadline))

  useEffect(() => {
    if (!campaign.deadline) return
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(campaign.deadline))
    }, 30000)
    return () => clearInterval(interval)
  }, [campaign.deadline])

  const isUrgent =
    campaign.deadline &&
    new Date(campaign.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow flex flex-col gap-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-playfair text-xl text-brand-black leading-tight">
            {campaign.brand_name}
          </h3>
          {campaign.description && (
            <p className="font-dm-sans text-sm text-gray-500 mt-1 line-clamp-2">
              {campaign.description}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <span className="font-dm-sans font-bold text-2xl text-brand-pink">
            {campaign.commission_rate}%
          </span>
          <p className="font-dm-sans text-xs text-gray-400">Provision</p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Min level */}
        <span
          className={`font-dm-sans text-xs font-medium px-2.5 py-1 rounded-full ${
            LEVEL_COLORS[campaign.min_level] || 'bg-gray-100 text-gray-600'
          }`}
        >
          ab {campaign.min_level}
        </span>

        {/* Spots left */}
        {campaign.spots_left !== null && (
          <span
            className={`font-dm-sans text-xs font-medium px-2.5 py-1 rounded-full ${
              campaign.spots_left <= 3
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {campaign.spots_left <= 3
              ? `⚠️ Nur ${campaign.spots_left} Plätze übrig!`
              : `${campaign.spots_left} Plätze verfügbar`}
          </span>
        )}

        {/* Deadline */}
        {timeLeft && (
          <span
            className={`font-dm-sans text-xs font-medium px-2.5 py-1 rounded-full ${
              isUrgent
                ? 'bg-rose-100 text-rose-700 font-semibold'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {isUrgent ? '⚡ ' : ''}⏱ {timeLeft}
          </span>
        )}
      </div>

      {/* CTA */}
      <button
        className="mt-auto w-full py-2.5 rounded-xl font-dm-sans font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ backgroundColor: '#1B5E3B' }}
      >
        Bewerben →
      </button>
    </div>
  )
}
