/**
 * 排行榜 API
 */
import { config, fetchWithFallback, getUserId } from '../config'

export interface LeaderboardItem {
  rank: number
  name: string
  points: number
  isMe: boolean
}

export interface LeaderboardResult {
  items: LeaderboardItem[]
  total: number
  period: string
  me: LeaderboardItem | null
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardResult> {
  const uid = getUserId()
  const path = `/api/leaderboard?limit=${limit}${uid ? `&me=${encodeURIComponent(uid)}` : ''}`
  try {
    const resp = await fetchWithFallback(
      path,
      config.aiGateway ? `${config.aiGateway}${path}` : path,
      { method: 'GET' },
    )
    if (!resp.ok) return { items: [], total: 0, period: '最近 7 天', me: null }
    return resp.json()
  } catch {
    return { items: [], total: 0, period: '最近 7 天', me: null }
  }
}
