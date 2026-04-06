'use client'

import { useState } from 'react'
import { Task } from '@/lib/types'

interface DailyTasksProps {
  tasks: Task[]
  creatorId: string
}


async function toggleTaskAction(taskId: string, completed: boolean) {
  const res = await fetch('/api/tasks/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, completed }),
  })
  if (!res.ok) throw new Error('Failed to toggle task')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function DailyTasks({ tasks, creatorId }: DailyTasksProps) {
  const [completions, setCompletions] = useState<Record<string, boolean>>(
    Object.fromEntries(tasks.map((t) => [t.id, t.completed]))
  )
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const allComplete =
    tasks.length > 0 && tasks.every((t) => completions[t.id])
  const hasTasks = tasks.length > 0

  async function handleToggle(taskId: string) {
    const current = completions[taskId]
    // Optimistic update
    setCompletions((prev) => ({ ...prev, [taskId]: !current }))
    setLoading((prev) => ({ ...prev, [taskId]: true }))

    try {
      await toggleTaskAction(taskId, !current)
    } catch {
      // Revert on error
      setCompletions((prev) => ({ ...prev, [taskId]: current }))
    } finally {
      setLoading((prev) => ({ ...prev, [taskId]: false }))
    }
  }

  return (
    <div
      className={`rounded-2xl border p-6 transition-colors ${
        !hasTasks
          ? 'bg-white border-gray-100'
          : allComplete
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-amber-50 border-amber-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-dm-sans font-semibold text-brand-black text-base">
            Tareas de hoy
          </h3>
          {hasTasks && (
            <p
              className={`font-dm-sans text-xs mt-0.5 ${
                allComplete ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {allComplete
                ? '🎉 ¡Todas las tareas completadas!'
                : 'Completa tus tareas diarias.'}
            </p>
          )}
        </div>
        {hasTasks && (
          <span
            className={`font-dm-sans text-xs font-semibold px-2.5 py-1 rounded-full ${
              allComplete
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {Object.values(completions).filter(Boolean).length}/{tasks.length}
          </span>
        )}
      </div>

      {/* Tasks list */}
      {!hasTasks ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-dm-sans text-sm text-gray-400">
            No hay tareas para hoy.
          </p>
          <p className="font-dm-sans text-xs text-gray-300 mt-1">
            Tu agencia te asignará tareas pronto.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const done = completions[task.id]
            const isLoading = loading[task.id]

            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  done ? 'opacity-60' : 'opacity-100'
                } bg-white/70`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggle(task.id)}
                  disabled={isLoading}
                  className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    done
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-gray-300 hover:border-brand-green'
                  } disabled:opacity-50`}
                  aria-label={done ? 'Marcar como pendiente' : 'Marcar como hecho'}
                >
                  {done && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-dm-sans text-sm font-medium ${
                      done ? 'line-through text-gray-400' : 'text-brand-black'
                    }`}
                  >
                    {task.task_name || 'Tarea'}
                  </p>
                  {task.product && (
                    <p className="font-dm-sans text-xs text-gray-400 truncate">
                      {task.product.name}
                    </p>
                  )}
                </div>

                {/* Hero badge */}
                {task.is_hero && (
                  <span className="shrink-0 font-dm-sans text-xs font-semibold bg-brand-black text-white px-2 py-0.5 rounded-full">
                    ★ Hero
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
