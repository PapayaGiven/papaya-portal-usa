import Link from 'next/link'
import { CreatorLevel } from '@/lib/types'

interface LockedSectionProps {
  unlockAt: CreatorLevel
  children: React.ReactNode
  className?: string
}

export default function LockedSection({ unlockAt, children, className = '' }: LockedSectionProps) {
  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      <div className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-2xl">
        <div className="text-center px-6 py-4">
          <div className="w-12 h-12 rounded-full bg-brand-light-pink border border-brand-pink/30 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">🔒</span>
          </div>
          <p className="font-dm-sans font-semibold text-brand-black text-sm mb-1">
            Se desbloquea en {unlockAt}
          </p>
          <p className="font-dm-sans text-xs text-gray-400 mb-4">
            Sigue creciendo tu GMV para alcanzar este nivel.
          </p>
          <Link
            href="/mi-progreso"
            className="inline-block font-dm-sans text-xs font-semibold text-white px-4 py-2 rounded-xl transition hover:opacity-90"
            style={{ backgroundColor: '#1B5E3B' }}
          >
            Ver mi progreso →
          </Link>
        </div>
      </div>
    </div>
  )
}
