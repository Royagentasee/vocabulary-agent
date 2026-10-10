import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  usePointsStore,
  POINT_RULES,
  MEMBER_PLANS,
  MEMBER_PERKS,
  MODULES,
  describeRecord,
  dayKey,
  type PointReason,
} from '@/stores/pointsStore'
import { evaluatePoints } from '@/services/pointsEngine'
import { trackEvent } from '@/services/stats'

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return '刚刚'
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
}

export function PointsPage() {
  const {
    balance, totalEarned, totalSpent, history, dailyEarned,
    unlockedModules, memberUntil, redeem, isMember, memberDaysLeft,
  } = usePointsStore()

  useEffect(() => {
    evaluatePoints()
    trackEvent('points_view')
  }, [])

  const member = isMember()
  const daysLeft = memberDaysLeft()
  const today = dayKey()
  const todayMap = dailyEarned[today] || {}
  const todayTotal = Object.values(todayMap).reduce((a, b) => a + b, 0)

  /** 今日各规则已获得 / 上限 */
  const todayRows = useMemo(
    () =>
      (Object.keys(POINT_RULES) as PointReason[])
        .filter((k) => POINT_RULES[k].dailyCap > POINT_RULES[k].points || k === 'checkin')
        .map((k) => ({
          key: k,
          ...POINT_RULES[k],
          used: Object.entries(todayMap)
            .filter(([kk]) => kk === k || kk.startsWith(`${k}:`))
            .reduce((a, [, v]) => a + v, 0),
        })),
    [todayMap],
  )

  return (
    <div className="space-y-4 sm:space-y-5 max-w-2xl">
      <header>
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">积分与会员</h1>
        <p className="text-ink-500 mt-1.5 text-sm">
          每天坚持打卡赚积分，积分可兑换会员
        </p>
      </header>

      {/* 余额 */}
      <section className="va-card text-center space-y-2 bg-gradient-to-b from-amber-50 to-white">
        <div className="text-xs text-ink-500">当前积分</div>
        <div className="text-4xl sm:text-5xl font-semibold text-amber-600 tabular-nums">
          {balance.toLocaleString()}
        </div>
        <div className="text-xs text-ink-500">
          累计获得 {totalEarned.toLocaleString()} · 已用 {totalSpent.toLocaleString()}
        </div>

        {member ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-medium">
            🏅 会员中 · 还剩 {daysLeft} 天
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink-100 text-ink-500 text-xs">
            还不是会员 · 攒积分可兑换
          </div>
        )}

        {todayTotal > 0 && (
          <div className="text-xs text-green-700">今日已获得 +{todayTotal} 积分</div>
        )}
      </section>

      {/* 今日进度 */}
      {todayRows.length > 0 && (
        <section className="va-card space-y-2">
          <div className="text-sm font-semibold">今日积分进度</div>
          <div className="space-y-1.5">
            {todayRows.map((r) => {
              const full = r.used >= (r.dailyCap ?? 0)
              return (
                <div key={r.key} className="flex items-center gap-2 text-xs">
                  <span className="w-5">{r.emoji}</span>
                  <span className="w-24 text-ink-600 truncate">{r.label}</span>
                  <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${full ? 'bg-ink-300' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(100, (r.used / (r.dailyCap ?? 0)) * 100)}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-ink-500 tabular-nums">
                    {r.used}/{(r.dailyCap ?? 0)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 兑换 */}
      <section className="va-card space-y-3">
        <div className="text-sm font-semibold">兑换会员</div>
        <div className="grid grid-cols-3 gap-2">
          {MEMBER_PLANS.map((p) => {
            const can = balance >= p.cost
            return (
              <div
                key={p.days}
                className={`relative rounded-xl border p-3 text-center space-y-1.5 ${
                  p.hot ? 'border-amber-300 bg-amber-50/50' : 'border-ink-100'
                }`}
              >
                {p.hot && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white whitespace-nowrap">
                    最划算
                  </span>
                )}
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="text-xs text-ink-500">{p.unit}</div>
                <div className="text-sm font-semibold text-amber-600 tabular-nums">
                  {p.cost.toLocaleString()}
                </div>
                <button
                  disabled={!can}
                  onClick={() => {
                    if (redeem(p.days, p.cost)) {
                      trackEvent('points_redeem', `${p.days}d`)
                      alert(`🎉 兑换成功！会员已延长 ${p.days} 天`)
                    }
                  }}
                  className={`w-full py-1.5 rounded-lg text-xs transition-colors ${
                    can
                      ? 'bg-ink-900 text-white active:opacity-80'
                      : 'bg-ink-100 text-ink-400 cursor-not-allowed'
                  }`}
                >
                  {can ? '兑换' : '积分不足'}
                </button>
              </div>
            )
          })}
        </div>
        {memberUntil && (
          <div className="text-xs text-ink-500">会员有效期至：{memberUntil}</div>
        )}
      </section>

      {/* 会员特权 */}
      <section className="va-card space-y-3">
        <div className="text-sm font-semibold">会员特权</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MEMBER_PERKS.map((p) => (
            <div key={p.title} className="flex gap-2.5 p-2.5 rounded-lg bg-ink-50">
              <span className="text-lg">{p.emoji}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium">{p.title}</div>
                <div className="text-xs text-ink-500">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 赚积分规则 */}
      <section className="va-card space-y-2">
        <div className="text-sm font-semibold">怎么赚积分</div>
        <div className="divide-y divide-ink-100">
          {(Object.keys(POINT_RULES) as PointReason[]).map((k) => {
            const r = POINT_RULES[k]
            const capText =
              k === 'learn'
                ? `+${r.points}/词 · 每天上限 ${(r.dailyCap ?? 0)}`
                : k === 'review'
                ? `+${r.points}/词 · 每天上限 ${(r.dailyCap ?? 0)}`
                : k === 'task'
                ? `+${r.points}/项 · 每天上限 ${(r.dailyCap ?? 0)}`
                : k === 'checkin'
                ? `+${r.points}/天`
                : `+${r.points}`
            return (
              <div key={k} className="flex items-center gap-2 py-2 text-sm">
                <span>{r.emoji}</span>
                <span className="flex-1">{r.label}</span>
                <span className="text-xs text-ink-500">{capText}</span>
              </div>
            )
          })}
        </div>
        <div className="text-xs text-ink-400 pt-1">
          会员期间所有积分获取 <strong className="text-amber-600">×1.5</strong>
        </div>
      </section>

      {/* 模块探索奖励 */}
      <section className="va-card space-y-2">
        <div className="text-sm font-semibold">
          模块探索 <span className="text-xs text-ink-400 font-normal">（首次体验 +10 分）</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MODULES.map((m) => {
            const done = unlockedModules.includes(m.id)
            return (
              <span
                key={m.id}
                className={`text-xs px-2.5 py-1 rounded-full ${
                  done ? 'bg-green-50 text-green-700' : 'bg-ink-50 text-ink-400'
                }`}
              >
                {done ? '✅ ' : ''}
                {m.label}
              </span>
            )
          })}
        </div>
        <div className="text-xs text-ink-500">
          已探索 {unlockedModules.length}/{MODULES.length} 个模块
        </div>
      </section>

      {/* 明细 */}
      <section className="va-card space-y-2">
        <div className="text-sm font-semibold">积分明细</div>
        {history.length === 0 ? (
          <div className="text-xs text-ink-500 py-4 text-center">
            还没有记录 —— 去{' '}
            <Link to="/plan" className="text-accent-deep hover:underline">
              打个卡
            </Link>{' '}
            就能拿 5 分
          </div>
        ) : (
          <div className="divide-y divide-ink-100 max-h-80 overflow-auto">
            {history.map((r, i) => (
              <div key={i} className="flex items-center gap-2 py-2 text-sm">
                <span
                  className={`w-14 text-right tabular-nums font-medium ${
                    r.delta > 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {r.delta > 0 ? '+' : ''}
                  {r.delta}
                </span>
                <span className="flex-1 text-ink-700 truncate">{describeRecord(r)}</span>
                <span className="text-xs text-ink-400 shrink-0">{timeAgo(r.ts)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
