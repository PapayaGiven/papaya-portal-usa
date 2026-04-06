import { CreatorLevel } from './types'

export function canSeeCampaigns(level: CreatorLevel): boolean {
  return level !== 'Initiation'
}

export function canSeeLeaderboard(level: CreatorLevel): boolean {
  return level !== 'Initiation'
}

export function canSeeHashtags(level: CreatorLevel): boolean {
  return level === 'Pro' || level === 'Elite'
}

export function canSeeExampleVideos(level: CreatorLevel): boolean {
  return level === 'Pro' || level === 'Elite'
}

export function hasAccountManager(level: CreatorLevel): boolean {
  return level === 'Pro' || level === 'Elite'
}

export function hasEliteFeatures(level: CreatorLevel): boolean {
  return level === 'Elite'
}

export function getNavLinks(level: CreatorLevel | null): { href: string; label: string }[] {
  const base = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/strategy', label: 'Mi Estrategia' },
    { href: '/products', label: 'Productos' },
    { href: '/progress', label: 'Mi Progreso' },
    { href: '/rewards', label: 'Recompensas' },
  ]

  if (!level || level === 'Initiation') return base

  return [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/strategy', label: 'Mi Estrategia' },
    { href: '/products', label: 'Productos' },
    { href: '/campaigns', label: 'Campañas' },
    { href: '/leaderboard', label: 'Ranking' },
    { href: '/progress', label: 'Mi Progreso' },
    { href: '/rewards', label: 'Recompensas' },
  ]
}

export const LEVEL_ORDER: CreatorLevel[] = ['Initiation', 'Rising', 'Pro', 'Elite']

export function getLevelIndex(level: CreatorLevel): number {
  return LEVEL_ORDER.indexOf(level)
}

export function isHigherLevel(a: CreatorLevel, b: CreatorLevel): boolean {
  return getLevelIndex(a) > getLevelIndex(b)
}
