import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Nav from '@/components/Nav'
import CampaignCard from '@/components/CampaignCard'
import LockedSection from '@/components/LockedSection'
import { Creator, Campaign } from '@/lib/types'
import { canSeeCampaigns, getLevelIndex } from '@/lib/levelAccess'

export default async function CampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatorData } = await supabase
    .from('creators')
    .select('*')
    .eq('email', user.email!)
    .single()

  const creator = creatorData as Creator | null

  const { data: campaignsData } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })

  const campaigns = (campaignsData ?? []) as Campaign[]
  const level = creator?.level ?? 'Initiation'
  const unlocked = canSeeCampaigns(level)

  const previewCampaigns = campaigns.slice(0, 3)

  function creatorHasAccess(campaign: Campaign): boolean {
    if (campaign.target_levels && campaign.target_levels.length > 0) {
      return campaign.target_levels.includes(level)
    }
    // Fallback to min_level check
    return getLevelIndex(level) >= getLevelIndex(campaign.min_level)
  }

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={creator?.level ?? null} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center gap-4">
          <Image
            src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/logo_pink.png"
            alt="Papaya Social Club"
            width={48}
            height={48}
          />
          <div>
            <h1 className="font-playfair text-4xl text-brand-black mb-1">Campañas</h1>
            <p className="font-dm-sans text-gray-500 text-sm">
              {unlocked ? `${campaigns.length} campañas activas` : 'Desbloquea campañas en el nivel Foundation'}
            </p>
          </div>
        </div>

        {unlocked ? (
          campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-brand-pink/20 p-10 text-center">
              <p className="text-4xl mb-3">📢</p>
              <h2 className="font-playfair text-2xl text-brand-black mb-2">No hay campañas activas en este momento.</h2>
              <p className="font-dm-sans text-gray-500 text-sm">Vuelve pronto — se agregan campañas nuevas regularmente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {campaigns.map((campaign) => (
                creatorHasAccess(campaign) ? (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ) : (
                  <div key={campaign.id} className="relative rounded-2xl overflow-hidden">
                    <div className="filter blur-[6px] pointer-events-none select-none">
                      <CampaignCard campaign={campaign} />
                    </div>
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl">
                      <p className="font-dm-sans text-sm font-semibold text-gray-500 text-center px-4">
                        Disponible en otro nivel — sigue creciendo
                      </p>
                    </div>
                  </div>
                )
              ))}
            </div>
          )
        ) : (
          <LockedSection unlockAt="Foundation">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {previewCampaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
              {previewCampaigns.length === 0 && (
                <div className="col-span-3 bg-white rounded-2xl p-8 text-center">
                  <p className="font-dm-sans text-gray-400">Las campañas aparecerán aquí cuando se desbloqueen.</p>
                </div>
              )}
            </div>
          </LockedSection>
        )}
      </main>
    </div>
  )
}
