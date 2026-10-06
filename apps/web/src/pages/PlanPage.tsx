import { useMemo, useState } from 'react'
import {
  usePlanStore,
  TASKS,
  EXAM_LABEL,
  ExamType,
  todayKey,
  currentStreak,
  longestStreak,
  monthCheckins,
  daysUntil,
} from '@/stores/planStore'
import { useLearnStore } from '@/stores/learnStore'
import { trackEvent } from '@/services/stats'

const EXAM_OPTIONS: { id: ExamType; label: string }[] = [
  { id: 'IELTS', label: '雅思' },
  { id: 'TOEFL', label: '托福' },
  { id: 'GRE', label: 'GRE' },
  { id: 'SAT', label: 'SAT' },
  { id: 'CET6', label: '六级' },
  { id: 'OTHER', label: '其他' },
]

/** 月历：标出打卡的日子 */
function MonthCalendar({ dates, cursor, onShift }: {
  dates: string[]
  cursor: Date
  onShift: (delta: number) => void
}) {
  const set = useMemo(() => new Set(dates), [dates])
  const today = todayKey()

  const { cells, title } = useMemo(() => {
    const y = cursor.getFullYear()
    const m = cursor.getMonth()
    const first = new Date(y, m, 1)
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const lead = first.getDay()      // 周日=0
    const arr: (string | null)[] = Array(lead).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      arr.push(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return { cells: arr, title: `${y} 年 ${m + 1} 月` }
  }, [cursor])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button onClick={() => onShift(-1)} className="px-2 py-1 text-ink-400 hover:text-ink-900">
          ‹
        </button>
        <div className="text-sm font-medium">{title}</div>
        <button onClick={() => onShift(1)} className="px-2 py-1 text-ink-400 hover:text-ink-900">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-ink-400">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((key, i) =>
          key === null ? (
            <div key={`e${i}`} />
          ) : (
            <div
              key={key}
              title={key}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs ${
                set.has(key)
                  ? 'bg-orange-500 text-white font-medium'
                  : key === today
                  ? 'border-2 border-dashed border-orange-300 text-orange-400'
                  : 'bg-ink-50 text-ink-400'
              }`}
            >
              {Number(key.slice(-2))}
            </div>
          ),
        )}
      </div>
    </div>
  )
}

export function PlanPage() {
  const {
    checkinDates, examType, examDate, targetScore, taskTargets,
    setExam, setTaskTarget, clearPlan, checkin,
  } = usePlanStore()
  const dailyGoal = useLearnStore((s) => s.dailyGoal)

  const [cursor, setCursor] = useState(() => new Date())
  const [editExam, setEditExam] = useState(false)
  const [form, setForm] = useState({
    type: (examType || 'IELTS') as ExamType,
    date: examDate,
    target: targetScore,
  })

  const streak = currentStreak(checkinDates)
  const best = longestStreak(checkinDates)
  const month = monthCheckins(checkinDates)
  const left = daysUntil(examDate)
  const totalCheckins = new Set(checkinDates).size

  const saveExam = () => {
    setExam({ type: form.type, date: form.date, target: form.target })
    setEditExam(false)
    trackEvent('plan_set_exam', `${form.type}:${form.date}`)
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-2xl">
      <header>
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">学习计划</h1>
        <p className="text-ink-500 mt-1.5 text-sm">打卡、考试倒计时、每日任务</p>
      </header>

      {/* 概览 */}
      <section className="grid grid-cols-4 gap-2">
        {[
          { label: '连续', value: streak, unit: '天', emoji: '🔥' },
          { label: '本月', value: month, unit: '天', emoji: '📅' },
          { label: '最长', value: best, unit: '天', emoji: '🏆' },
          { label: '累计', value: totalCheckins, unit: '天', emoji: '📊' },
        ].map((s) => (
          <div key={s.label} className="va-card text-center px-1 py-3">
            <div className="text-lg">{s.emoji}</div>
            <div className="text-lg sm:text-xl font-semibold leading-tight">{s.value}</div>
            <div className="text-[10px] text-ink-500">
              {s.label}
              <span className="hidden sm:inline">打卡</span>
            </div>
          </div>
        ))}
      </section>

      {/* 今日打卡 */}
      <section className="va-card flex items-center justify-between gap-3">
        <div className="text-sm">
          {checkinDates.includes(todayKey()) ? (
            <span className="text-green-700">✅ 今天已打卡，继续保持！</span>
          ) : (
            <span className="text-ink-600">今天还没打卡</span>
          )}
        </div>
        {!checkinDates.includes(todayKey()) && (
          <button
            onClick={() => checkin()}
            className="va-btn va-btn--primary va-btn--sm shrink-0"
          >
            立即打卡
          </button>
        )}
      </section>

      {/* 考试倒计时 */}
      <section className="va-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">考试倒计时</div>
          {!editExam && (
            <button
              onClick={() => {
                setForm({ type: (examType || 'IELTS') as ExamType, date: examDate, target: targetScore })
                setEditExam(true)
              }}
              className="text-xs text-accent-deep hover:underline"
            >
              {examDate ? '修改' : '去设置'}
            </button>
          )}
        </div>

        {!editExam && examDate && left !== null && (
          <div className="text-center py-3 bg-gradient-to-b from-orange-50 to-white rounded-xl">
            <div className="text-sm text-ink-500">
              {EXAM_LABEL[examType] || '考试'}
              {targetScore && ` · 目标 ${targetScore}`}
            </div>
            <div className="text-3xl sm:text-4xl font-semibold text-orange-600 mt-1">
              {left > 0 ? left : left === 0 ? 0 : -left}
            </div>
            <div className="text-xs text-ink-500 mt-1">
              {left > 0 ? '天后考试 · 加油！' : left === 0 ? '就是今天，祝顺利！' : '天前已考完'}
            </div>
            <div className="text-[11px] text-ink-400 mt-2">考试日期：{examDate}</div>
          </div>
        )}

        {!editExam && !examDate && (
          <div className="text-xs text-ink-500">
            设置考试日期后，首页会显示倒计时，帮你保持节奏。
          </div>
        )}

        {editExam && (
          <div className="space-y-3">
            <div>
              <div className="text-xs text-ink-500 mb-1.5">考试类型</div>
              <div className="flex flex-wrap gap-1.5">
                {EXAM_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setForm((f) => ({ ...f, type: o.id }))}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      form.type === o.id
                        ? 'bg-ink-900 text-white border-ink-900'
                        : 'bg-white border-ink-100 text-ink-600'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-ink-500 mb-1.5">考试日期</div>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-ink-100 rounded-xl text-sm focus:outline-none focus:border-ink-900"
                />
              </div>
              <div>
                <div className="text-xs text-ink-500 mb-1.5">目标分（可选）</div>
                <input
                  value={form.target}
                  onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                  placeholder="如 7.0 / 100"
                  className="w-full px-3 py-2 bg-white border border-ink-100 rounded-xl text-sm focus:outline-none focus:border-ink-900"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={saveExam} className="va-btn va-btn--primary va-btn--md">
                保存
              </button>
              <button
                onClick={() => setEditExam(false)}
                className="va-btn va-btn--secondary va-btn--md"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 打卡日历 */}
      <section className="va-card space-y-3">
        <div className="text-sm font-semibold">打卡日历</div>
        <MonthCalendar
          dates={checkinDates}
          cursor={cursor}
          onShift={(d) => {
            const next = new Date(cursor)
            next.setMonth(cursor.getMonth() + d)
            setCursor(next)
          }}
        />
      </section>

      {/* 每日任务目标 */}
      <section className="va-card space-y-3">
        <div className="text-sm font-semibold">每日任务</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TASKS.map((t) => {
            const isAuto = t.id === 'newWords' || t.id === 'review'
            const value = t.id === 'newWords' ? dailyGoal : taskTargets[t.id] ?? t.defaultCount
            return (
              <div
                key={t.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-50 text-sm"
              >
                <span>{t.emoji}</span>
                <span className="flex-1">{t.label}</span>
                {isAuto ? (
                  <span className="text-xs text-ink-400">
                    {value} 个（{t.id === 'newWords' ? '首页设置' : '同每日新词'}）
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTaskTarget(t.id, Math.max(1, value - 1))}
                      className="w-6 h-6 rounded bg-white border border-ink-100 text-ink-500"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-xs">{value}</span>
                    <button
                      onClick={() => setTaskTarget(t.id, value + 1)}
                      className="w-6 h-6 rounded bg-white border border-ink-100 text-ink-500"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* 危险操作 */}
      <section className="va-card space-y-2">
        <button
          onClick={() => {
            if (confirm('将清除考试日期与今日任务勾选（打卡记录保留）。确定吗？')) {
              clearPlan()
            }
          }}
          className="text-xs text-red-600 hover:underline"
        >
          清除考试计划
        </button>
      </section>
    </div>
  )
}
