import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLearnStore } from '@/stores/learnStore'
import { usePointsStore } from '@/stores/pointsStore'
import { buildWeeklyReport, type DayStat } from '@/services/report'
import { evaluatePoints } from '@/services/pointsEngine'

export function StatsPage() {
  const { todayLearned, todayReviewed, wrongWords, learnedWords } = useLearnStore()
  const isMember = usePointsStore((s) => s.isMember())
  const total = learnedWords.length
  const progress = total > 0 ? Math.round((todayReviewed / total) * 100) : 0

  useEffect(() => {
    evaluatePoints()
  }, [])

  // 依赖学习/打卡/积分数据，任一变化都重算
  const report = useMemo(
    () => buildWeeklyReport(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [learnedWords.length, wrongWords.length, todayLearned, todayReviewed, isMember],
  )

  const maxDaily = Math.max(1, ...report.days.map((d) => d.newWords + d.reviews))

  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <header>
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">学习报告</h1>
        <p className="text-ink-500 mt-1.5 text-sm">FSRS 帮你调度每一次复习</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <StatCard label="今日新词" value={todayLearned} />
        <StatCard label="今日复习" value={todayReviewed} />
        <StatCard label="错词本" value={wrongWords.length} />
        <StatCard label="已学词数" value={total} />
      </div>

      {/* ================= 本周概览（所有人可见）================= */}
      <section className="va-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">最近 7 天</div>
          <div className="text-xs text-ink-500">
            活跃 {report.totals.activeDays}/7 天 · 打卡 {report.totals.checkins} 天
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniStat label="新学词" value={report.totals.newWords} delta={report.delta.newWords} />
          <MiniStat label="复习" value={report.totals.reviews} delta={report.delta.reviews} />
          <MiniStat label="积分" value={report.totals.points} delta={report.delta.points} />
        </div>

        {/* 逐日柱状图 */}
        <div>
          <div className="flex items-end justify-between gap-1 h-24">
            {report.days.map((d) => (
              <DayBar key={d.date} day={d} max={maxDaily} />
            ))}
          </div>
          <div className="flex justify-between gap-1 mt-1">
            {report.days.map((d) => (
              <div
                key={d.date}
                className={`flex-1 text-center text-[10px] ${
                  d.isToday ? 'text-accent-deep font-semibold' : 'text-ink-400'
                }`}
              >
                {d.isToday ? '今天' : d.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-ink-400">
          <span className="flex items-center gap-1">
            <i className="w-2 h-2 rounded-sm bg-ink-900 inline-block" /> 新学
          </span>
          <span className="flex items-center gap-1">
            <i className="w-2 h-2 rounded-sm bg-ink-300 inline-block" /> 复习
          </span>
          <span className="ml-auto">🔥 连续打卡 {report.totals.streak} 天</span>
        </div>
      </section>

      {/* ================= 详细分析（会员专属）================= */}
      <section className="va-card space-y-3 relative">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm flex items-center gap-1.5">
            详细分析
            {isMember ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                🏅 会员
              </span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ink-100 text-ink-500">
                🔒 会员专属
              </span>
            )}
          </div>
        </div>

        <div className={isMember ? '' : 'blur-[3px] select-none pointer-events-none'}>
          {/* 模块分布 */}
          <div className="space-y-2">
            <div className="text-xs text-ink-500">学习模块分布</div>
            {report.modules.length === 0 ? (
              <div className="text-xs text-ink-400 py-2">还没有足够数据</div>
            ) : (
              report.modules.map((m) => (
                <div key={m.reason} className="flex items-center gap-2 text-xs">
                  <span className="w-5">{m.emoji}</span>
                  <span className="w-20 text-ink-600 truncate">{m.label}</span>
                  <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full bg-ink-900" style={{ width: `${m.pct}%` }} />
                  </div>
                  <span className="w-9 text-right text-ink-500 tabular-nums">{m.pct}%</span>
                </div>
              ))
            )}
          </div>

          {/* 薄弱项 */}
          {report.weakPoints.length > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="text-xs text-ink-500">需要加强</div>
              {report.weakPoints.map((w, i) => (
                <div key={i} className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2.5 py-1.5">
                  • {w}
                </div>
              ))}
            </div>
          )}

          {/* 复习调度 */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="bg-ink-50 rounded-lg py-2">
              <div className="text-lg font-semibold">{report.dueCount}</div>
              <div className="text-[11px] text-ink-500">待复习词数</div>
            </div>
            <div className="bg-ink-50 rounded-lg py-2">
              <div className="text-lg font-semibold">{report.totalLearned}</div>
              <div className="text-[11px] text-ink-500">累计已学</div>
            </div>
          </div>
        </div>

        {!isMember && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40 rounded-2xl">
            <div className="text-2xl">🔒</div>
            <div className="text-xs text-ink-600 text-center px-6">
              详细分析（模块分布、薄弱项、复习调度）是会员特权
            </div>
            <Link
              to="/points"
              className="px-4 py-2 rounded-xl bg-ink-900 text-white text-xs font-medium active:opacity-80"
            >
              用积分兑换会员
            </Link>
          </div>
        )}
      </section>

      {/* 完成进度 */}
      <div className="va-card">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm">完成进度</div>
          <div className="text-sm text-ink-500">{progress}%</div>
        </div>
        <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
          <div className="h-full bg-ink-900 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {wrongWords.length > 0 && (
        <div className="va-card">
          <div className="font-semibold mb-3 text-sm">错词本（前 10 个）</div>
          <ul className="space-y-2">
            {wrongWords.slice(0, 10).map((w) => (
              <li key={w.word.id} className="text-sm flex items-center justify-between gap-2">
                <span className="font-mono shrink-0">{w.word.headword}</span>
                <span className="text-ink-500 truncate text-xs">
                  {w.word.senses.map((s) => s.definitionCn).join('；')}
                  <span className="text-red-500 ml-2">×{w.wrongCount}</span>
                </span>
              </li>
            ))}
          </ul>
          {wrongWords.length > 10 && (
            <div className="text-xs text-ink-500 mt-2">
              还有 {wrongWords.length - 10} 个，去错题本查看全部
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DayBar({ day, max }: { day: DayStat; max: number }) {
  const total = day.newWords + day.reviews
  const h = total > 0 ? Math.max(6, (total / max) * 100) : 0
  const newPct = total > 0 ? (day.newWords / total) * 100 : 0

  return (
    <div className="flex-1 flex flex-col justify-end items-stretch gap-0.5 h-full" title={`${day.date} 新学 ${day.newWords} · 复习 ${day.reviews}`}>
      {total === 0 ? (
        <div className="h-1.5 rounded bg-ink-100" />
      ) : (
        <div className="rounded overflow-hidden flex flex-col-reverse" style={{ height: `${h}%` }}>
          <div className="bg-ink-900" style={{ height: `${newPct}%` }} />
          <div className="bg-ink-300" style={{ height: `${100 - newPct}%` }} />
        </div>
      )}
      {day.checkedIn && <div className="text-center text-[9px] leading-none text-orange-500">🔥</div>}
    </div>
  )
}

function MiniStat({ label, value, delta }: { label: string; value: number; delta: number }) {
  const up = delta > 0
  const flat = delta === 0
  return (
    <div className="bg-ink-50 rounded-lg py-2">
      <div className="text-lg sm:text-xl font-semibold leading-tight tabular-nums">{value}</div>
      <div className="text-[11px] text-ink-500">{label}</div>
      <div
        className={`text-[10px] mt-0.5 ${
          flat ? 'text-ink-400' : up ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {flat ? '与上周持平' : `${up ? '↑' : '↓'} ${Math.abs(delta)}% 较上周`}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="va-card text-center px-2 sm:px-6 py-3 sm:py-6">
      <div className="text-2xl sm:text-3xl font-semibold leading-tight">{value}</div>
      <div className="text-[11px] sm:text-sm text-ink-500 mt-0.5 sm:mt-1">{label}</div>
    </div>
  )
}
