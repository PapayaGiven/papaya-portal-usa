export type CreatorLevel = 'Initiation' | 'Foundation' | 'Growth' | 'Scale' | 'Elite'
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
  personal_goal_notes: string | null
  booking_link: string | null
  custom_videos_per_day: number | null
  access_code: string | null
  has_completed_onboarding: boolean
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
  showcase_link: string | null
  sample_link: string | null
  tags: string[]
  created_at: string
  approved_for_initiation: boolean
  product_type: ProductType
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
  target_levels: string[]
  status: string
  brand_logo_url: string | null
  product_id: string | null
  budget: number | null
  product_link: string | null
  sample_available: boolean
  created_at: string
  campaign_products?: { product_id: string }[]
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
  brief_url: string | null
  video_focus: string | null
  quick_checklist: string[]
  hooks: string[]
  scripts: string | null
  trends: string | null
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
  contact_info: string | null
  status: string
  created_at: string
}

export interface SiteSettings {
  id: string
  calls_per_month_initiation: number
  calls_per_month_foundation: number
  calls_per_month_growth: number
  calls_per_month_scale: number
  calls_per_month_elite: number
  booking_link_initiation: string | null
  booking_link_foundation: string | null
  booking_link_growth: string | null
  booking_link_scale: string | null
  booking_link_elite: string | null
  google_sheets_url: string | null
  last_synced_at: string | null
}

export const LEVEL_CONFIG: Record<CreatorLevel, { min: number; max: number; target: number | null; color: string; next: CreatorLevel | null }> = {
  Initiation: { min: 0, max: 500, target: 500, color: '#444441', next: 'Foundation' },
  Foundation: { min: 500, max: 5000, target: 5000, color: '#0C447C', next: 'Growth' },
  Growth:     { min: 5000, max: 30000, target: 30000, color: '#085041', next: 'Scale' },
  Scale:      { min: 30000, max: 150000, target: 150000, color: '#3C3489', next: 'Elite' },
  Elite:      { min: 150000, max: 400000, target: null, color: '#633806', next: null },
}

export const LEVEL_BADGE_COLORS: Record<CreatorLevel, { bg: string; text: string }> = {
  Initiation: { bg: '#F1EFE8', text: '#444441' },
  Foundation: { bg: '#E6F1FB', text: '#0C447C' },
  Growth:     { bg: '#E1F5EE', text: '#085041' },
  Scale:      { bg: '#EEEDFE', text: '#3C3489' },
  Elite:      { bg: '#FAEEDA', text: '#633806' },
}

export interface LevelConfig {
  level_name: string
  videos_per_day: number
  hero_products: number
  hero_videos_each: number
  sub_hero_products: number
  sub_hero_videos_each: number
  complementary_videos: number
  winner_videos: number
  has_creative_bank: boolean
  has_deliverables_board: boolean
  has_brand_pipeline: boolean
  has_retainer: boolean
  calls_per_month: number
  call_frequency: string
  has_masterclass: boolean
  has_mastermind: boolean
}

export type ProductType = 'hero' | 'sub_hero' | 'complementary' | 'winner'

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  hero: 'Hero',
  sub_hero: 'Sub-hero',
  complementary: 'Complementary',
  winner: 'Winner',
}

export const PRODUCT_TYPE_COLORS: Record<ProductType, string> = {
  hero: 'bg-pink-100 text-pink-700 border-pink-300',
  sub_hero: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  complementary: 'bg-blue-100 text-blue-700 border-blue-300',
  winner: 'bg-amber-100 text-amber-700 border-amber-300',
}

export interface Deliverable {
  id: string
  creator_id: string
  brand_name: string
  deliverable_type: string
  due_date: string | null
  status: string
  notes: string | null
  created_at: string
}
