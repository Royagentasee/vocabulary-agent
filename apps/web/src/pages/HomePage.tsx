import { Link, useNavigate } from 'react-router-dom'
import { useLearnStore } from '@/stores/learnStore'
import { usePointsStore } from '@/stores/pointsStore'
import { DailyPlan } from '@/features/plan/DailyPlan'

const GOAL_OPTIONS = [5, 10, 15, 20, 30, 50]

export function HomePage() {
  const { todayLearned, todayReviewed, wrongWords, learnedWords, dailyGoal, setDailyGoal } = useLearnStore()
  const balance = usePointsStore((s) => s.balance)
  const member = usePointsStore((s) => s.isMember())
  const daysLeft = usePointsStore((s) => s.memberDaysLeft())

  // 新访客（还没学过任何词）：给个明确起点，别让他看到一排 0

  const learnedCount = useLearnStore((s) => s.learnedWords.length)

  const isNewUser = learnedCount === 0

  const nav = useNavigate()


  return (
    <div className="space-y-5 sm:space-y-8">

      {/* 新访客引导 */}
      {isNewUser && (
        <section className="va-card space-y-4 border-ink-900">
          <div className="space-y-1.5">
            <div className="text-lg font-semibold">👋 欢迎，从这三步开始</div>
            <div className="text-sm text-ink-500 leading-relaxed">
              不用注册、没有广告。背单词和读书永久免费。
            </div>
          </div>
          <div className="space-y-2">
            {[
              ['1', '🗺️', '打开学习路径', '跟着走就行，不用想今天学什么', '/path'],
              ['2', '📖', '先背 20 个词', '选一本考试词书，5 分钟能开始', '/wordbooks'],
              ['3', '📷', '试试拍照翻译', '拍书上英文，秒变中文', '/photo'],
            ].map(([n, e, t, d, to]) => (
              <button
                key={n}
                onClick={() => nav(to)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-ink-50 hover:bg-ink-100 active:bg-ink-100 text-left transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-ink-900 text-white text-xs flex items-center justify-center shrink-0">
                  {n}
                </span>
                <span className="text-lg shrink-0">{e}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">{t}</span>
                  <span className="block text-[11px] text-ink-500">{d}</span>
                </span>
                <span className="text-ink-300 shrink-0">›</span>
              </button>
            ))}
          </div>
          <div className="text-[11px] text-ink-500 leading-relaxed border-t border-ink-100 pt-3">
            📚 这里还有 <strong>86 本英文名著</strong>、<strong>1000 篇听力</strong>、
            <strong>330 道 SAT 真题</strong> —— 都在底部「⋯ 更多」里。
          </div>
        </section>
      )}

      <section>
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">
          你好，今天学一会儿 👋
        </h1>
        <p className="text-ink-500 mt-1.5 text-sm sm:text-base sm:mt-2">
          AI 陪伴，考点驱动，让每一个单词都记得更牢。
        </p>
      </section>

      {/* 打卡 · 考试倒计时 · 今日任务 */}
      <DailyPlan />

      {/* 积分 / 会员 */}
      <Link
        to="/points"
        className="va-card flex items-center justify-between gap-3 hover:border-ink-900 transition-colors active:bg-ink-50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">{member ? '🏅' : '⭐'}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium">
              {member ? `会员中 · 还剩 ${daysLeft} 天` : `当前积分 ${balance.toLocaleString()}`}
            </div>
            <div className="text-xs text-ink-500 truncate">
              {member
                ? `积分 ${balance.toLocaleString()} · 积分获取 ×1.5`
                : '打卡、学习都能赚积分，可兑换会员'}
            </div>
          </div>
        </div>
        <span className="text-ink-300 shrink-0">›</span>
      </Link>

      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="今日新词" value={todayLearned} />
        <StatCard label="今日复习" value={todayReviewed} />
        <StatCard label="已学词数" value={learnedWords.length} />
      </section>

      {/* 每日背词数量设置 */}
      <section className="va-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-medium text-sm sm:text-base">每日背词数量</div>
            <div className="text-xs sm:text-sm text-ink-500 mt-0.5">
              每天学习多少个新单词，随时可改
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:flex sm:flex-wrap sm:gap-1">
            {GOAL_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setDailyGoal(n)}
                className={`py-2 sm:py-1.5 sm:px-3 rounded-lg text-sm transition-colors ${
                  dailyGoal === n
                    ? 'bg-ink-900 text-white'
                    : 'bg-white text-ink-500 border border-ink-100 hover:border-ink-900'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Link
          to="/wordbooks"
          className="va-card hover:border-ink-900 transition-colors flex flex-col gap-1 sm:gap-2 active:bg-ink-50"
        >
          <h2 className="text-base sm:text-lg font-semibold">📖 学习新词</h2>
          <p className="text-xs sm:text-sm text-ink-500">
            每天学 {dailyGoal} 个新单词，先选意思再看解释
          </p>
        </Link>
        <Link
          to="/review"
          className="va-card hover:border-ink-900 transition-colors flex flex-col gap-1 sm:gap-2 active:bg-ink-50"
        >
          <h2 className="text-base sm:text-lg font-semibold">🔄 复习旧词</h2>
          <p className="text-xs sm:text-sm text-ink-500">从学过的单词里随机抽取，巩固记忆</p>
        </Link>
      </section>

      {wrongWords.length > 0 && (
        <Link
          to="/wrongbook"
          className="va-card hover:border-ink-900 transition-colors flex flex-col gap-1 sm:gap-2 active:bg-ink-50"
        >
          <h2 className="text-base sm:text-lg font-semibold">
            📕 错题本（{wrongWords.length}）
          </h2>
          <p className="text-xs sm:text-sm text-ink-500">答错的单词都在这里，点进去巩固复习</p>
        </Link>
      )}

      {/* 书库入口 */}
      <Link
        to="/library"
        className="va-card hover:border-ink-900 transition-colors flex flex-col gap-1 sm:gap-2 active:bg-ink-50"
      >
        <h2 className="text-base sm:text-lg font-semibold">📚 书库 · 原版阅读</h2>
        <p className="text-xs sm:text-sm text-ink-500">
          25 本世界名著 + 78 篇 A-Z 分级故事，点词即查、整段朗读
        </p>
      </Link>

      {/* 支持作者 */}
      <Link
        to="/support"
        className="block text-center text-xs text-ink-400 hover:text-ink-700 py-2"
      >
        ☕ 请作者喝杯咖啡
      </Link>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="va-card text-center px-2 sm:px-6 py-3 sm:py-6">
      <div className="text-2xl sm:text-3xl font-semibold leading-tight">{value}</div>
      <div className="text-[11px] sm:text-sm text-ink-500 mt-0.5 sm:mt-1 whitespace-nowrap">
        {label}
      </div>
    </div>
  )
}