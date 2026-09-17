import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchOverview, isAdmin, setAdmin, Overview } from '@/services/stats'

const EVENT_LABELS: Record<string, string> = {
  pageview: '页面浏览',
  ai_explain: 'AI 单词解释',
  learn_answer: '单词作答',
  learn_rate: '复习评分',
  reading_practice: '阅读真题练习',
  reading_ai: '阅读 AI 出题',
  writing_generate: '写作生成',
}

/**
 * 作者专用：用户使用统计（隐藏页面，不放在导航里）
 * 入口：/admin?admin=1（开启后存本地，之后直接 /admin 即可）
 */
export function AdminUsagePage() {
  const [searchParams] = useSearchParams()
  const [admin, setAdminState] = useState(isAdmin())

  useEffect(() => {
    const q = searchParams.get('admin')
    if (q === '1') {
      setAdmin(true)
      setAdminState(true)
    } else if (q === '0') {
      setAdmin(false)
      setAdminState(false)
    }
  }, [searchParams])

  if (!admin) {
    return (
      <div className="va-card text-center space-y-3 max-w-md mx-auto">
        <div className="text-4xl">🔒</div>
        <h1 className="text-lg font-semibold">作者专属页面</h1>
        <p className="text-sm text-ink-500">
          这里是用户使用统计，仅作者可见。请访问下面的地址开启：
        </p>
        <div className="font-mono text-sm bg-ink-50 rounded-lg p-3 break-all">
          /admin?admin=1
        </div>
        <p className="text-xs text-ink-400">开启后标记存本机，下次直接访问 /admin 即可</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">📊 用户使用统计</h1>
          <p className="text-ink-500 mt-1 text-sm">
            按匿名设备去重，不采集任何个人信息
          </p>
        </div>
        <span className="text-xs text-ink-400">🔒 作者模式</span>
      </header>

      <UsageStats />
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500">每 30 秒手动刷新一次更准确</div>
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
          <div className="va-card">
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
            <div className="va-card">
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
            <div className="va-card">
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

          {/* ============ 留存分析 ============ */}
          <div className="va-card">
            <div className="text-sm font-medium mb-1">留存分析</div>
            <div className="text-xs text-ink-500 mb-3">
              只看窗口已走完的用户（次日/7日），避免新用户拉低数值
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-ink-100 bg-white p-3 text-center">
                <div className="text-2xl font-semibold text-ink-900">{data.retention.d1Rate}%</div>
                <div className="text-xs text-ink-500 mt-0.5">次日留存</div>
                <div className="text-[10px] text-ink-400 mt-0.5">
                  基数 {data.retention.d1Base} 人
                </div>
              </div>
              <div className="rounded-xl border border-ink-100 bg-white p-3 text-center">
                <div className="text-2xl font-semibold text-ink-900">{data.retention.d7Rate}%</div>
                <div className="text-xs text-ink-500 mt-0.5">7 日留存</div>
                <div className="text-[10px] text-ink-400 mt-0.5">
                  基数 {data.retention.d7Base} 人
                </div>
              </div>
            </div>

            {data.retention.daily.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-ink-500 border-b border-ink-100">
                      <th className="text-left py-1.5 font-normal">首次日期</th>
                      <th className="text-right py-1.5 font-normal">新增</th>
                      <th className="text-right py-1.5 font-normal">次日留存</th>
                      <th className="text-right py-1.5 font-normal">7日留存</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.retention.daily.slice().reverse().slice(0, 10).map((r) => (
                      <tr key={r.date} className="border-b border-ink-50">
                        <td className="py-1.5 text-ink-600">{r.date.slice(5)}</td>
                        <td className="py-1.5 text-right font-mono">{r.newUsers}</td>
                        <td className="py-1.5 text-right font-mono">
                          {r.d1Rate === null ? (
                            <span className="text-ink-300">—</span>
                          ) : (
                            `${r.d1Rate}%`
                          )}
                        </td>
                        <td className="py-1.5 text-right font-mono">
                          {r.d7Rate === null ? (
                            <span className="text-ink-300">—</span>
                          ) : (
                            `${r.d7Rate}%`
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============ 最近访问明细 ============ */}
          <div className="va-card">
            <div className="text-sm font-medium mb-1">最近访问</div>
            <div className="text-xs text-ink-500 mb-2">最近 30 条操作记录</div>
            {data.recent.length === 0 ? (
              <div className="text-xs text-ink-500">暂无数据</div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-ink-100">
                <table className="w-full text-xs">
                  <tbody>
                    {data.recent.map((a, i) => (
                      <tr key={i} className="border-b border-ink-50 last:border-0">
                        <td className="py-1.5 px-2 font-mono text-ink-500 whitespace-nowrap">
                          {a.time.slice(5)}
                        </td>
                        <td className="py-1.5 px-2 text-ink-600 whitespace-nowrap">{a.platform}</td>
                        <td className="py-1.5 px-2 font-mono text-ink-400">#{a.device}</td>
                        <td className="py-1.5 px-2 text-ink-900">{EVENT_LABELS[a.event] ?? a.event}</td>
                        <td className="py-1.5 px-2 text-ink-500 truncate max-w-[140px]">
                          {a.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
