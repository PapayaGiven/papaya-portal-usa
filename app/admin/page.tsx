import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminPanel from '@/components/admin/AdminPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const adminSession = cookieStore.get('admin_session')

  if (adminSession?.value !== 'valid') {
    return <AdminLogin />
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const [creatorsRes, productsRes, campaignsRes, todayTasksRes] = await Promise.all([
    supabase
      .from('creators')
      .select('*')
      .order('gmv', { ascending: false }),
    supabase
      .from('products')
      .select('*')
      .order('commission_rate', { ascending: false }),
    supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('*, creator:creators(name, email), product:products(name)')
      .eq('date', today)
      .order('created_at', { ascending: false }),
  ])

  return (
    <AdminPanel
      creators={creatorsRes.data ?? []}
      products={productsRes.data ?? []}
      campaigns={campaignsRes.data ?? []}
      todayTasks={todayTasksRes.data ?? []}
    />
  )
}
