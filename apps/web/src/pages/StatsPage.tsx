import { useEffect, useState } from 'react'
import { useLearnStore } from '@/stores/learnStore'
import { fetchOverview, Overview } from '@/services/stats'

const EVENT_LABELS: Record<string, string> = {
  pageview: '页面浏览',
  ai_explain: 'AI 单词解释',
  learn_answer: '单词作答',
  learn_rate: '复习评分',
  reading_practice: '阅读真题练习',
  reading_ai: '阅读 AI 出题',
  writing_generate: '写作生成',
}

export function StatsPage() {
  const { todayLearned, todayReviewed, wrongWords, learnedWords } = useLearnStore()
  const total = learnedWords.length
  const progress = total > 0 ? Math.round((todayReviewed / total) * 100) : 0

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">学习报告</h1>
        <p className="text-ink-500 mt-1 text-sm">FSRS 帮你调度每一次复习</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="今日新词" value={todayLearned} />
        <StatCard label="今日复习" value={todayReviewed} />
        <StatCard label="错词本" value={wrongWords.length} />
        <StatCard label="已学词数" value={total} />
      </div>

      <div className="va-card">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">完成进度</div>
          <div className="text-sm text-ink-500">{progress}%</div>
        </div>
        <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-ink-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ============ 用户使用统计 ============ */}
      <UsageStats />

      {wrongWords.length > 0 && (
        <div className="va-card">
          <div className="font-semibold mb-3">错词本（前 10 个）</div>
          <ul className="space-y-2">
            {wrongWords.slice(0, 10).map((w) => (
              <li key={w.word.id} className="text-sm flex items-center justify-between">
                <span className="font-mono">{w.word.headword}</span>
                <span className="text-ink-500">
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

/* ============ 用户使用统计面板 ============ */

function UsageStats() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchOverview(14)
      .then(setData)
      .catch((e: any) => setError(e?.message ?? '加载失败'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const maxUsers = data ? Math.max(1, ...data.daily.map((d) => d.users)) : 1

  return (
    <div className="va-card space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">📊 用户使用统计</div>
          <div className="text-xs text-ink-500 mt-0.5">
            按匿名设备去重，不采集任何个人信息
          </div>
        </div>
        <button onClick={load} disabled={loading} className="va-btn va-btn--ghost va-btn--sm">
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="累计用户" value={data.totalUsers} highlight />
            <MiniStat label="今日活跃" value={data.todayUsers} />
            <MiniStat label="近 7 天活跃" value={data.weekUsers} />
            <MiniStat label="当前在线" value={data.onlineNow} dot />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="总访问量" value={data.totalVisits} />
            <MiniStat label="今日访问" value={data.todayVisits} />
            <MiniStat label="近 30 天活跃" value={data.monthUsers} />
            <MiniStat label="总操作次数" value={data.totalEvents} />
          </div>

          {/* 近 14 天活跃趋势 */}
          <div>
            <div className="text-sm font-medium mb-3">近 14 天活跃用户</div>
            <div className="flex items-end gap-1 h-28">
              {data.daily.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                  <div className="text-[10px] text-ink-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.users}
                  </div>
                  <div
                    className={`w-full rounded-t transition-all ${
                      d.users > 0 ? 'bg-ink-900' : 'bg-ink-100'
                    }`}
                    style={{ height: `${Math.max(3, (d.users / maxUsers) * 80)}px` }}
                    title={`${d.date}：${d.users} 人 / ${d.visits} 次访问`}
                  />
                  <div className="text-[9px] text-ink-400 rotate-45 origin-left whitespace-nowrap">
                    {d.date.slice(5)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 功能使用 */}
            <div>
              <div className="text-sm font-medium mb-2">功能使用排行</div>
              {data.topEvents.length === 0 ? (
                <div className="text-xs text-ink-500">暂无数据</div>
              ) : (
                <ul className="space-y-1.5">
                  {data.topEvents.slice(0, 6).map((e) => (
                    <li key={e.event} className="flex items-center justify-between text-sm">
                      <span className="text-ink-600">{EVENT_LABELS[e.event] ?? e.event}</span>
                      <span className="font-mono text-ink-900">{e.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 平台分布 */}
            <div>
              <div className="text-sm font-medium mb-2">平台分布</div>
              {data.platforms.length === 0 ? (
                <div className="text-xs text-ink-500">暂无数据</div>
              ) : (
                <ul className="space-y-1.5">
                  {data.platforms.map((p) => {
                    const pct = data.totalUsers
                      ? Math.round((p.count / data.totalUsers) * 100)
                      : 0
                    return (
                      <li key={p.name} className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-ink-600">{p.name}</span>
                          <span className="font-mono text-ink-900">
                            {p.count} <span className="text-ink-400 text-xs">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
                          <div className="h-full bg-ink-900" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MiniStat({
  label,
  value,
  highlight,
  dot,
}: {
  label: string
  value: number
  highlight?: boolean
  dot?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-3 text-center border ${
        highlight ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-ink-100'
      }`}
    >
      <div className={`text-2xl font-semibold ${highlight ? '' : 'text-ink-900'}`}>{value}</div>
      <div
        className={`text-xs mt-0.5 flex items-center justify-center gap-1 ${
          highlight ? 'text-white/70' : 'text-ink-500'
        }`}
      >
        {dot && value > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        )}
        {label}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="va-card text-center">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm text-ink-500 mt-1">{label}</div>
    </div>
  )
}
