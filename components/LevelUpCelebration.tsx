'use client'

import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { CreatorLevel } from '@/lib/types'
import { LEVEL_ORDER } from '@/lib/levelAccess'

interface LevelUpCelebrationProps {
  creatorId: string
  currentLevel: CreatorLevel
}

export default function LevelUpCelebration({ creatorId, currentLevel }: LevelUpCelebrationProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const storageKey = `lastSeenLevel_${creatorId}`
    const lastSeen = localStorage.getItem(storageKey) as CreatorLevel | null

    if (lastSeen && lastSeen !== currentLevel) {
      const lastIdx = LEVEL_ORDER.indexOf(lastSeen)
      const currIdx = LEVEL_ORDER.indexOf(currentLevel)
      if (currIdx > lastIdx) {
        setShow(true)
        // Fire confetti
        const end = Date.now() + 3000
        const colors = ['#F4A7C3', '#1B5E3B', '#F59E0B', '#ffffff']
        const frame = () => {
          confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors })
          confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
          if (Date.now() < end) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }
    }

    // Always update stored level to current
    localStorage.setItem(storageKey, currentLevel)
  }, [creatorId, currentLevel])

  if (!show) return null

  const config = LEVEL_CONFIG_DISPLAY[currentLevel]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl border border-brand-pink/20 shadow-2xl p-10 max-w-sm w-full text-center">
        <div className="text-6xl mb-4">{config.emoji}</div>
        <h2 className="font-playfair text-3xl text-brand-black mb-2">¡Subiste de nivel!</h2>
        <p className="font-dm-sans text-gray-500 text-sm mb-4">
          Has alcanzado
        </p>
        <span
          className="inline-block font-dm-sans font-bold text-lg px-5 py-2 rounded-full text-white mb-6"
          style={{ backgroundColor: config.color }}
        >
          {currentLevel}
        </span>
        <p className="font-dm-sans text-sm text-gray-600 mb-6">{config.message}</p>
        <button
          onClick={() => setShow(false)}
          className="w-full py-3 rounded-xl font-dm-sans font-semibold text-sm text-white transition hover:opacity-90"
          style={{ backgroundColor: '#1B5E3B' }}
        >
          ¡Vamos! →
        </button>
      </div>
    </div>
  )
}

const LEVEL_CONFIG_DISPLAY: Record<CreatorLevel, { emoji: string; color: string; message: string }> = {
  Initiation: { emoji: '��', color: '#9CA3AF', message: '¡Bienvenida a Papaya Social Club! Tu camino comienza aquí.' },
  Foundation: { emoji: '🌸', color: '#F4A7C3', message: '¡Desbloqueaste campañas, el ranking y beneficios exclusivos!' },
  Growth: { emoji: '💚', color: '#1B5E3B', message: '¡Estás en Growth! Llamadas de estrategia, sesiones de fotos y más te esperan.' },
  Scale: { emoji: '🚀', color: '#8B5CF6', message: '¡Nivel Scale alcanzado! Es hora de escalar tu negocio con herramientas avanzadas y soporte dedicado.' },
  Elite: { emoji: '👑', color: '#F59E0B', message: '¡Llegaste al nivel más alto! Partnership con la agencia y bonos trimestrales de $500.' },
}
