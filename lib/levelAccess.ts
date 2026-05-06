import { CreatorLevel } from './types'

export function canSeeCampaigns(level: CreatorLevel): boolean {
  return level !== 'Initiation'
}

export function canSeeLeaderboard(level: CreatorLevel): boolean {
  return level !== 'Initiation'
}

export function canSeeHashtags(level: CreatorLevel): boolean {
  return level === 'Growth' || level === 'Scale' || level === 'Elite'
}

export function canSeeExampleVideos(level: CreatorLevel): boolean {
  return level === 'Growth' || level === 'Scale' || level === 'Elite'
}

export function hasAccountManager(level: CreatorLevel): boolean {
  return level === 'Growth' || level === 'Scale' || level === 'Elite'
}

export function hasEliteFeatures(level: CreatorLevel): boolean {
  return level === 'Elite'
}

export function hasDeliverables(level: CreatorLevel): boolean {
  return level === 'Scale' || level === 'Elite'
}

export function hasCreativeBank(level: CreatorLevel): boolean {
  return level === 'Growth' || level === 'Scale' || level === 'Elite'
}

export function getNavLinks(level: CreatorLevel | null): { href: string; label: string }[] {
  const base = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/strategy', label: 'Mi Estrategia' },
    { href: '/products', label: 'Productos' },
    { href: '/mi-progreso', label: 'Mi Progreso' },
    { href: '/mi-crecimiento', label: 'Mi Crecimiento' },
    { href: '/violations', label: 'Violaciones' },
  ]

  if (!level || level === 'Initiation') return base

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/strategy', label: 'Mi Estrategia' },
    { href: '/products', label: 'Productos' },
    { href: '/papaya-picks', label: '🌟 Papaya Picks' },
    { href: '/campaigns', label: 'Campañas' },
    { href: '/mi-progreso', label: 'Mi Progreso' },
    { href: '/mi-crecimiento', label: 'Mi Crecimiento' },
  ]

  if (level === 'Scale' || level === 'Elite') {
    links.push({ href: '/deliverables', label: 'Mis Entregas' })
  }

  links.push({ href: '/violations', label: 'Violaciones' })

  return links
}

export function canSeePapayaPicks(level: CreatorLevel): boolean {
  return level !== 'Initiation'
}

export const LEVEL_ORDER: CreatorLevel[] = ['Initiation', 'Foundation', 'Growth', 'Scale', 'Elite']

export function getLevelIndex(level: CreatorLevel): number {
  return LEVEL_ORDER.indexOf(level)
}

export function isHigherLevel(a: CreatorLevel, b: CreatorLevel): boolean {
  return getLevelIndex(a) > getLevelIndex(b)
}
