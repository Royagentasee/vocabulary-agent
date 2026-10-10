/**
 * 账号与云同步
 *
 * 策略：无注册门槛。
 * - 首次访问自动创建「访客账号」，服务端下发一个同步码（VA-XXXX-XXXX）
 * - 学习数据自动同步到服务器，换设备输入同步码即可恢复
 * - 微信登录接口已预留（需后端配置 WECHAT_APPID / WECHAT_SECRET）
 */
import { config, fetchWithFallback } from '../config'

export interface UserProfile {
  id: string
  syncCode: string
  provider: 'anon' | 'wechat'
  nickname: string
  avatar: string
  createdAt: string
  lastSeen: string
}

const USER_KEY = 'va-user'

export function getLocalUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

export function setLocalUser(u: UserProfile | null): void {
  try {
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
}

async function call(path: string, init: RequestInit = {}): Promise<any> {
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, directUrl, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!resp.ok) {
    let detail = ''
    try {
      const j = await resp.json()
      detail = j?.detail || ''
    } catch {
      /* ignore */
    }
    throw new Error(detail || `请求失败 ${resp.status}`)
  }
  return resp.json()
}

/** 确保本地有一个账号；没有就自动注册一个访客账号 */
export async function ensureAccount(): Promise<UserProfile> {
  const local = getLocalUser()
  if (local?.id) {
    // 后台校验一下账号是否还在（失败也不阻塞使用）
    try {
      const u = await call(`/api/user/${encodeURIComponent(local.id)}`)
      setLocalUser(u)
      return u
    } catch {
      return local
    }
  }
  const r = await call('/api/user/register', {
    method: 'POST',
    body: JSON.stringify({ invite_code: takeInviteCode() }),
  })
  const user: UserProfile = r.user
  setLocalUser(user)
  return user
}

/** 拉取云端学习数据 */
export async function pullState(userId: string): Promise<{ data: any; version: number }> {
  const r = await call(`/api/user/${encodeURIComponent(userId)}/state`)
  return { data: r.data || {}, version: r.version || 0 }
}

/** 上传学习数据 */
export async function pushState(
  userId: string,
  data: any,
  baseVersion: number,
): Promise<{ version: number; conflict: boolean }> {
  const r = await call(`/api/user/${encodeURIComponent(userId)}/state`, {
    method: 'PUT',
    body: JSON.stringify({ userId, data, baseVersion }),
  })
  return { version: r.version || 0, conflict: !!r.conflict }
}

/** 用同步码在另一台设备恢复 */
export async function restoreByCode(
  code: string,
): Promise<{ user: UserProfile; data: any; version: number }> {
  const r = await call('/api/user/restore', {
    method: 'POST',
    body: JSON.stringify({ syncCode: code.trim() }),
  })
  return { user: r.user, data: r.data || {}, version: r.version || 0 }
}

/** 重新生成同步码（旧码作废） */
export async function regenerateSyncCode(userId: string): Promise<string> {
  const r = await call(`/api/user/${encodeURIComponent(userId)}/new-sync-code`, { method: 'POST' })
  return r.syncCode
}

/** 微信登录是否已配置 */
export async function wechatStatus(): Promise<{ configured: boolean; hint: string }> {
  try {
    return await call('/api/user/wechat/status')
  } catch {
    return { configured: false, hint: '' }
  }
}

/** 微信登录（需后端已配置） */
export async function wechatLogin(code: string): Promise<UserProfile> {
  const r = await call('/api/user/wechat/login', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  setLocalUser(r.user)
  return r.user
}

/* ---------------- 合并策略 ---------------- */

/** 合并本地与云端学习数据：取并集，同一张卡片取复习时间更晚的 */
export function mergeLearnState(local: any, remote: any): any {
  const out: any = { ...(remote || {}), ...(local || {}) }

  // 已学词：按 word.id 并集，卡片取 lastReview 更晚的
  const lm = new Map<string, any>()
  for (const item of remote?.learnedWords || []) {
    if (item?.word?.id != null) lm.set(String(item.word.id), item)
  }
  for (const item of local?.learnedWords || []) {
    const id = item?.word?.id != null ? String(item.word.id) : ''
    if (!id) continue
    const prev = lm.get(id)
    const t = (x: any) => (x?.card?.lastReview ? Date.parse(x.card.lastReview) : 0)
    if (!prev || t(item) >= t(prev)) lm.set(id, item)
  }
  out.learnedWords = [...lm.values()]

  // 错词本：按 word.id 并集，错误次数取较大值
  const wm = new Map<string, any>()
  for (const item of remote?.wrongWords || []) {
    if (item?.word?.id != null) wm.set(String(item.word.id), item)
  }
  for (const item of local?.wrongWords || []) {
    const id = item?.word?.id != null ? String(item.word.id) : ''
    if (!id) continue
    const prev = wm.get(id)
    if (!prev) wm.set(id, item)
    else wm.set(id, { ...prev, wrongCount: Math.max(prev.wrongCount || 0, item.wrongCount || 0) })
  }
  out.wrongWords = [...wm.values()]

  // 计数取较大值
  out.todayLearned = Math.max(local?.todayLearned || 0, remote?.todayLearned || 0)
  out.todayReviewed = Math.max(local?.todayReviewed || 0, remote?.todayReviewed || 0)
  // 设置项以本地为准（用户刚改过）
  out.dailyGoal = local?.dailyGoal ?? remote?.dailyGoal ?? 20

  return out
}

/* ============ 邀请奖励 ============ */

const INVITE_KEY = 'va-invite-code'

/** 记住别人分享的邀请码（注册时消费一次） */
export function saveInviteCode(code: string): void {
  try {
    const c = (code || '').trim().toUpperCase()
    if (c) localStorage.setItem(INVITE_KEY, c)
  } catch {
    /* ignore */
  }
}

/** 取出邀请码（取完即删，只用于注册那一次） */
export function takeInviteCode(): string {
  try {
    const c = localStorage.getItem(INVITE_KEY) || ''
    if (c) localStorage.removeItem(INVITE_KEY)
    return c
  } catch {
    return ''
  }
}

/** 领取服务端挂账的积分（邀请奖励），返回领到的数量 */
export async function claimPendingPoints(userId: string): Promise<number> {
  try {
    const r = await call(`/api/user/${encodeURIComponent(userId)}/pending`)
    return Number(r?.points) || 0
  } catch {
    return 0
  }
}

export interface ReferralStats {
  inviteCode: string
  invitedCount: number
  earned: number
  inviterReward: number
  inviteeReward: number
}

export async function fetchReferralStats(userId: string): Promise<ReferralStats> {
  try {
    return await call(`/api/user/${encodeURIComponent(userId)}/referral`)
  } catch {
    return { inviteCode: '', invitedCount: 0, earned: 0, inviterReward: 100, inviteeReward: 50 }
  }
}
