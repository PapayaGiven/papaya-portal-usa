interface VideoProgressBarProps {
  done: number
  target: number
}

export default function VideoProgressBar({ done, target }: VideoProgressBarProps) {
  const safeTarget = target > 0 ? target : 0
  const pct = safeTarget > 0 ? Math.min((done / safeTarget) * 100, 100) : 0
  const isDone = safeTarget > 0 && done >= safeTarget

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="font-dm-sans font-semibold text-brand-black text-sm">
          Videos hoy: <span className="font-bold">{done}</span> de <span className="font-bold">{safeTarget}</span>
        </h3>
        {isDone && (
          <span className="font-dm-sans text-xs font-semibold text-brand-green">🎉 ¡Meta diaria cumplida!</span>
        )}
      </div>
      <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-3 rounded-full bg-brand-green transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-dm-sans text-xs text-gray-500 mt-2">
        {Math.round(pct)}% de tu meta diaria
      </p>
    </div>
  )
}
