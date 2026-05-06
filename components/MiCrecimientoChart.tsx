'use client'

import { useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Row {
  month: string
  gmv: number
  videos_posted: number
  commissions_earned: number
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function labelFor(monthIso: string): string {
  const d = new Date(monthIso)
  return `${MONTHS_ES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`
}

export default function MiCrecimientoChart({ rows, currentMonth }: { rows: Row[]; currentMonth: string }) {
  const [metric, setMetric] = useState<'gmv' | 'videos_posted' | 'commissions_earned'>('gmv')

  const ordered = [...rows].sort((a, b) => a.month.localeCompare(b.month))
  const labels = ordered.map((r) => labelFor(r.month))
  const values = ordered.map((r) => Number(r[metric]) || 0)
  const colors = ordered.map((r) => r.month === currentMonth ? '#F4A7C3' : '#1B5E3B')

  const data = {
    labels,
    datasets: [{
      label: metric === 'gmv' ? 'GMV ($)' : metric === 'videos_posted' ? 'Videos' : 'Comisiones ($)',
      data: values,
      backgroundColor: colors,
      borderRadius: 6,
    }],
  }

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { grid: { display: false } },
    },
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-pink/20 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-playfair text-xl text-brand-black">Tu progreso histórico</h2>
        <div className="flex gap-1">
          {([['gmv', 'GMV'], ['videos_posted', 'Videos'], ['commissions_earned', 'Comisiones']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                metric === key ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {ordered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">Aún no hay datos. Tu account manager los está cargando.</p>
      ) : (
        <div style={{ height: 280 }}>
          <Bar data={data} options={opts} />
        </div>
      )}
    </div>
  )
}
