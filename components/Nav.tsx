'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Home, Compass, ShoppingBag, Megaphone, User } from 'lucide-react'
import { CreatorLevel, LEVEL_BADGE_COLORS } from '@/lib/types'

interface NavProps {
  level?: CreatorLevel | null
}

// Five-item nav shared between the desktop top bar and the mobile
// bottom bar. Same destinations, different layout. Everything that
// used to live in the burger menu (Mi Crecimiento / Mi Progreso /
// Violaciones / Papaya Picks) has migrated inside the pages or under
// /profile.
const ITEMS = [
  { href: '/dashboard',  label: 'Inicio',     icon: Home,        segment: 'dashboard' },
  { href: '/strategy',   label: 'Estrategia', icon: Compass,     segment: 'strategy' },
  { href: '/products',   label: 'Productos',  icon: ShoppingBag, segment: 'products' },
  { href: '/campaigns',  label: 'Campañas',   icon: Megaphone,   segment: 'campaigns' },
  { href: '/profile',    label: 'Mi Perfil',  icon: User,        segment: 'profile' },
] as const

function isActive(pathname: string, segment: string): boolean {
  // /dashboard, /products, /campaigns/[id] all should highlight their
  // primary tab. Match on the first non-empty segment.
  const first = pathname.split('/')[1] ?? ''
  return first === segment
}

export default function Nav({ level }: NavProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop top bar — md and up */}
      <nav className="hidden md:block bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <Image
                src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/Sun_green.png"
                alt="Papaya Social Club"
                width={28}
                height={28}
              />
              <span className="font-dm-sans font-semibold text-brand-black text-sm tracking-wide">
                Papaya Social Club
              </span>
              <span className="font-dm-sans text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F4A7C3' }}>🇺🇸 USA</span>
            </Link>

            <div className="flex items-center gap-1">
              {ITEMS.map(({ href, label, segment }) => {
                const active = isActive(pathname, segment)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-4 py-2 rounded-lg font-dm-sans text-sm font-medium transition-colors ${
                      active
                        ? 'bg-brand-green text-white'
                        : 'text-gray-600 hover:text-brand-green hover:bg-brand-green/5'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>

            {level && (
              <span
                className="inline-flex items-center gap-1.5 font-dm-sans text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: LEVEL_BADGE_COLORS[level]?.bg ?? '#F1EFE8',
                  color: LEVEL_BADGE_COLORS[level]?.text ?? '#444441',
                }}
              >
                {level === 'Elite' ? '👑 ' : ''}{level}
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile top header — shows logo + level chip only; navigation
          moved to the bottom bar. Helps users know where they are
          without taking real estate from the page content. */}
      <header className="md:hidden bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/Sun_green.png"
              alt="Papaya Social Club"
              width={22}
              height={22}
            />
            <span className="font-dm-sans font-semibold text-brand-black text-xs tracking-wide">
              Papaya Social Club
            </span>
          </Link>
          {level && (
            <span
              className="inline-flex items-center gap-1 font-dm-sans text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: LEVEL_BADGE_COLORS[level]?.bg ?? '#F1EFE8',
                color: LEVEL_BADGE_COLORS[level]?.text ?? '#444441',
              }}
            >
              {level === 'Elite' ? '👑 ' : ''}{level}
            </span>
          )}
        </div>
      </header>

      {/* Mobile bottom bar — fixed, the 5 primary destinations. */}
      <nav
        aria-label="Navegación principal"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="grid grid-cols-5">
          {ITEMS.map(({ href, label, icon: Icon, segment }) => {
            const active = isActive(pathname, segment)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                    active ? 'text-brand-green' : 'text-gray-500 hover:text-brand-black'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.75} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
