import { useEffect, useMemo, useState } from 'react'
import { fetchLeaderboard, LeaderboardResult } from '@/services/leaderboard'
import { useLearnStore } from '@/stores/learnStore'
import { usePlanStore, currentStreak, longestStreak } from '@/stores/planStore'
import { usePointsStore } from '@/stores/pointsStore'
import { usePathStore, PATH_UNITS, isUnitDone } from '@/stores/pathStore'
import { BADGES, TIER_STYLE, TIER_LABEL, type BadgeContext } from '@/features/achievements/badges'
import { trackEvent } from '@/services/stats'

type Tab = 'rank' | 'badge'

export function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('badge')

  useEffect(() => {
    trackEvent('leaderboard_view')
  }, [])

  return (
    <div className="space-y-4 sm:space-y-5 max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">🏅 成就与排行</h1>
        <p className="text-ink-500 text-sm">看看攒了多少徽章，以及在同学里排第几</p>
      </header>

      <div className="flex gap-2">
        {(
          [
            ['badge', '🎖️ 成就徽章'],
            ['rank', '📊 周排行榜'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
              tab === k
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white text-ink-600 border-ink-100 hover:border-ink-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'badge' ? <BadgeGrid /> : <RankList />}
    </div>
  )
}

/* ============ 成就徽章 ============ */

function BadgeGrid() {
  const learnedWords = useLearnStore((s) => s.learnedWords)
  const wrongWords = useLearnStore((s) => s.wrongWords)
  const checkinDates = usePlanStore((s) => s.checkinDates)
  const progressMap = usePathStore((s) => s.progress)
  const lifetime = usePointsStore((s) => s.lifetime)

  const ctx: BadgeContext = useMemo(() => {
    const unitsDone = PATH_UNITS.filter((u) => isUnitDone(u, progressMap)).length
    return {
      learned: learnedWords.length,
      wrongCount: wrongWords.length,
      streak: currentStreak(checkinDates),
      longest: longestStreak(checkinDates),
      checkinDays: new Set(checkinDates).size,
      lifetime: lifetime || {},
      pathUnitsDone: unitsDone,
      wordCount: learnedWords.length,
    }
  }, [learnedWords, wrongWords, checkinDates, progressMap, lifetime])

  const withState = BADGES.map((b) => {
    const [cur, target] = b.progress(ctx)
    return { ...b, cur, target, unlocked: cur >= target }
  })
  const unlocked = withState.filter((b) => b.unlocked)
  const locked = withState.filter((b) => !b.unlocked)

  return (
    <div className="space-y-4">
      <section className="va-card text-center space-y-1">
        <div className="text-4xl">🎖️</div>
        <div className="text-2xl font-semibold">
          {unlocked.length}
          <span className="text-base text-ink-400 font-normal"> / {BADGES.length}</span>
        </div>
        <div className="text-xs text-ink-500">已解锁徽章</div>
        <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-amber-600 transition-all"
            style={{ width: `${(unlocked.length / BADGES.length) * 100}%` }}
          />
        </div>
      </section>

      {unlocked.length > 0 && (
        <section className="space-y-2">
          <div className="text-sm font-semibold">已解锁</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {unlocked.map((b) => (
              <div
                key={b.id}
                className={`rounded-xl p-3 text-center bg-gradient-to-b ${TIER_STYLE[b.tier]} text-white space-y-1`}
                title={b.desc}
              >
                <div className="text-2xl">{b.emoji}</div>
                <div className="text-[11px] font-medium leading-tight">{b.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <div className="text-sm font-semibold">
          待解锁 <span className="text-xs text-ink-400 font-normal">（按进度排序）</span>
        </div>
        <div className="space-y-1.5">
          {locked
            .sort((a, b) => b.cur / b.target - a.cur / a.target)
            .map((b) => (
              <div key={b.id} className="va-card !p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center text-xl grayscale opacity-50 shrink-0">
                  {b.emoji}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium truncate">{b.name}</span>
                    <span className="text-[10px] px-1 py-0.5 rounded bg-ink-100 text-ink-500 shrink-0">
                      {TIER_LABEL[b.tier]}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-500 truncate">{b.desc}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ink-900 transition-all"
                        style={{ width: `${(b.cur / b.target) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-ink-400 tabular-nums shrink-0">
                      {b.cur}/{b.target}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  )
}

/* ============ 排行榜 ============ */

function RankList() {
  const [data, setData] = useState<LeaderboardResult | null>(null)
  const [loading, setLoading] = useState(true)
  const balance = usePointsStore((s) => s.balance)

  useEffect(() => {
    setLoading(true)
    fetchLeaderboard(50)
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-sm text-ink-500 py-12 text-center">加载中…</div>
  }

  const items = data?.items || []

  return (
    <div className="space-y-3">
      <section className="va-card space-y-1 text-center">
        <div className="text-xs text-ink-500">我的积分（累计）</div>
        <div className="text-3xl font-semibold text-amber-600 tabular-nums">
          {balance.toLocaleString()}
        </div>
        {data?.me ? (
          <div className="text-xs text-ink-600">
            本周排名 <strong>第 {data.me.rank} 名</strong> / 共 {data.total} 人
          </div>
        ) : (
          <div className="text-xs text-ink-400">
            本周还没得分，学一点就能上榜
          </div>
        )}
      </section>

      {items.length === 0 ? (
        <div className="va-card text-center text-sm text-ink-500 py-10">
          还没有人上榜 —— 你是第一个的话就直接第一了 😄
        </div>
      ) : (
        <section className="va-card !p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
            <div className="text-sm font-semibold">本周积分榜</div>
            <div className="text-xs text-ink-400">{data?.period}</div>
          </div>
          <div className="divide-y divide-ink-100">
            {items.map((it) => (
              <div
                key={it.rank}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  it.isMe ? 'bg-amber-50' : ''
                }`}
              >
                <div
                  className={`w-7 text-center text-sm font-semibold shrink-0 ${
                    it.rank === 1
                      ? 'text-yellow-500'
                      : it.rank === 2
                      ? 'text-slate-400'
                      : it.rank === 3
                      ? 'text-amber-700'
                      : 'text-ink-400'
                  }`}
                >
                  {it.rank <= 3 ? ['🥇', '🥈', '🥉'][it.rank - 1] : it.rank}
                </div>
                <div className="flex-1 text-sm truncate">
                  {it.name}
                  {it.isMe && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">
                      我
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium tabular-nums text-ink-700">
                  {it.points.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="va-card text-xs text-ink-500 space-y-1.5">
        <div className="text-sm font-semibold text-ink-700">关于排行榜</div>
        <ul className="space-y-1 leading-relaxed">
          <li>• 按<strong>最近 7 天</strong>获得的积分排名，每周一自然重置</li>
          <li>• 榜上只显示化名，不暴露你的账号和同步码</li>
          <li>• 想冲榜：每天打卡 +5、学新词每词 +1（上限 30）、完成每日任务 +3/项</li>
        </ul>
      </section>
    </div>
  )
}
