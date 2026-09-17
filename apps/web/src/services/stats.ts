/**
 * 用户使用统计
 *
 * 隐私说明：只生成一个随机设备 ID 存在本地，用于统计「有多少台设备在用」，
 * 不采集任何个人身份信息，也不做跨站追踪。
 */
import { config } from '../config'

const DEVICE_KEY = 'va-device-id'

/** 取（或生成）本机匿名设备 ID */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `d-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}

function endpoint(path: string): string {
  return config.aiGateway ? `${config.aiGateway}${path}` : path
}

/** 上报一个事件（失败静默，绝不影响主流程） */
export function trackEvent(event: string, detail = ''): void {
  try {
    const body = JSON.stringify({ deviceId: getDeviceId(), event, detail })
    fetch(endpoint('/api/stats/track'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}

/** 一次访问（每次页面加载记一次） */
export function trackVisit(): void {
  trackEvent('visit', window.location.pathname)
}

/** 统计总览 */
export interface DailyPoint {
  date: string
  users: number
  visits: number
}

export interface RetentionDay {
  date: string
  newUsers: number
  d1Users: number
  d1Rate: number | null
  d7Users: number
  d7Rate: number | null
}

export interface RetentionStats {
  d1Rate: number
  d1Base: number
  d7Rate: number
  d7Base: number
  daily: RetentionDay[]
}

export interface RecentActivity {
  time: string
  device: string
  platform: string
  event: string
  detail: string
}

export interface Overview {
  totalUsers: number
  todayUsers: number
  weekUsers: number
  monthUsers: number
  onlineNow: number
  totalVisits: number
  todayVisits: number
  totalEvents: number
  daily: DailyPoint[]
  topEvents: { event: string; count: number }[]
  platforms: { name: string; count: number }[]
  retention: RetentionStats
  recent: RecentActivity[]
}

export async function fetchOverview(days = 14): Promise<Overview> {
  const resp = await fetch(endpoint(`/api/stats/overview?days=${days}`))
  if (!resp.ok) throw new Error(`统计加载失败 ${resp.status}`)
  return resp.json()
}

/* ============ 作者（管理）模式 ============ */

const ADMIN_KEY = 'va-admin'

/** 是否为作者模式 */
export function isAdmin(): boolean {
  try {
    return localStorage.getItem(ADMIN_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * 切换作者模式。
 * 用法：在任意页面地址后加 `?admin=1` 开启，`?admin=0` 关闭。
 * 例：http://106.53.41.134/stats?admin=1
 */
export function setAdmin(on: boolean): void {
  try {
    if (on) localStorage.setItem(ADMIN_KEY, '1')
    else localStorage.removeItem(ADMIN_KEY)
  } catch {
    /* ignore */
  }
}
