export type CreatorLevel = 'Initiation' | 'Rising' | 'Pro' | 'Elite'
export type StrategyPriority = 'Hero' | 'Secondary' | 'Supporting'

export interface Creator {
  id: string
  email: string
  name: string | null
  level: CreatorLevel
  gmv: number
  gmv_target: number
  personal_gmv_goal: number
  streak: number
  cohort_rank: number | null
  hero_product_id: string | null
  is_active: boolean
  created_at: string
  whatsapp_number: string | null
  mastermind_date: string | null
  account_manager_name: string | null
  account_manager_whatsapp: string | null
}

export interface Product {
  id: string
  name: string
  commission_rate: number | null
  conversion_rate: number | null
  is_exclusive: boolean
  niche: string | null
  image_url: string | null
  product_link: string | null
  tags: string[]
  created_at: string
  approved_for_initiation: boolean
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
  brand_logo_url: string | null
  product_id: string | null
  budget: number | null
  product_link: string | null
  sample_available: boolean
  created_at: string
}

export interface CampaignApplication {
  id: string
  campaign_id: string
  creator_id: string
  posts_offered: number | null
  live_hours_offered: number | null
  price_offered: number | null
  created_at: string
}

export interface StrategyVideo {
  id: string
  strategy_product_id: string
  video_url: string
  thumbnail_url: string | null
  created_at: string
}

export interface StrategyProduct {
  id: string
  strategy_id: string
  product_id: string | null
  priority: StrategyPriority
  videos_per_day: number | null
  live_hours_per_week: number | null
  gmv_target: number | null
  strategy_note: string | null
  hashtags: string[]
  is_retainer: boolean
  campaign_id: string | null
  created_at: string
  product?: Product | null
  campaign?: Campaign | null
  videos?: StrategyVideo[]
}

export interface Strategy {
  id: string
  creator_id: string
  month: string
  created_at: string
  products?: StrategyProduct[]
}

export interface DailyChecklist {
  id: string
  creator_id: string
  strategy_product_id: string
  date: string
  video_posted: boolean
  live_done: boolean
  created_at: string
}

export interface ProductRequest {
  id: string
  creator_id: string
  product_name: string
  brand_name: string
  reason: string | null
  status: string
  created_at: string
}

export const LEVEL_CONFIG: Record<CreatorLevel, { min: number; max: number; target: number | null; color: string; next: CreatorLevel | null }> = {
  Initiation: { min: 0, max: 299, target: 300, color: '#9CA3AF', next: 'Rising' },
  Rising:     { min: 300, max: 999, target: 1000, color: '#F4A7C3', next: 'Pro' },
  Pro:        { min: 1000, max: 4999, target: 5000, color: '#1B5E3B', next: 'Elite' },
  Elite:      { min: 5000, max: Infinity, target: null, color: '#F59E0B', next: null },
}
