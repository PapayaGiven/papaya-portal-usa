export type CreatorLevel = 'Initiation' | 'Rising' | 'Pro' | 'Elite'

export interface Creator {
  id: string
  email: string
  name: string | null
  level: CreatorLevel
  gmv: number
  gmv_target: number
  streak: number
  cohort_rank: number | null
  hero_product_id: string | null
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  commission_rate: number | null
  conversion_rate: number | null
  is_exclusive: boolean
  niche: string | null
  created_at: string
}

export interface Task {
  id: string
  creator_id: string
  date: string
  task_name: string | null
  product_id: string | null
  is_hero: boolean
  completed: boolean
  created_at: string
  product?: Product | null
}

export interface Campaign {
  id: string
  brand_name: string
  description: string | null
  commission_rate: number | null
  spots_left: number | null
  deadline: string | null
  min_level: CreatorLevel
  status: string
  created_at: string
}

export const LEVEL_CONFIG: Record<CreatorLevel, { min: number; max: number; target: number | null; color: string; next: CreatorLevel | null }> = {
  Initiation: { min: 0, max: 299, target: 300, color: '#9CA3AF', next: 'Rising' },
  Rising:     { min: 300, max: 999, target: 1000, color: '#F4A7C3', next: 'Pro' },
  Pro:        { min: 1000, max: 4999, target: 5000, color: '#1B5E3B', next: 'Elite' },
  Elite:      { min: 5000, max: Infinity, target: null, color: '#F59E0B', next: null },
}
