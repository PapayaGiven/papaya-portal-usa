import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Nav from '@/components/Nav'
import ViolationForm from '@/components/ViolationForm'
import { Creator } from '@/lib/types'

interface Violation {
  id: string
  creator_id: string
  description: string
  status: string
  created_at: string
}

export default async function ViolationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatorData } = await supabase
    .from('creators')
    .select('*')
    .eq('email', user.email!)
    .single()

  const creator = creatorData as Creator | null
  if (!creator) redirect('/login')

  const { data: violationsData } = await supabase
    .from('violations')
    .select('*')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false })

  const violations = (violationsData ?? []) as Violation[]

  function statusLabel(status: string) {
    switch (status) {
      case 'pending':
        return { label: 'Pendiente', color: 'text-amber-700 bg-amber-50 border-amber-200' }
      case 'in_review':
        return { label: 'En revisión', color: 'text-blue-700 bg-blue-50 border-blue-200' }
      case 'resolved':
        return { label: 'Resuelto', color: 'text-brand-green bg-brand-green/5 border-brand-green/20' }
      case 'rejected':
        return { label: 'Rechazado', color: 'text-red-700 bg-red-50 border-red-200' }
      default:
        return { label: status, color: 'text-gray-600 bg-gray-50 border-gray-200' }
    }
  }

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={creator.level} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Image
            src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/logo_pink.png"
            alt="Papaya Social Club"
            width={48}
            height={48}
          />
          <div>
            <h1 className="font-playfair text-4xl text-brand-black mb-1">Reportar una violación</h1>
            <p className="font-dm-sans text-gray-500 text-sm">
              Si recibiste una violación en TikTok que consideras injusta, puedes reportarla aquí. Nuestro equipo la revisará y te ayudará.
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-brand-pink/20 p-6 mb-8">
          <h2 className="font-playfair text-xl text-brand-black mb-5">Nueva violación</h2>
          <ViolationForm />
        </div>

        {/* Existing violations */}
        {violations.length > 0 && (
          <section>
            <h2 className="font-playfair text-2xl text-brand-black mb-4">Tus reportes</h2>
            <div className="flex flex-col gap-3">
              {violations.map((violation) => {
                const { label, color } = statusLabel(violation.status ?? 'pending')
                const date = new Date(violation.created_at).toLocaleDateString('es-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })

                return (
                  <div
                    key={violation.id}
                    className="bg-white rounded-2xl border border-brand-pink/20 p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span
                        className={`font-dm-sans text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}
                      >
                        {label}
                      </span>
                      <span className="font-dm-sans text-xs text-gray-400 shrink-0">{date}</span>
                    </div>
                    <p className="font-dm-sans text-sm text-gray-700 leading-relaxed line-clamp-4">
                      {violation.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {violations.length === 0 && (
          <div className="text-center py-8">
            <p className="font-dm-sans text-sm text-gray-400">No has enviado ningún reporte aún.</p>
          </div>
        )}
      </main>
    </div>
  )
}
