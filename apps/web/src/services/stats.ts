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
}

export async function fetchOverview(days = 14): Promise<Overview> {
  const resp = await fetch(endpoint(`/api/stats/overview?days=${days}`))
  if (!resp.ok) throw new Error(`统计加载失败 ${resp.status}`)
  return resp.json()
}
