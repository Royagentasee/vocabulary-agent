/**
 * 学习周报统计
 *
 * 数据全部来自本地 store（云端已同步）：
 * - learnedWords.learnedAt  → 逐日新学词数
 * - learnedWords.card.lastReview → 逐日复习数
 * - planStore.checkinDates / taskDone → 打卡与任务
 * - pointsStore.history（带时间戳）→ 各模块活跃度与积分
 */
import { useLearnStore } from '@/stores/learnStore'
import { usePlanStore, todayKey, currentStreak, TASKS } from '@/stores/planStore'
import { usePointsStore, POINT_RULES, type PointReason } from '@/stores/pointsStore'

const WEEK_LABEL = ['日', '一', '二', '三', '四', '五', '六']

export interface DayStat {
  date: string
  label: string
  isToday: boolean
  newWords: number
  reviews: number
  tasks: number
  points: number
  checkedIn: boolean
}

export interface ModuleStat {
  reason: string
  label: string
  emoji: string
  count: number
  points: number
  pct: number
}

export interface WeeklyReport {
  days: DayStat[]
  totals: {
    activeDays: number
    newWords: number
    reviews: number
    tasks: number
    points: number
    checkins: number
    streak: number
  }
  prev: {
    newWords: number
    reviews: number
    points: number
  }
  delta: {
    newWords: number      // 百分比，正=增长
    reviews: number
    points: number
  }
  modules: ModuleStat[]
  weakPoints: string[]
  totalLearned: number
  wrongCount: number
  dueCount: number
}

function dayKeyOf(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return todayKey(d)
}

/** 生成最近 n 天的日期键（含今天） */
function recentDays(n: number): string[] {
  const out: string[] = []
  const today = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    out.push(todayKey(d))
  }
  return out
}

function pct(cur: number, prev: number): number {
  if (prev <= 0) return cur > 0 ? 100 : 0
  return Math.round(((cur - prev) / prev) * 100)
}

export function buildWeeklyReport(): WeeklyReport {
  const learn = useLearnStore.getState()
  const plan = usePlanStore.getState()
  const pts = usePointsStore.getState()

  const thisWeek = recentDays(7)
  const lastWeek = recentDays(14).slice(0, 7)

  // 逐日新词 / 复习
  const newByDay: Record<string, number> = {}
  const revByDay: Record<string, number> = {}
  for (const item of learn.learnedWords || []) {
    const k = dayKeyOf(item.learnedAt)
    if (k) newByDay[k] = (newByDay[k] || 0) + 1
    const rk = dayKeyOf(item.card?.lastReview)
    if (rk) revByDay[rk] = (revByDay[rk] || 0) + 1
  }

  // 逐日积分（来自带时间戳的历史）
  const ptsByDay: Record<string, number> = {}
  const reasonAgg: Record<string, { count: number; points: number }> = {}
  for (const h of pts.history || []) {
    const k = todayKey(new Date(h.ts))
    if (h.delta > 0) ptsByDay[k] = (ptsByDay[k] || 0) + h.delta
    if (h.delta > 0 && h.reason !== 'checkin' && h.reason !== 'redeem') {
      const a = reasonAgg[h.reason] || { count: 0, points: 0 }
      a.points += h.delta
      a.count += 1
      reasonAgg[h.reason] = a
    }
  }

  const days: DayStat[] = thisWeek.map((date) => {
    const d = new Date(date + 'T00:00:00')
    const tasks = (plan.taskDone[date] || []).length
    const newWords = newByDay[date] || 0
    const reviews = revByDay[date] || 0
    const points = ptsByDay[date] || 0
    return {
      date,
      label: WEEK_LABEL[d.getDay()],
      isToday: date === todayKey(),
      newWords,
      reviews,
      tasks,
      points,
      checkedIn: plan.checkinDates.includes(date),
    }
  })

  const sum = (arr: DayStat[], key: keyof DayStat) =>
    arr.reduce((a, d) => a + (Number(d[key]) || 0), 0)

  const totals = {
    activeDays: days.filter((d) => d.newWords > 0 || d.reviews > 0 || d.tasks > 0 || d.checkedIn).length,
    newWords: sum(days, 'newWords'),
    reviews: sum(days, 'reviews'),
    tasks: sum(days, 'tasks'),
    points: sum(days, 'points'),
    checkins: days.filter((d) => d.checkedIn).length,
    streak: currentStreak(plan.checkinDates),
  }

  const prev = {
    newWords: lastWeek.reduce((a, k) => a + (newByDay[k] || 0), 0),
    reviews: lastWeek.reduce((a, k) => a + (revByDay[k] || 0), 0),
    points: lastWeek.reduce((a, k) => a + (ptsByDay[k] || 0), 0),
  }

  // 模块分布（按积分历史）
  const totalModulePoints = Object.values(reasonAgg).reduce((a, b) => a + b.points, 0) || 1
  const modules: ModuleStat[] = Object.entries(reasonAgg)
    .map(([reason, v]) => {
      const rule: any = POINT_RULES[reason as PointReason]
      return {
        reason,
        label: rule?.label || reason,
        emoji: rule?.emoji || '📌',
        count: v.count,
        points: v.points,
        pct: Math.round((v.points / totalModulePoints) * 100),
      }
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 8)

  // 薄弱项提示
  const weakPoints: string[] = []
  const daysSince = (ds: string[]) => {
    if (!ds.length) return 999
    const last = ds.sort().slice(-1)[0]
    const [y, m, d] = last.split('-').map(Number)
    const t = new Date(y, (m || 1) - 1, d || 1)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    t.setHours(0, 0, 0, 0)
    return Math.round((today.getTime() - t.getTime()) / 86400000)
  }

  const moduleDays = (reason: string) =>
    Object.keys(ptsByDay).length
      ? (pts.history || [])
          .filter((h) => h.reason === reason)
          .map((h) => todayKey(new Date(h.ts)))
      : []

  for (const t of TASKS) {
    const reasonMap: Record<string, string> = {
      listening: 'listening_placeholder',
      speaking: 'speaking_practice',
      reading: 'library_open',
    }
    const r = reasonMap[t.id]
    if (r) {
      const gap = daysSince(moduleDays(r))
      if (gap >= 5 && gap < 999) weakPoints.push(`${t.label}已经 ${gap} 天没练了`)
    }
  }

  if (learn.wrongWords.length >= 10) {
    weakPoints.push(`错题本还有 ${learn.wrongWords.length} 个词没掌握，建议优先复习`)
  }

  const due = (learn.learnedWords || []).filter((l) => {
    if (!l.card?.lastReview) return true
    const dueAt = new Date(new Date(l.card.lastReview).getTime() + l.card.scheduledDays * 86400000)
    return dueAt <= new Date()
  }).length
  if (due > 0) weakPoints.push(`有 ${due} 个词到了复习时间`)

  if (totals.activeDays <= 2) weakPoints.push('本周只学了 2 天，坚持每天来效果更好')

  return {
    days,
    totals,
    prev,
    delta: {
      newWords: pct(totals.newWords, prev.newWords),
      reviews: pct(totals.reviews, prev.reviews),
      points: pct(totals.points, prev.points),
    },
    modules,
    weakPoints: weakPoints.slice(0, 4),
    totalLearned: (learn.learnedWords || []).length,
    wrongCount: learn.wrongWords.length,
    dueCount: due,
  }
}
