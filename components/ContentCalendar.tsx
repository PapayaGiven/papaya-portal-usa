'use client'

import { useState, useTransition } from 'react'
import { toggleCalendarDay } from '@/app/strategy/actions'

interface ContentCalendarProps {
  creatorId: string
  weeklyChecklist: { date: string; completed: boolean; videos_done?: number }[]
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

  function getVideosDone(date: string): number {
    const entry = checklist.find((c) => c.date === date)
    return entry?.videos_done ?? (entry?.completed ? videosPerDay : 0)
  }

  const totalVideosDone = weekDates.reduce((sum, d) => sum + getVideosDone(d), 0)
  const totalVideosTarget = videosPerDay * 7

  function toggleVideo(date: string, videoIndex: number) {
    const currentDone = getVideosDone(date)
    // If clicking a checkbox at or below currentDone, we're unchecking (set to videoIndex)
    // If clicking above currentDone, we're checking (set to videoIndex + 1)
    const newDone = videoIndex < currentDone ? videoIndex : videoIndex + 1
    const newCompleted = newDone >= videosPerDay

    setChecklist((prev) => {
      const existing = prev.find((c) => c.date === date)
      if (existing) return prev.map((c) => c.date === date ? { ...c, completed: newCompleted, videos_done: newDone } : c)
      return [...prev, { date, completed: newCompleted, videos_done: newDone }]
    })

    startTransition(async () => {
      await toggleCalendarDay(creatorId, date, newCompleted, newDone)
    })
  }

  return (
    <div className="space-y-6">
      {/* Weekly progress */}
      <div className="bg-white rounded-2xl border border-brand-pink/20 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-dm-sans font-semibold text-sm text-brand-black">Progreso semanal</h3>
          <span className="font-dm-sans text-sm font-bold text-brand-green">{totalVideosDone}/{totalVideosTarget} videos</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full bg-brand-green transition-all duration-500"
            style={{ width: `${totalVideosTarget > 0 ? (totalVideosDone / totalVideosTarget) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-3">
        {weekDates.map((date, i) => {
          const videosDone = getVideosDone(date)
          const allDone = videosDone >= videosPerDay
          const isToday = date === new Date().toISOString().split('T')[0]
          const dayNum = new Date(date + 'T12:00:00').getDate()

          return (
            <div
              key={date}
              className={`rounded-2xl border p-4 flex flex-col items-center gap-2 transition-all ${
                allDone
                  ? 'bg-brand-green/10 border-brand-green/30'
                  : isToday
                  ? 'bg-brand-pink/5 border-brand-pink/30'
                  : 'bg-white border-gray-100'
              }`}
            >
              <span className="font-dm-sans text-xs font-semibold text-gray-400 uppercase">{DAY_NAMES[i]}</span>
              <span className={`font-playfair text-lg font-bold ${isToday ? 'text-brand-pink' : 'text-brand-black'}`}>
                {dayNum}
              </span>
              <div className="flex flex-col gap-1.5 mt-1">
                {Array.from({ length: videosPerDay }, (_, vi) => {
                  const checked = vi < videosDone
                  return (
                    <button
                      key={vi}
                      disabled={isPending}
                      onClick={() => toggleVideo(date, vi)}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                        checked
                          ? 'bg-brand-green border-brand-green text-white'
                          : 'border-gray-200 hover:border-brand-green/50'
                      }`}
                    >
                      {checked && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
              <span className="font-dm-sans text-[10px] text-gray-400">{videosDone}/{videosPerDay}</span>
            </div>
          )
        })}
      </div>

      <p className="font-dm-sans text-xs text-gray-400 text-center">
        Marca cada video que publiques durante el día.
      </p>
    </div>
  )
}
