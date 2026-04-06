'use client'

import { useState, useTransition } from 'react'
import { updatePersonalGoalNotes } from '@/app/dashboard/actions'

interface PersonalGoalNotesProps {
  initialNotes: string | null
}

export default function PersonalGoalNotes({ initialNotes }: PersonalGoalNotesProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialNotes ?? '')
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleEdit() {
    setDraft(notes)
    setEditing(true)
    setError(null)
  }

  function handleCancel() {
    setEditing(false)
    setError(null)
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updatePersonalGoalNotes(draft)
      if (result.error) {
        setError(result.error)
      } else {
        setNotes(draft)
        setEditing(false)
        setError(null)
      }
    })
  }

  return (
    <div className="w-full mt-4 border-t border-gray-100 pt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-dm-sans text-xs font-semibold uppercase tracking-widest text-gray-400">
          Notas de mi meta
        </span>
        {!editing && (
          <button
            type="button"
            onClick={handleEdit}
            aria-label="Editar notas"
            className="text-gray-300 hover:text-brand-green transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe tus notas o bullet points sobre tu meta personal…"
            className="w-full font-dm-sans text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-brand-green transition"
          />
          {error && (
            <p className="font-dm-sans text-xs text-red-500">{error}</p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="font-dm-sans text-xs font-semibold bg-brand-green text-white px-3 py-1.5 rounded-lg hover:bg-brand-green/90 transition disabled:opacity-50"
            >
              {isPending ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="font-dm-sans text-xs font-semibold text-gray-400 hover:text-gray-600 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : notes ? (
        <p className="font-dm-sans text-sm text-gray-600 whitespace-pre-line leading-relaxed">
          {notes}
        </p>
      ) : (
        <p className="font-dm-sans text-xs text-gray-300 italic">
          Sin notas aún. Haz clic en el lápiz para agregar.
        </p>
      )}
    </div>
  )
}
