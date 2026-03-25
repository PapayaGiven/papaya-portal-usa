import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import ApplicationForm from './ApplicationForm'
import { Campaign, LEVEL_CONFIG } from '@/lib/types'

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaignData } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!campaignData) notFound()

  const campaign = campaignData as Campaign

  const levelConfig = LEVEL_CONFIG[campaign.min_level]

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-dm-sans text-sm text-gray-400 hover:text-brand-green transition mb-6"
        >
          ← Zurück zum Dashboard
        </Link>

        {/* Campaign card */}
        <div className="bg-white rounded-3xl border border-brand-pink/20 shadow-sm overflow-hidden mb-6">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-50">
            <div className="flex items-center gap-4">
              {campaign.brand_logo_url ? (
                <div className="w-16 h-16 rounded-2xl border border-gray-100 bg-white flex items-center justify-center overflow-hidden shrink-0 p-1">
                  <img
                    src={campaign.brand_logo_url}
                    alt={campaign.brand_name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl border border-gray-100 bg-brand-light-pink flex items-center justify-center shrink-0">
                  <span className="font-playfair text-2xl text-brand-pink">
                    {campaign.brand_name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h1 className="font-playfair text-3xl text-brand-black leading-tight">
                  {campaign.brand_name}
                </h1>
                {campaign.description && (
                  <p className="font-dm-sans text-sm text-gray-500 mt-1">{campaign.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-gray-50">
            <div className="px-6 py-5 text-center">
              <p className="font-playfair text-2xl font-bold text-brand-pink">
                {campaign.commission_rate}%
              </p>
              <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Provision</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="font-playfair text-2xl font-bold text-brand-black">
                {campaign.spots_left ?? '∞'}
              </p>
              <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Plätze frei</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="font-playfair text-2xl font-bold text-brand-green">
                {campaign.budget ? `€${campaign.budget.toLocaleString('de-DE')}` : '–'}
              </p>
              <p className="font-dm-sans text-xs text-gray-400 mt-0.5">Budget</p>
            </div>
            <div className="px-6 py-5 text-center">
              <span
                className="inline-block font-dm-sans text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: levelConfig.color }}
              >
                ab {campaign.min_level}
              </span>
              <p className="font-dm-sans text-xs text-gray-400 mt-1">Min. Level</p>
            </div>
          </div>

          {/* Deadline */}
          {campaign.deadline && (
            <div className="px-8 py-3 bg-amber-50 border-t border-amber-100">
              <p className="font-dm-sans text-xs text-amber-700">
                ⏱ Deadline:{' '}
                {new Date(campaign.deadline).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {campaign.product_link && (
            <a
              href={campaign.product_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-3.5 rounded-xl font-dm-sans font-semibold text-sm text-white transition hover:opacity-90"
              style={{ backgroundColor: '#1B5E3B' }}
            >
              Zum Showcase hinzufügen →
            </a>
          )}
          {campaign.sample_available && (
            <a
              href={`mailto:team@papayasocialclub.de?subject=Sample-Anfrage: ${encodeURIComponent(campaign.brand_name)}`}
              className="flex-1 text-center py-3.5 rounded-xl font-dm-sans font-semibold text-sm text-brand-green border-2 border-brand-green hover:bg-brand-green/5 transition"
            >
              Sample anfordern
            </a>
          )}
        </div>

        {/* Interest form */}
        <div className="bg-white rounded-3xl border border-brand-pink/20 shadow-sm p-8">
          <h2 className="font-playfair text-2xl text-brand-black mb-1">Ich bin dabei!</h2>
          <p className="font-dm-sans text-sm text-gray-500 mb-6">
            Teile uns dein Angebot mit — wir melden uns schnell bei dir.
          </p>
          <ApplicationForm campaignId={campaign.id} />
        </div>
      </main>
    </div>
  )
}
