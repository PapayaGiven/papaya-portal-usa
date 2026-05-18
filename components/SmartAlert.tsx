import Link from 'next/link'

export type Alert =
  | {
      kind: 'campaign'
      title: string
      message: string
      href: string
      cta: string
    }
  | {
      kind: 'gmv-behind'
      title: string
      message: string
      href: string
      cta: string
    }
  | {
      kind: 'papaya-pick'
      title: string
      message: string
      href: string
      cta: string
    }

const STYLES: Record<Alert['kind'], { bg: string; border: string; text: string; ctaBg: string; ctaText: string; icon: string }> = {
  campaign: {
    bg: 'bg-brand-pink/10',
    border: 'border-brand-pink/30',
    text: 'text-brand-pink',
    ctaBg: 'bg-brand-pink',
    ctaText: 'text-white',
    icon: '⏰',
  },
  'gmv-behind': {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-700',
    ctaBg: 'bg-amber-500',
    ctaText: 'text-white',
    icon: '⚠️',
  },
  'papaya-pick': {
    bg: 'bg-brand-green/10',
    border: 'border-brand-green/30',
    text: 'text-brand-green',
    ctaBg: 'bg-brand-green',
    ctaText: 'text-white',
    icon: '🌟',
  },
}

export default function SmartAlert({ alert }: { alert: Alert }) {
  const s = STYLES[alert.kind]
  return (
    <div className={`${s.bg} ${s.border} border rounded-2xl p-4 sm:p-5 flex items-center gap-4 flex-wrap`}>
      <div className="text-2xl shrink-0">{s.icon}</div>
      <div className="flex-1 min-w-[180px]">
        <p className={`font-dm-sans text-xs font-bold uppercase tracking-widest ${s.text} mb-0.5`}>{alert.title}</p>
        <p className="font-dm-sans text-sm text-brand-black leading-snug">{alert.message}</p>
      </div>
      <Link
        href={alert.href}
        className={`${s.ctaBg} ${s.ctaText} font-dm-sans text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition shrink-0`}
      >
        {alert.cta}
      </Link>
    </div>
  )
}
