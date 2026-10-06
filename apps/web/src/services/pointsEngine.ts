/**
 * 积分引擎：把应用内的行为换算成积分
 *
 * 只做「发放」，规则本身在 stores/pointsStore.ts。
 * 防重复：每日打卡走每日上限、每日任务记录已发过的 key、首次体验记录已解锁模块。
 */
import { useLearnStore } from '@/stores/learnStore'
import { usePlanStore, TASKS, todayKey, currentStreak } from '@/stores/planStore'
import { usePointsStore, POINT_RULES } from '@/stores/pointsStore'

let started = false

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
  const evaluate = () => {
    const plan = usePlanStore.getState()
    const learn = useLearnStore.getState()
    const pts = usePointsStore.getState()
    const today = todayKey()

    // 打卡分（每日上限保证一天只给一次）
    if (plan.checkinDates.includes(today)) {
      pts.earn(POINT_RULES.checkin.points, 'checkin')
      pts.syncStreak(currentStreak(plan.checkinDates))
    }

    // 每日任务：手动项完成即给分
    const done = plan.taskDone[today] || []
    for (const id of done) {
      const t = TASKS.find((x) => x.id === id)
      if (t) pts.awardTask(today, id, t.label)
    }

    // 全部任务完成
    const autoDone =
      (learn.todayLearned >= learn.dailyGoal ? 1 : 0) +
      (learn.todayReviewed >= learn.dailyGoal ? 1 : 0)
    if (autoDone + done.length >= TASKS.length) {
      pts.markAllTasks(today)
    }
  }

  usePlanStore.subscribe(evaluate)
  useLearnStore.subscribe(evaluate)
  evaluate()
}

/** 手动触发一次结算（比如进入积分页时） */
export function evaluatePoints(): void {
  const plan = usePlanStore.getState()
  const learn = useLearnStore.getState()
  const pts = usePointsStore.getState()
  const today = todayKey()

  if (plan.checkinDates.includes(today)) {
    pts.earn(POINT_RULES.checkin.points, 'checkin')
    pts.syncStreak(currentStreak(plan.checkinDates))
  }
  const done = plan.taskDone[today] || []
  for (const id of done) {
    const t = TASKS.find((x) => x.id === id)
    if (t) pts.awardTask(today, id, t.label)
  }
  const autoDone =
    (learn.todayLearned >= learn.dailyGoal ? 1 : 0) +
    (learn.todayReviewed >= learn.dailyGoal ? 1 : 0)
  if (autoDone + done.length >= TASKS.length) pts.markAllTasks(today)
}
