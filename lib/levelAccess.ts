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

export function getNavLinks(level: CreatorLevel | null): { href: string; label: string }[] {
  const base = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/strategy', label: 'Mi Estrategia' },
    { href: '/products', label: 'Productos' },
    { href: '/mi-progreso', label: 'Mi Progreso' },
    { href: '/violations', label: 'Violaciones' },
  ]

  if (!level || level === 'Initiation') return base

  return [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/strategy', label: 'Mi Estrategia' },
    { href: '/products', label: 'Productos' },
    { href: '/campaigns', label: 'Campañas' },
    { href: '/mi-progreso', label: 'Mi Progreso' },
    { href: '/violations', label: 'Violaciones' },
  ]
}

export const LEVEL_ORDER: CreatorLevel[] = ['Initiation', 'Foundation', 'Growth', 'Scale', 'Elite']

export function getLevelIndex(level: CreatorLevel): number {
  return LEVEL_ORDER.indexOf(level)
}

export function isHigherLevel(a: CreatorLevel, b: CreatorLevel): boolean {
  return getLevelIndex(a) > getLevelIndex(b)
}
