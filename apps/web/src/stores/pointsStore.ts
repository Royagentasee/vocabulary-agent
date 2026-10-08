/**
 * 积分与会员
 *
 * 规则设计思路：让「每天坚持」比「一次学很多」更划算 —— 打卡和连续天数占大头，
 * 单次学习有每日上限，避免刷分。
 *
 * 数据通过 accountStore 一起同步到云端。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PointRecord {
  ts: number
  delta: number
  reason: string
  detail?: string
}

/** 赚积分的规则 */
export const POINT_RULES = {
  checkin: { points: 5, dailyCap: 5, label: '每日打卡', emoji: '📅' },
  learn: { points: 1, dailyCap: 30, label: '学习新词', emoji: '📖', per: '词' },
  review: { points: 1, dailyCap: 20, label: '复习旧词', emoji: '🔄', per: '词' },
  task: { points: 3, dailyCap: 18, label: '完成每日任务', emoji: '✅', per: '项' },
  allTasks: { points: 10, dailyCap: 10, label: '完成全部任务', emoji: '🎯' },
  firstModule: { points: 10, dailyCap: 100, label: '首次体验新模块', emoji: '🎁' },
  streak7: { points: 20, dailyCap: 20, label: '连续打卡 7 天', emoji: '🔥' },
  streak30: { points: 100, dailyCap: 100, label: '连续打卡 30 天', emoji: '🏆' },
} as const

export type PointReason = keyof typeof POINT_RULES

/** 会员兑换方案 */
export const MEMBER_PLANS = [
  { days: 7, cost: 500, label: '7 天', unit: '体验' },
  { days: 30, cost: 1800, label: '30 天', unit: '推荐', hot: true },
  { days: 90, cost: 4800, label: '90 天', unit: '超值' },
]

/** 会员特权 */
export const MEMBER_PERKS = [
  { emoji: '🏅', title: '专属会员徽章', desc: '全站显示会员标识' },
  { emoji: '✨', title: '积分获取 ×1.5', desc: '会员期间所有积分提升 50%' },
  { emoji: '📊', title: '详细学习周报', desc: '逐日趋势与薄弱项分析' },
  { emoji: '🎁', title: '新功能优先体验', desc: '新模块上线第一时间开放' },
]

/** 可解锁的模块（首次体验送分） */
export const MODULES: { id: string; label: string }[] = [
  { id: 'learn', label: '学习新词' },
  { id: 'review', label: '复习' },
  { id: 'listening', label: '听力' },
  { id: 'speaking', label: '口语跟读' },
  { id: 'dialogue', label: '对话陪练' },
  { id: 'writing', label: '写作' },
  { id: 'reading', label: '阅读' },
  { id: 'library', label: '书库' },
  { id: 'grammar', label: '语法' },
  { id: 'plan', label: '学习计划' },
]

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface PointsState {
  balance: number
  totalEarned: number
  totalSpent: number
  history: PointRecord[]
  /** 'YYYY-MM-DD' -> { reason: 已获得的积分 }，用于每日上限 */
  dailyEarned: Record<string, Record<string, number>>
  /** 已送过首体验奖励的模块 */
  unlockedModules: string[]
  /** 会员到期日 'YYYY-MM-DD'，空字符串=非会员 */
  memberUntil: string
  /** 上次发放连续打卡奖励时的连续天数 */
  lastStreakBonusAt: number
  /** 上次发放「全部任务完成」的日期 */
  lastAllTaskDate: string
  /** 已发过分的每日任务，格式 'YYYY-MM-DD:taskId'（防止重复给分） */
  awardedTasks: string[]
  /** 各行为的累计次数（成就徽章用），如 {listening: 12, speaking: 5} */
  lifetime: Record<string, number>

  earn: (base: number, reason: PointReason, opts?: {
    detail?: string
    /** 用独立 key 计算上限（比如同时学新词+复习时分开计数） */
    capKey?: string
  }) => number
  /** 每日任务给分（同一任务同一天只给一次） */
  awardTask: (date: string, taskId: string, label: string) => number
  /** 累计次数 +1（成就徽章数据源） */
  bumpLifetime: (key: string, n?: number) => void
  redeem: (days: number, cost: number) => boolean
  unlockModule: (id: string) => number
  /** 打卡天数变化时调用；返回本次获得的积分 */
  syncStreak: (streak: number) => number
  markAllTasks: (date: string) => number
  isMember: () => boolean
  memberDaysLeft: () => number
  earnedToday: (reason: string) => number
  applyRemote: (remote: any) => void
  reset: () => void
}

const MAX_HISTORY = 120

