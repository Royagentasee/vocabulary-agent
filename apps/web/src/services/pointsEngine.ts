/**
 * 积分引擎：把应用内的行为换算成积分
 *
 * 只做「发放」，规则本身在 stores/pointsStore.ts。
 * 防重复：每日打卡走每日上限、每日任务按 id 记录已发过、全完成只发一次。
 *
 * 注意：每日任务的完成状态现在完全由真实行为推导
 * （plan.activity + 时间戳），不再有手动打勾的 taskDone。
 */
import {
  useLearnStore,
  countTodayLearned,
  countTodayReviewed,
} from '@/stores/learnStore'
import { usePlanStore, TASKS, todayKey, currentStreak } from '@/stores/planStore'
import { usePointsStore, POINT_RULES } from '@/stores/pointsStore'

let started = false

/**
 * 今天已经完成的任务 id 列表。
 *
 * 判定口径必须和 DailyPlan 的显示完全一致，否则会出现
 * 「页面显示完成但没给分」或「没完成却给了分」。
 */
function completedTasks(): string[] {
  const plan = usePlanStore.getState()
  const learn = useLearnStore.getState()
  const today = todayKey()
  const act = plan.activity[today] || {}
  const out: string[] = []

  for (const t of TASKS) {
    const target = plan.taskTargets[t.id] || t.defaultCount || 1
    let cur = 0
    if (t.id === 'newWords') {
      cur = countTodayLearned(learn.learnedWords)
    } else if (t.id === 'review') {
      cur = countTodayReviewed(learn.learnedWords)
    } else {
      cur = act[t.id] || 0
    }
    if (cur >= target) out.push(t.id)
  }
  return out
}

/** 统一结算：打卡 + 逐项任务 + 全完成 */
function settle(): void {
  const plan = usePlanStore.getState()
  const pts = usePointsStore.getState()
  const today = todayKey()

  // 打卡分（每日上限保证一天只给一次）
  if (plan.checkinDates.includes(today)) {
    pts.earn(POINT_RULES.checkin.points, 'checkin')
    pts.syncStreak(currentStreak(plan.checkinDates))
  }

  // 逐项任务奖励（awardTask 内部按 id 去重，重复调用安全）
  const done = completedTasks()
  for (const id of done) {
    const t = TASKS.find((x) => x.id === id)
    if (t) pts.awardTask(today, id, t.label)
  }

  // 全部完成
  if (done.length >= TASKS.length) pts.markAllTasks(today)
}

export function startPointsEngine(): void {
  if (started) return
  started = true

  /* ---------- 1. 学习 / 复习：按增量给分 ---------- */
  let lastLearned = useLearnStore.getState().todayLearned
  let lastReviewed = useLearnStore.getState().todayReviewed

  useLearnStore.subscribe((s) => {
    // 跨天时今日计数被清零，基准同步归零，避免算出负数
    if (s.todayLearned < lastLearned) lastLearned = 0
    if (s.todayReviewed < lastReviewed) lastReviewed = 0

    const dL = s.todayLearned - lastLearned
    const dR = s.todayReviewed - lastReviewed
    const pts = usePointsStore.getState()

    if (dL > 0) {
      pts.unlockModule('learn')
      pts.earn(dL * POINT_RULES.learn.points, 'learn')
      lastLearned = s.todayLearned
    }
    if (dR > 0) {
      pts.unlockModule('review')
      pts.earn(dR * POINT_RULES.review.points, 'review')
      lastReviewed = s.todayReviewed
    }
  })

  /* ---------- 2. 打卡 / 每日任务 / 连续天数 ---------- */
  usePlanStore.subscribe(settle)
  useLearnStore.subscribe(settle)
  settle()
}

/** 手动触发一次结算（比如进入积分页时） */
export function evaluatePoints(): void {
  settle()
}
