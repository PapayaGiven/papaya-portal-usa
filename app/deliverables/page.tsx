import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import { Creator, Deliverable } from '@/lib/types'
import { hasDeliverables } from '@/lib/levelAccess'

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-gray-100', text: 'text-gray-600' },
  delivered: { label: 'Entregado', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  approved: { label: 'Aprobado', bg: 'bg-emerald-200', text: 'text-emerald-800' },
}

export default async function DeliverablesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatorData } = await supabase
    .from('creators')
    .select('*')
    .eq('email', user.email!)
    .single()

  const creator = creatorData as Creator | null
  if (!creator) redirect('/dashboard')

  if (!hasDeliverables(creator.level)) redirect('/dashboard')

  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('*')
    .eq('creator_id', creator.id)
    .order('due_date', { ascending: true })

  const items = (deliverables ?? []) as Deliverable[]

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={creator.level} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-playfair text-4xl text-brand-black mb-1">Mis entregas</h1>
          <p className="font-dm-sans text-sm text-gray-500">
            Aquí puedes ver el estado de todas tus entregas a marcas.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-10 text-center">
            <p className="text-4xl mb-3">📦</p>
            <h2 className="font-playfair text-2xl text-brand-black mb-2">Sin entregas pendientes</h2>
            <p className="font-dm-sans text-gray-500 text-sm">Tu agencia agregará entregas aquí cuando tengas compromisos con marcas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((d) => {
              const status = STATUS_STYLES[d.status] ?? STATUS_STYLES.pending
              return (
                <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-dm-sans font-semibold text-brand-black">{d.brand_name}</h3>
                      <span className="font-dm-sans text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{d.deliverable_type}</span>
                    </div>
                    {d.due_date && (
                      <p className="font-dm-sans text-xs text-gray-400">
                        Fecha de entrega: {new Date(d.due_date + 'T12:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    {d.notes && (
                      <p className="font-dm-sans text-xs text-gray-500 mt-1">{d.notes}</p>
                    )}
                  </div>
                  <span className={`shrink-0 font-dm-sans text-xs font-semibold px-3 py-1.5 rounded-full ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