export const usePointsStore = create<PointsState>()(
  persist(
    (set, get) => ({
      balance: 0,
      totalEarned: 0,
      totalSpent: 0,
      history: [],
      dailyEarned: {},
      unlockedModules: [],
      memberUntil: '',
      lastStreakBonusAt: 0,
      lastAllTaskDate: '',
      awardedTasks: [],
      lifetime: {},

      isMember: () => {
        const until = get().memberUntil
        return !!until && until >= dayKey()
      },

      memberDaysLeft: () => {
        const until = get().memberUntil
        if (!until) return 0
        const [y, m, d] = until.split('-').map(Number)
        const target = new Date(y, (m || 1) - 1, d || 1)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        target.setHours(0, 0, 0, 0)
        return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000))
      },

      earnedToday: (reason) => {
        const de = get().dailyEarned[dayKey()] || {}
        return de[reason] || 0
      },

      earn: (base, reason, opts = {}) => {
        if (base <= 0) return 0
        const rule: any = POINT_RULES[reason]
        const today = dayKey()

        // 会员积分加成
        const mult = get().isMember() ? 1.5 : 1
        let amount = Math.round(base * mult)

        // 每日上限
        const capKey = opts.capKey || reason
        const cap = rule?.dailyCap
        if (cap !== undefined) {
          const used = (get().dailyEarned[today] || {})[capKey] || 0
          amount = Math.min(amount, Math.max(0, cap - used))
        }
        if (amount <= 0) return 0

        const de = { ...get().dailyEarned }
        de[today] = { ...(de[today] || {}) }
        de[today][capKey] = (de[today][capKey] || 0) + amount

        const rec: PointRecord = { ts: Date.now(), delta: amount, reason, detail: opts.detail }
        set({
          balance: get().balance + amount,
          totalEarned: get().totalEarned + amount,
          dailyEarned: de,
          history: [rec, ...get().history].slice(0, MAX_HISTORY),
        })
        return amount
      },

      awardTask: (date, taskId, label) => {
        const key = `${date}:${taskId}`
        if (get().awardedTasks.includes(key)) return 0
        // 只保留最近 400 条，避免无限增长
        const next = [...get().awardedTasks, key].slice(-400)
        set({ awardedTasks: next })
        return get().earn(POINT_RULES.task.points, 'task', { capKey: 'task', detail: label })
      },

      bumpLifetime: (key, n = 1) => {
        const cur = get().lifetime || {}
        set({ lifetime: { ...cur, [key]: (cur[key] || 0) + n } })
      },

      redeem: (days, cost) => {
        if (get().balance < cost) return false
        const now = new Date()
        const cur = get().memberUntil
        const from = cur && cur >= dayKey() ? new Date(cur + 'T00:00:00') : now
        const next = new Date(from)
        next.setDate(next.getDate() + days)

        const rec: PointRecord = {
          ts: Date.now(), delta: -cost, reason: 'redeem', detail: `兑换 ${days} 天会员`,
        }
        set({
          balance: get().balance - cost,
          totalSpent: get().totalSpent + cost,
          memberUntil: dayKey(next),
          history: [rec, ...get().history].slice(0, MAX_HISTORY),
        })
        return true
      },

      unlockModule: (id) => {
        if (get().unlockedModules.includes(id)) return 0
        set({ unlockedModules: [...get().unlockedModules, id] })
        return get().earn(POINT_RULES.firstModule.points, 'firstModule', {
          capKey: `mod:${id}`,
          detail: MODULES.find((m) => m.id === id)?.label || id,
        })
      },

      syncStreak: (streak) => {
        const last = get().lastStreakBonusAt
        let gained = 0
        if (streak >= 30 && Math.floor(streak / 30) > Math.floor(Math.max(last, 0) / 30)) {
          gained += get().earn(POINT_RULES.streak30.points, 'streak30', { capKey: `s30:${streak}` })
        }
        if (streak >= 7 && Math.floor(streak / 7) > Math.floor(Math.max(last, 0) / 7)) {
          gained += get().earn(POINT_RULES.streak7.points, 'streak7', { capKey: `s7:${streak}` })
        }
        if (streak > last) set({ lastStreakBonusAt: streak })
        return gained
      },

      markAllTasks: (date) => {
        if (get().lastAllTaskDate === date) return 0
        const gained = get().earn(POINT_RULES.allTasks.points, 'allTasks', { capKey: `all:${date}` })
        if (gained > 0) set({ lastAllTaskDate: date })
        return gained
      },

      applyRemote: (remote) => {
        if (!remote) return
        const local = get()
        const p = remote.points
        if (!p) return

        // 取较大的余额与累计（避免任一端被覆盖）
        const balance = Math.max(local.balance, p.balance || 0)
        const totalEarned = Math.max(local.totalEarned, p.totalEarned || 0)
        // 会员到期日取更晚的
        const memberUntil = (local.memberUntil || '') > (p.memberUntil || '')
          ? local.memberUntil
          : p.memberUntil || ''

        // 每日积分记录取较大值
        const de: Record<string, Record<string, number>> = { ...(p.dailyEarned || {}) }
        for (const [d, m] of Object.entries(local.dailyEarned || {})) {
          de[d] = { ...(de[d] || {}) }
          for (const [k, v] of Object.entries(m as Record<string, number>)) {
            de[d][k] = Math.max(de[d][k] || 0, v)
          }
        }

        set({
          balance,
          totalEarned,
          memberUntil,
          dailyEarned: de,
          unlockedModules: [...new Set([...(local.unlockedModules || []), ...(p.unlockedModules || [])])],
          lastStreakBonusAt: Math.max(local.lastStreakBonusAt || 0, p.lastStreakBonusAt || 0),
          awardedTasks: [...new Set([...(local.awardedTasks || []), ...(p.awardedTasks || [])])].slice(-400),
          lifetime: Object.fromEntries(
            [...new Set([...Object.keys(local.lifetime || {}), ...Object.keys(p.lifetime || {})])]
              .map((k) => [k, Math.max((local.lifetime || {})[k] || 0, (p.lifetime || {})[k] || 0)]),
          ),
        })
      },

      reset: () => set({
        balance: 0, totalEarned: 0, totalSpent: 0, history: [],
        dailyEarned: {}, unlockedModules: [], memberUntil: '',
        lastStreakBonusAt: 0, lastAllTaskDate: '', awardedTasks: [], lifetime: {},
      }),
    }),
    { name: 'vocab-agent-points', version: 1 },
  ),
)

/** 把积分记录转成可读文案 */
export function describeRecord(r: PointRecord): string {
  if (r.reason === 'redeem') return r.detail || '兑换会员'
  const rule: any = POINT_RULES[r.reason as PointReason]
  const label = rule?.label || r.reason
  return r.detail ? `${label} · ${r.detail}` : label
}
