/**
 * 用户使用统计
 *
 * 隐私说明：只生成一个随机设备 ID 存在本地，用于统计「有多少台设备在用」，
 * 不采集任何个人身份信息，也不做跨站追踪。
 */
import { config } from '../config'
import { usePathStore, type ActivityType } from '@/stores/pathStore'

const DEVICE_KEY = 'va-device-id'

/**
 * 事件 → 学习路径进度 的映射
 * 集中在这里转换，各页面只管照常埋点，不用关心路径逻辑。
 */
const PATH_ACTIVITY: Record<string, ActivityType> = {
  listening_practice: 'listening',
  speaking_practice: 'speaking',
  dialogue_turn: 'dialogue',
  reading_done: 'reading',
  library_chapter: 'library',
  photo_translate: 'photo',
  writing_generate: 'writing',
}

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
  // 顺带记入学习路径进度（learn / review 走 App 里的订阅，不在这里）
  const activity = PATH_ACTIVITY[event]
  if (activity) {
    try {
      usePathStore.getState().reportActivity(activity)
    } catch {
      /* ignore */
    }
  }

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
const ADMIN_TOKEN_KEY = 'va-admin-token'

/** 是否为作者模式（本地开关，仅用于显示管理入口） */
export function isAdmin(): boolean {
  try {
    return localStorage.getItem(ADMIN_KEY) === '1' || !!localStorage.getItem(ADMIN_TOKEN_KEY)
  } catch {
    return false
  }
}

/**
 * 作者密钥：由服务端 ADMIN_TOKEN 环境变量设定。
 * 带上它请求会完全跳过 AI 额度限制。
 * 用法：`?admin=<密钥>` 开启一次即可长期保存；`?admin=0` 清除。
 */
export function getAdminToken(): string {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setAdminToken(token: string): void {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token)
    else localStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * 切换作者模式。
 * 用法：`?admin=1` 仅开启管理页；`?admin=<密钥>` 额外解锁无限 AI；`?admin=0` 关闭。
 */
export function setAdmin(on: boolean, token = ''): void {
  try {
    if (on) {
      localStorage.setItem(ADMIN_KEY, '1')
      if (token) setAdminToken(token)
    } else {
      localStorage.removeItem(ADMIN_KEY)
      setAdminToken('')
    }
  } catch {
    /* ignore */
  }
}
