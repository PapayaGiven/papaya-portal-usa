'use client'

import { useState, useTransition } from 'react'
import { toggleCalendarDay } from '@/app/strategy/actions'

interface ContentCalendarProps {
  creatorId: string
  weeklyChecklist: { date: string; completed: boolean }[]
  videosPerDay: number
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getWeekDates(): string[] {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

export default function ContentCalendar({ creatorId, weeklyChecklist, videosPerDay }: ContentCalendarProps) {
  const weekDates = getWeekDates()
  const [checklist, setChecklist] = useState(weeklyChecklist)
  const [isPending, startTransition] = useTransition()

  const completedDays = checklist.filter((d) => d.completed).length

  function isCompleted(date: string): boolean {
    return checklist.find((c) => c.date === date)?.completed ?? false
  }

  function toggleDay(date: string) {
    const current = isCompleted(date)
    const newValue = !current
    setChecklist((prev) => {
      const existing = prev.find((c) => c.date === date)
      if (existing) return prev.map((c) => c.date === date ? { ...c, completed: newValue } : c)
      return [...prev, { date, completed: newValue }]
    })
    startTransition(async () => {
      await toggleCalendarDay(creatorId, date, newValue)
    })
  }

  return (
    <div className="space-y-6">
      {/* Weekly progress */}
      <div className="bg-white rounded-2xl border border-brand-pink/20 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-dm-sans font-semibold text-sm text-brand-black">Progreso semanal</h3>
          <span className="font-dm-sans text-sm font-bold text-brand-green">{completedDays}/7 días completados</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full bg-brand-green transition-all duration-500"
            style={{ width: `${(completedDays / 7) * 100}%` }}
          />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-3">
        {weekDates.map((date, i) => {
          const completed = isCompleted(date)
          const isToday = date === new Date().toISOString().split('T')[0]
          const dayNum = new Date(date + 'T12:00:00').getDate()

          return (
            <button
              key={date}
              disabled={isPending}
              onClick={() => toggleDay(date)}
              className={`rounded-2xl border p-4 flex flex-col items-center gap-2 transition-all ${
                completed
                  ? 'bg-brand-green/10 border-brand-green/30'
                  : isToday
                  ? 'bg-brand-pink/5 border-brand-pink/30'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <span className="font-dm-sans text-xs font-semibold text-gray-400 uppercase">{DAY_NAMES[i]}</span>
              <span className={`font-playfair text-lg font-bold ${isToday ? 'text-brand-pink' : 'text-brand-black'}`}>
                {dayNum}
              </span>
              <span className="font-dm-sans text-xs text-gray-400">{videosPerDay} videos</span>
              {completed ? (
                <span className="w-6 h-6 rounded-full bg-brand-green flex items-center justify-center text-white text-xs">✓</span>
              ) : (
                <span className="w-6 h-6 rounded-full border-2 border-gray-200" />
              )}
            </button>
          )
        })}
      </div>

      <p className="font-dm-sans text-xs text-gray-400 text-center">
        Toca cada día para marcarlo como completado cuando publiques todos tus videos.
      </p>
    </div>
  )
}
