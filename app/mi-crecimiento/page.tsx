import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import { CreatorLevel, CreatorMonthlyStats, CreatorVideo } from '@/lib/types'
import MiCrecimientoChart from '@/components/MiCrecimientoChart'

export const dynamic = 'force-dynamic'

function moneyShort(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export default async function MiCrecimientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const authEmail = (user.email ?? '').trim().toLowerCase()
  const { data: creator } = await supabase
    .from('creators')
    .select('id, name, level')
    .ilike('email', authEmail)
    .maybeSingle()

  const level = (creator?.level ?? 'Initiation') as CreatorLevel

  if (!creator) {
    return (
      <div className="min-h-screen bg-brand-light-pink">
        <Nav level={level} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-10 text-center">
            <p className="text-4xl mb-3">📈</p>
            <h2 className="font-playfair text-2xl text-brand-black mb-2">Aún no podemos cargar tu crecimiento.</h2>
            <p className="font-dm-sans text-gray-500 text-sm">Tu account manager configurará tu perfil pronto.</p>
          </div>
        </main>
      </div>
    )
  }

  // Use admin client to bypass RLS reliably (we already gated by auth above).
  const admin = createAdminClient()
  const [{ data: statsData }, { data: videosData }] = await Promise.all([
    admin.from('creator_monthly_stats').select('*').eq('creator_id', creator.id).order('month', { ascending: true }),
    admin.from('creator_videos').select('*, product:products(id, name)').eq('creator_id', creator.id).order('created_at', { ascending: false }),
  ])

  const stats = (statsData ?? []) as CreatorMonthlyStats[]
  const videos = (videosData ?? []) as CreatorVideo[]

  const now = new Date()
  const currentMonthIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const currentStat = stats.find((s) => s.month.slice(0, 10) === currentMonthIso)

  const currentGmv = Number(currentStat?.gmv ?? 0)
  const currentProj = Number(currentStat?.gmv_projection ?? 0)
  const pctMet = currentProj > 0 ? Math.round((currentGmv / currentProj) * 100) : null
  const isUnderProjection = currentProj > 0 && currentGmv < currentProj * 0.7

  // Best converting product (by gmv_generated)
  const bestVideo = [...videos].filter((v) => v.converted).sort((a, b) => Number(b.gmv_generated) - Number(a.gmv_generated))[0]

  const currentVideos = currentStat?.videos_posted ?? 0
  const currentCommission = Number(currentStat?.commission_rate ?? 0)
  const currentCommissionsEarned = Number(currentStat?.commissions_earned ?? 0)

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={level} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h1 className="font-playfair text-4xl text-brand-black mb-1">Mi Crecimiento</h1>
          <p className="font-dm-sans text-sm text-gray-500">Tu desempeño mes a mes con datos verificados por tu equipo.</p>
        </div>

        {/* 4 metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">GMV este mes</p>
            <p className="font-playfair text-3xl text-brand-black mt-1">{moneyShort(currentGmv)}</p>
            {pctMet != null && (
              <p className={`text-xs font-semibold mt-1 ${isUnderProjection ? 'text-rose-600' : 'text-emerald-600'}`}>
                {pctMet}% vs proyección
              </p>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Comisión actual</p>
            <p className="font-playfair text-3xl text-brand-pink mt-1">{currentCommission}%</p>
          </div>
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Videos publicados</p>
            <p className="font-playfair text-3xl text-brand-black mt-1">{currentVideos}</p>
          </div>
          <div className="bg-white rounded-2xl border border-brand-pink/20 p-5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Comisiones ganadas</p>
            <p className="font-playfair text-3xl text-brand-green mt-1">{moneyShort(currentCommissionsEarned)}</p>
          </div>
        </div>

        {/* Alert banner */}
        {isUnderProjection && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-dm-sans font-semibold text-amber-800">Estás por debajo de tu proyección este mes.</p>
              {bestVideo && (
                <p className="font-dm-sans text-sm text-amber-700 mt-1">
                  Replica tu video de <b>{bestVideo.product?.name ?? 'tu mejor producto'}</b> y duplica tu ritmo.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="mb-6">
          <MiCrecimientoChart
            rows={stats.map((s) => ({
              month: s.month,
              gmv: Number(s.gmv) || 0,
              videos_posted: s.videos_posted ?? 0,
              commissions_earned: Number(s.commissions_earned) || 0,
            }))}
            currentMonth={currentMonthIso}
          />
        </div>

        {/* History table */}
        <div className="bg-white rounded-2xl border border-brand-pink/20 p-5 mb-6">
          <h2 className="font-playfair text-xl text-brand-black mb-4">Historial mensual</h2>
          {stats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aún no hay datos.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-dm-sans">
                <thead className="bg-gray-50">
                  <tr>{['Mes', 'GMV', 'Proyección', '% met', 'Videos', 'Lives', 'Comisiones', 'vs anterior'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs text-gray-500 font-semibold uppercase">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...stats].reverse().map((s, i, arr) => {
                    const prev = arr[i + 1]
                    const proj = Number(s.gmv_projection) || 0
                    const pct = proj > 0 ? Math.round((Number(s.gmv) / proj) * 100) : null
                    const change = prev && Number(prev.gmv) > 0 ? Math.round(((Number(s.gmv) - Number(prev.gmv)) / Number(prev.gmv)) * 100) : null
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-semibold text-brand-black">{s.month.slice(0, 7)}</td>
                        <td className="px-3 py-2">{moneyShort(Number(s.gmv))}</td>
                        <td className="px-3 py-2 text-gray-500">{moneyShort(proj)}</td>
                        <td className="px-3 py-2">{pct != null ? <span className={pct >= 100 ? 'text-emerald-600 font-semibold' : 'text-gray-700'}>{pct}%</span> : '—'}</td>
                        <td className="px-3 py-2">{s.videos_posted}</td>
                        <td className="px-3 py-2">{Number(s.live_hours)}h</td>
                        <td className="px-3 py-2">{moneyShort(Number(s.commissions_earned))}</td>
                        <td className="px-3 py-2">
                          {change == null ? '—' : (
                            <span className={change >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mis videos */}
        <div className="bg-white rounded-2xl border border-brand-pink/20 p-5">
          <h2 className="font-playfair text-xl text-brand-black mb-4">Mis videos</h2>
          {videos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aún no se han registrado videos. Cuéntale a tu account manager cuáles publicaste.</p>
          ) : (
            <ul className="space-y-2">
              {videos.map((v) => (
                <li key={v.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${v.converted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                    {v.converted ? '✓ Convertido' : 'Sin conversión'}
                  </span>
                  <a href={v.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-green hover:underline flex-1 min-w-0 truncate">{v.tiktok_url}</a>
                  {v.product?.name && <span className="text-xs text-gray-500 shrink-0">{v.product.name}</span>}
                  {Number(v.gmv_generated) > 0 && <span className="text-xs font-semibold text-brand-pink shrink-0">{moneyShort(Number(v.gmv_generated))}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
