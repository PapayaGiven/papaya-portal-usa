import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Nav from '@/components/Nav'
import ProductRequestButton from '@/components/ProductRequestButton'
import InitiationProductModal from '@/components/InitiationProductModal'
import ProductsTabs from './ProductsTabs'
import { Creator, Product, PapayaPick, CreatorLevel } from '@/lib/types'
import { canSeePapayaPicks } from '@/lib/levelAccess'

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creatorData } = await supabase
    .from('creators')
    .select('*')
    .eq('email', user.email!)
    .single()

  const creator = creatorData as Creator | null

  // Admin client to fetch all products (bypasses RLS)
  const admin = createAdminClient()

  let products: Product[] = []
  let showInitiationModal = false
  let initiationProducts: Product[] = []

  if (creator?.level === 'Initiation') {
    // Fetch their selected initiation products
    const { data: selections } = await supabase
      .from('creator_initiation_products')
      .select('product_id')
      .eq('creator_id', creator.id)

    if (!selections || selections.length === 0) {
      // Show selection modal with all approved_for_initiation products
      showInitiationModal = true
      const { data: approved } = await admin
        .from('products')
        .select('*')
        .eq('approved_for_initiation', true)
        .order('commission_rate', { ascending: false })
      initiationProducts = (approved ?? []) as Product[]
    } else {
      // Show only their selected products
      const ids = selections.map((s) => s.product_id)
      const { data: selected } = await admin
        .from('products')
        .select('*')
        .in('id', ids)
      products = (selected ?? []) as Product[]
    }
  } else {
    // Rising+ sees all products
    const { data: all } = await admin
      .from('products')
      .select('*')
      .order('commission_rate', { ascending: false })
    products = (all ?? []) as Product[]
  }

  const isInitiation = creator?.level === 'Initiation'

  // Papaya Picks — second tab on this page, gated by level. Same query
  // the standalone /papaya-picks page used to do.
  const level = (creator?.level ?? 'Initiation') as CreatorLevel
  const picksAccessible = canSeePapayaPicks(level)
  let picks: PapayaPick[] = []
  if (picksAccessible) {
    const { data: picksData } = await admin
      .from('papaya_picks')
      .select('*')
      .eq('is_active', true)
      .order('papaya_pick_score', { ascending: false })
    picks = ((picksData ?? []) as PapayaPick[]).filter((p) => {
      if (!p.expires_at) return true
      return new Date(p.expires_at) > new Date()
    })
  }

  return (
    <div className="min-h-screen bg-brand-light-pink">
      <Nav level={creator?.level ?? null} />

      {showInitiationModal && creator && initiationProducts.length > 0 && (
        <InitiationProductModal
          products={initiationProducts}
          creatorId={creator.id}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Image
              src="https://nptkinihgouicdimytbf.supabase.co/storage/v1/object/public/PSC%20LOGOS/logo_pink.png"
              alt="Papaya Social Club"
              width={48}
              height={48}
            />
            <div>
              <h1 className="font-playfair text-4xl text-brand-black mb-1">Productos</h1>
              <p className="font-dm-sans text-gray-500 text-sm">
                {isInitiation
                  ? 'Tus 3 productos iniciales para promover.'
                  : `${products.length} productos disponibles · ordenados por comisión`}
              </p>
            </div>
          </div>
          <ProductRequestButton />
        </div>

        <ProductsTabs products={products} picks={picks} picksAccessible={picksAccessible} />
      </main>
    </div>
  )
}
