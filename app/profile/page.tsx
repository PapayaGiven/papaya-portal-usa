import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, TrendingUp, Trophy, Gift, MessagesSquare, GraduationCap, CalendarClock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/Nav'
import SignOutButton from './SignOutButton'
import { Creator, LEVEL_BADGE_COLORS, SiteSettings, LEVEL_CONFIG } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Creator profile hub. Consolidates the menu items that used to live in
 * the burger nav (Mi Crecimiento, Mi Progreso, Comunidad, Educación,
 * Agendar llamada, Cerrar sesión) into one tap-friendly list.
 */
export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatorData } = await supabase
    .from('creators')
    .select('*')
    .eq('email', user.email!)
    .single()
  const creator = (creatorData ?? null) as Creator | null
  if (!creator) redirect('/login')

  // Booking link: per-level override on settings wins; per-creator
  // override second; LEVEL_CONFIG default last.
  const { data: settingsData } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .maybeSingle()
  const settings = (settingsData ?? null) as SiteSettings | null

  const levelBookingKey = `booking_link_${creator.level.toLowerCase()}` as keyof SiteSettings
  const settingsBooking = (settings?.[levelBookingKey] as string | null | undefined) ?? null
  const bookingLink = creator.booking_link || settingsBooking || null

  const whatsappGroup = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_URL || 'https://wa.me/'
  const kajabiUrl = process.env.NEXT_PUBLIC_KAJABI_URL || '#'

  const levelStyle = LEVEL_BADGE_COLORS[creator.level] ?? LEVEL_BADGE_COLORS.Initiation
  const levelTarget = LEVEL_CONFIG[creator.level]?.target ?? null

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={creator.level} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Identity card */}
        <section className="bg-white border border-gray-100 rounded-3xl p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-full bg-brand-pink/20 text-brand-green font-dm-sans font-bold text-lg flex items-center justify-center shrink-0">
              {creator.name?.[0]?.toUpperCase() ?? creator.email[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-playfair text-2xl text-brand-black truncate">{creator.name || creator.email}</h1>
              <p className="font-dm-sans text-xs text-gray-400 truncate">{creator.email}</p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 font-dm-sans text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: levelStyle.bg, color: levelStyle.text }}
            >
              {creator.level === 'Elite' ? '👑 ' : ''}{creator.level}
            </span>
          </div>
          {levelTarget != null && (
            <p className="font-dm-sans text-xs text-gray-500 mt-3">
              Meta de este nivel: <span className="font-semibold text-brand-black">${levelTarget.toLocaleString()}</span> GMV mensual
            </p>
          )}
        </section>

        {/* Menu list */}
        <section className="bg-white border border-gray-100 rounded-3xl overflow-hidden">
          <MenuItem href="/mi-crecimiento" icon={TrendingUp} label="Mi Crecimiento" hint="GMV mensual, comisiones, tracking" />
          <MenuItem href="/mi-progreso" icon={Trophy} label="Mi Progreso" hint="Nivel actual + cómo avanzar" />
          <MenuItem href="/mi-progreso#rewards" icon={Gift} label="Recompensas" hint="Lo que ya ganaste por subir de nivel" />
          <MenuItem href={whatsappGroup} icon={MessagesSquare} label="Comunidad" hint="Grupo de WhatsApp Papaya Social Club" external />
          <MenuItem href={kajabiUrl} icon={GraduationCap} label="Educación" hint="Cursos, plantillas y guías en Kajabi" external />
          {bookingLink && (
            <MenuItem href={bookingLink} icon={CalendarClock} label="Agendar llamada" hint="Reserva con tu account manager" external />
          )}
        </section>

        {/* Sign out — separated so it doesn't read as a primary action */}
        <section>
          <SignOutButton />
        </section>
      </main>
    </div>
  )
}

function MenuItem({
  href,
  icon: Icon,
  label,
  hint,
  external,
}: {
  href: string
  icon: typeof TrendingUp
  label: string
  hint?: string
  external?: boolean
}) {
  const common = "w-full flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition text-left"
  const body = (
    <>
      <span className="w-9 h-9 rounded-xl bg-brand-pink/15 text-brand-green flex items-center justify-center shrink-0">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-dm-sans text-sm font-semibold text-brand-black">{label}</span>
        {hint && <span className="block font-dm-sans text-xs text-gray-500 truncate">{hint}</span>}
      </span>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </>
  )
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={common}>{body}</a>
    )
  }
  return (
    <Link href={href} className={common}>{body}</Link>
  )
}

