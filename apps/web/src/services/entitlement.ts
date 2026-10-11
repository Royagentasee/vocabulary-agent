/**
 * 会员权限
 *
 * 商业模式：3 天全功能试用 → 之后只有「单词学习 + 书本阅读」免费，
 * 其余模块需要会员（¥9.9/月）。
 */
import { config, fetchWithFallback, getUserId } from '../config'

export interface Entitlement {
  isPro: boolean
  proUntil: string
  trialStartedAt: string
  trialDaysLeft: number
  trialActive: boolean
  trialEnded: boolean
  price: number
  trialDays: number
  isAdmin?: boolean
}

/** 永久免费的路由 —— 单词学习 + 书本阅读 + 基础功能 */
export const FREE_ROUTES = new Set([
  '/', '/path', '/plan', '/points', '/wordbooks', '/learn', '/review',
  '/wrongbook', '/library', '/account', '/support', '/guide', '/badges',
  '/stats', '/upgrade', '/ui', '/admin',
])

/** 需要会员的路由 */
export const PRO_ROUTES = new Set([
  '/listening', '/speaking', '/dialogue', '/writing', '/reading',
  '/photo', '/grammar', '/coach',
])

/** 模块名（付费墙文案用） */
export const ROUTE_LABEL: Record<string, { name: string; emoji: string; desc: string }> = {
  '/listening': { name: '听力精听', emoji: '🎧', desc: '1000 篇托福雅思材料，逐句精听' },
  '/speaking': { name: '口语跟读', emoji: '🎙️', desc: 'AI 帮你纠正发音，标注问题音素' },
  '/dialogue': { name: '对话陪练', emoji: '💬', desc: '和 AI 用英语聊天，实时改语法' },
  '/writing': { name: '写作批改', emoji: '✍️', desc: '307 道官方真题，AI 逐句点评' },
  '/reading': { name: '分级阅读', emoji: '📰', desc: '初中 / 高中 / 大学 + SAT 真题' },
  '/photo': { name: '拍照翻译', emoji: '📷', desc: '拍书上英文，秒变中文' },
  '/grammar': { name: '语法专项', emoji: '📐', desc: '20 个知识点，AI 出题讲解' },
  '/coach': { name: 'AI 学习教练', emoji: '🧠', desc: '看你的数据，给量化备考建议' },
}

export function isProRoute(path: string): boolean {
  return PRO_ROUTES.has(path)
}

function api(path: string): string {
  return config.aiGateway ? `${config.aiGateway}${path}` : path
}

export async function fetchEntitlement(userId?: string): Promise<Entitlement> {
  const uid = userId || getUserId()
  const path = `/api/entitlement?user_id=${encodeURIComponent(uid)}`
  try {
    const resp = await fetchWithFallback(path, api(path), { method: 'GET' })
    if (!resp.ok) throw new Error(String(resp.status))
    return await resp.json()
  } catch {
    // 拿不到就放行，宁可少收钱也别把用户挡在门外
    return {
      isPro: true, proUntil: '', trialStartedAt: '',
      trialDaysLeft: 3, trialActive: true, trialEnded: false,
      price: 9.9, trialDays: 3,
    }
  }
}

export async function redeemCode(code: string): Promise<Entitlement> {
  const uid = getUserId()
  const path = `/api/entitlement/redeem?user_id=${encodeURIComponent(uid)}`
  const resp = await fetchWithFallback(path, api(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error((body as any)?.detail || `兑换失败 ${resp.status}`)
  }
  return resp.json()
}

/** 剩余时间的中文描述 */
export function untilText(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const days = Math.ceil((d.getTime() - Date.now()) / 86400_000)
    if (days <= 0) return '已到期'
    if (days === 1) return '明天到期'
    if (days < 30) return `还剩 ${days} 天`
    return `有效期至 ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return ''
  }
}
