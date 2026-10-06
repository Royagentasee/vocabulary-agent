import { Link } from 'react-router-dom'
import { useLearnStore } from '@/stores/learnStore'
import { DailyPlan } from '@/features/plan/DailyPlan'

const GOAL_OPTIONS = [5, 10, 15, 20, 30, 50]

export function HomePage() {
  const { todayLearned, todayReviewed, wrongWords, learnedWords, dailyGoal, setDailyGoal } = useLearnStore()

  return (
    <div className="space-y-5 sm:space-y-8">
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