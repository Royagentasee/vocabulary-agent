/**
 * 学习计划 Store：每日打卡 + 考试倒计时 + 每日任务
 *
 * - checkinDates：打卡日期集合（YYYY-MM-DD，本地时区），用于算连续天数
 * - 考试信息：类型 / 日期 / 目标分，用于倒计时与任务量
 * - taskDone：每天完成了哪些任务
 *
 * 数据通过 accountStore 一起同步到云端。
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ExamType = 'IELTS' | 'TOEFL' | 'GRE' | 'SAT' | 'CET6' | 'OTHER' | ''

export interface DailyTask {
  id: string
  label: string
  emoji: string
  /** 默认每日目标数量（0 表示不计数量、只看完成） */
  defaultCount: number
}

export const TASKS: DailyTask[] = [
  { id: 'newWords', label: '学新词', emoji: '📖', defaultCount: 20 },
  { id: 'review', label: '复习旧词', emoji: '🔄', defaultCount: 20 },
  { id: 'listening', label: '听力', emoji: '🎧', defaultCount: 1 },
  { id: 'speaking', label: '口语跟读', emoji: '🎙️', defaultCount: 1 },
  { id: 'dialogue', label: '对话练习', emoji: '💬', defaultCount: 1 },
  { id: 'reading', label: '阅读', emoji: '📰', defaultCount: 1 },
  { id: 'writing', label: '写作', emoji: '✍️', defaultCount: 1 },
  { id: 'library', label: '书库阅读', emoji: '📚', defaultCount: 1 },
]

export const EXAM_LABEL: Record<string, string> = {
  IELTS: '雅思',
  TOEFL: '托福',
  GRE: 'GRE',
  SAT: 'SAT',
  CET6: '六级',
  OTHER: '其他',
}

/** 本地时区的 YYYY-MM-DD */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + delta)
  return todayKey(dt)
}

/** 当前连续打卡天数（今天没打卡则从昨天往前算，不立刻断） */
export function currentStreak(dates: string[]): number {
  const set = new Set(dates)
  const today = todayKey()
  let cursor = set.has(today) ? today : shiftDay(today, -1)
  if (!set.has(cursor)) return 0
  let n = 0
  while (set.has(cursor)) {
    n++
    cursor = shiftDay(cursor, -1)
  }
  return n
}

export function longestStreak(dates: string[]): number {
  const sorted = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of sorted) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** 本月打卡天数 */
export function monthCheckins(dates: string[], ref: Date = new Date()): number {
  const prefix = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
  return new Set(dates.filter((d) => d.startsWith(prefix))).size
}

/** 距考试还有多少天（负数=已过） */
export function daysUntil(examDate: string): number | null {
  if (!examDate) return null
  const [y, m, d] = examDate.split('-').map(Number)
  if (!y || !m || !d) return null
  const target = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

interface PlanState {
  checkinDates: string[]
  examType: ExamType
  examDate: string
  targetScore: string
  /** 'YYYY-MM-DD' -> 已完成的任务 id 列表 */
  taskDone: Record<string, string[]>
  /** 每日任务目标数量（可自定义） */
  taskTargets: Record<string, number>

  checkin: (date?: string) => void
  setExam: (v: { type?: ExamType; date?: string; target?: string }) => void
  toggleTask: (taskId: string, date?: string) => void
  completeTask: (taskId: string, date?: string) => void
  setTaskTarget: (taskId: string, count: number) => void
  clearPlan: () => void
  /** 供云同步使用：整体替换（已合并过的数据） */
  applyRemote: (remote: any) => void
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      checkinDates: [],
      examType: '',
      examDate: '',
      targetScore: '',
      taskDone: {},
      taskTargets: {},

      checkin: (date) => {
        const key = date || todayKey()
        const cur = get().checkinDates
        if (cur.includes(key)) return
        set({ checkinDates: [...cur, key].sort() })
      },

      setExam: (v) => {
        const next: any = {}
        if (v.type !== undefined) next.examType = v.type
        if (v.date !== undefined) next.examDate = v.date
        if (v.target !== undefined) next.targetScore = v.target
        set(next)
      },

      toggleTask: (taskId, date) => {
        const key = date || todayKey()
        const all = { ...get().taskDone }
        const list = all[key] || []
        all[key] = list.includes(taskId) ? list.filter((x) => x !== taskId) : [...list, taskId]
        set({ taskDone: all })
        // 有任何任务完成即视为当天打卡
        if (all[key].length > 0) get().checkin(key)
      },

      completeTask: (taskId, date) => {
        const key = date || todayKey()
        const all = { ...get().taskDone }
        const list = all[key] || []
        if (!list.includes(taskId)) {
          all[key] = [...list, taskId]
          set({ taskDone: all })
        }
        get().checkin(key)
      },

      setTaskTarget: (taskId, count) => {
        set({ taskTargets: { ...get().taskTargets, [taskId]: count } })
      },

      clearPlan: () => set({ examType: '', examDate: '', targetScore: '', taskDone: {} }),

      applyRemote: (remote) => {
        if (!remote || typeof remote !== 'object') return
        const local = get()

        // 打卡日期取并集
        const dates = [...new Set([...(local.checkinDates || []), ...(remote.checkinDates || [])])].sort()

        // 每日任务取并集
        const done: Record<string, string[]> = { ...(remote.taskDone || {}) }
        for (const [k, v] of Object.entries(local.taskDone || {})) {
          done[k] = [...new Set([...(done[k] || []), ...(v as string[])])]
        }

        // 考试信息：本地已设置则以本地为准（用户刚改过）
        const exam = remote.exam || {}
        set({
          checkinDates: dates,
          taskDone: done,
          examType: local.examType || exam.type || '',
          examDate: local.examDate || exam.date || '',
          targetScore: local.targetScore || exam.target || '',
        })
      },
    }),
    { name: 'vocab-agent-plan', version: 1 },
  ),
)
