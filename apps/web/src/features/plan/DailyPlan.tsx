import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  usePlanStore,
  TASKS,
  EXAM_LABEL,
  todayKey,
  currentStreak,
  longestStreak,
  monthCheckins,
  daysUntil,
} from '@/stores/planStore'
import { useLearnStore } from '@/stores/learnStore'

/** 最近 7 天的打卡状态小条 */
function WeekStrip({ dates }: { dates: string[] }) {
  const set = useMemo(() => new Set(dates), [dates])
  const days = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (6 - i))
      return {
        key: todayKey(d),
        label: '日一二三四五六'[d.getDay()],
        isToday: i === 6,
      }
    })
  }, [])

  return (
    <div className="flex items-end gap-1.5">
      {days.map((d) => {
        const done = set.has(d.key)
        return (
          <div key={d.key} className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                done
                  ? 'bg-orange-500 text-white'
                  : d.isToday
                  ? 'bg-white border-2 border-dashed border-orange-300 text-orange-400'
                  : 'bg-ink-50 text-ink-300'
              }`}
              title={d.key}
            >
              {done ? '✓' : ''}
            </div>
            <span className={`text-[10px] ${d.isToday ? 'text-orange-500 font-semibold' : 'text-ink-400'}`}>
              {d.isToday ? '今天' : d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function DailyPlan() {
  const { checkinDates, examType, examDate, targetScore, taskDone, toggleTask } = usePlanStore()
  const todayLearned = useLearnStore((s) => s.todayLearned)
  const todayReviewed = useLearnStore((s) => s.todayReviewed)
  const dailyGoal = useLearnStore((s) => s.dailyGoal)

  const streak = currentStreak(checkinDates)
  const best = longestStreak(checkinDates)
  const month = monthCheckins(checkinDates)
  const left = daysUntil(examDate)

  const key = todayKey()
  const doneToday = taskDone[key] || []

  /** 任务完成状态：新词/复习按真实数据算，其余按用户勾选 */
  const taskState = TASKS.map((t) => {
    if (t.id === 'newWords') {
      return { ...t, auto: true, current: todayLearned, target: dailyGoal }
    }
    if (t.id === 'review') {
      return { ...t, auto: true, current: todayReviewed, target: dailyGoal }
    }
    return { ...t, auto: false, current: doneToday.includes(t.id) ? 1 : 0, target: 1 }
  })

  const doneCount = taskState.filter((t) =>
    t.auto ? t.current >= t.target : doneToday.includes(t.id),
  ).length

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 打卡 */}
      <section className="va-card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl">🔥</span>
            <div>
              <div className="text-lg sm:text-xl font-semibold leading-tight">
                连续 {streak} 天
              </div>
              <div className="text-xs text-ink-500">
                本月打卡 {month} 天 · 最长纪录 {best} 天
              </div>
            </div>
          </div>
          <Link to="/plan" className="text-xs text-ink-400 hover:text-ink-700 shrink-0">
            打卡日历 ›
          </Link>
        </div>

        <WeekStrip dates={checkinDates} />

        {streak === 0 && (
          <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            今天还没打卡 —— 学 1 个单词就能点亮今天 🔥
          </div>
        )}
      </section>

      {/* 考试倒计时 */}
      {examDate && left !== null ? (
        <section className="va-card flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <div className="text-sm text-ink-500">
                距离{EXAM_LABEL[examType] || '考试'}
                {targetScore && `（目标 ${targetScore}）`}
              </div>
              <div className="text-xl sm:text-2xl font-semibold leading-tight">
                {left > 0 ? `还有 ${left} 天` : left === 0 ? '就是今天！' : `已过 ${-left} 天`}
              </div>
            </div>
          </div>
          <Link to="/plan" className="text-xs text-ink-400 hover:text-ink-700 shrink-0">
            修改 ›
          </Link>
        </section>
      ) : (
        <Link
          to="/plan"
          className="va-card flex items-center justify-between gap-3 hover:border-ink-900 transition-colors active:bg-ink-50"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <div className="text-sm font-medium">设置考试日期</div>
              <div className="text-xs text-ink-500">开启倒计时，每天自动安排任务</div>
            </div>
          </div>
          <span className="text-ink-300">›</span>
        </Link>
      )}

      {/* 今日任务 */}
      <section className="va-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">今日任务</div>
          <div className="text-xs text-ink-500">
            {doneCount}/{taskState.length} 已完成
          </div>
        </div>

        <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(doneCount / taskState.length) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {taskState.map((t) => {
            const done = t.auto ? t.current >= t.target : doneToday.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (!t.auto) toggleTask(t.id)
                }}
                disabled={t.auto}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  done
                    ? 'bg-green-50 text-green-800'
                    : t.auto
                    ? 'bg-ink-50 text-ink-500'
                    : 'bg-ink-50 text-ink-700 active:bg-ink-100'
                }`}
              >
                <span className={`text-base ${done ? '' : 'opacity-40'}`}>
                  {done ? '✅' : t.emoji}
                </span>
                <span className="flex-1">{t.label}</span>
                {t.auto ? (
                  <span className="text-xs text-ink-400">
                    {t.current}/{t.target}
                  </span>
                ) : (
                  <span className="text-xs text-ink-400">{done ? '完成' : '点我打勾'}</span>
                )}
              </button>
            )
          })}
        </div>

        {doneCount === taskState.length && (
          <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 text-center">
            🎉 今日任务全部完成，太棒了！
          </div>
        )}
      </section>
    </div>
  )
}
