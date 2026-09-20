import type { RepoResult } from './types'

const KEY = 'repolens:recent'
export interface RecentRepo { fullName: string; url: string; description: string; analyzedAt: string; language: string | null }

export function getRecent(): RecentRepo[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as RecentRepo[] } catch { return [] }
}

export function saveRecent(result: RepoResult) {
  const item: RecentRepo = { fullName: result.meta.fullName, url: result.meta.url, description: result.meta.description, analyzedAt: result.analyzedAt, language: result.meta.language }
  const next = [item, ...getRecent().filter(x => x.fullName !== item.fullName)].slice(0, 5)
  localStorage.setItem(KEY, JSON.stringify(next))
}
