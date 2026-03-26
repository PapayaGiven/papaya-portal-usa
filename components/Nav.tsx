'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/strategy', label: 'My Strategy' },
    { href: '/progress', label: 'Progress' },
    { href: '/rewards', label: 'Rewards' },
  ]

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Image
              src="https://cgimvsmnfmpzpkakiguo.supabase.co/storage/v1/object/public/PSC%20LOGOS/Sun_green.png"
              alt="Papaya Social Club"
              width={28}
              height={28}
            />
            <span className="font-dm-sans font-semibold text-brand-black text-sm tracking-wide hidden sm:block">
              Papaya Social Club
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg font-dm-sans text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-green text-white'
                      : 'text-gray-600 hover:text-brand-green hover:bg-brand-green/5'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Sign out */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="hidden md:block font-dm-sans text-sm text-gray-500 hover:text-brand-green transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 px-4 py-2 mb-1">
            <Image
              src="https://cgimvsmnfmpzpkakiguo.supabase.co/storage/v1/object/public/PSC%20LOGOS/Sun_green.png"
              alt="Papaya Social Club"
              width={20}
              height={20}
            />
            <span className="font-dm-sans text-xs font-semibold text-gray-400 uppercase tracking-widest">Papaya Social Club</span>
          </div>
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-lg font-dm-sans text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-green text-white'
                    : 'text-gray-600 hover:text-brand-green hover:bg-brand-green/5'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="block w-full text-left px-4 py-2.5 font-dm-sans text-sm text-gray-500 hover:text-brand-green transition-colors rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}
    </nav>
  )
}
