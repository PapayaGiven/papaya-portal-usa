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
    { href: '/strategy', label: 'My Strategy' },
    { href: '/products', label: 'Products' },
    { href: '/progress', label: 'Progress' },
    { href: '/rewards', label: 'Rewards' },
  ]

  if (!level || level === 'Initiation') return base

  return [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/strategy', label: 'My Strategy' },
    { href: '/products', label: 'Products' },
    { href: '/campaigns', label: 'Campaigns' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/progress', label: 'Progress' },
    { href: '/rewards', label: 'Rewards' },
  ]
}

export const LEVEL_ORDER: CreatorLevel[] = ['Initiation', 'Rising', 'Pro', 'Elite']

export function getLevelIndex(level: CreatorLevel): number {
  return LEVEL_ORDER.indexOf(level)
}

export function isHigherLevel(a: CreatorLevel, b: CreatorLevel): boolean {
  return getLevelIndex(a) > getLevelIndex(b)
}
