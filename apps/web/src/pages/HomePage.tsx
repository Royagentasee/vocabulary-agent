import { Link } from 'react-router-dom'
import { useLearnStore } from '@/stores/learnStore'

const GOAL_OPTIONS = [5, 10, 15, 20, 30, 50]

export function HomePage() {
  const { todayLearned, todayReviewed, wrongWords, learnedWords, dailyGoal, setDailyGoal } = useLearnStore()

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">你好，今天学一会儿 👋</h1>
        <p className="text-ink-500 mt-2">AI 陪伴，考点驱动，让每一个单词都记得更牢。</p>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <StatCard label="今日新词" value={todayLearned} />
        <StatCard label="今日复习" value={todayReviewed} />
        <StatCard label="已学词数" value={learnedWords.length} />
      </section>

      {/* 每日背词数量设置 */}
      <section className="va-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="font-medium">每日背词数量</div>
            <div className="text-sm text-ink-500">每天学习多少个新单词，随时可改</div>
          </div>
          <div className="flex flex-wrap gap-1">
            {GOAL_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setDailyGoal(n)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
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

      <section className="grid grid-cols-2 gap-4">
        <Link
          to="/wordbooks"
          className="va-card hover:border-ink-900 transition-colors flex flex-col gap-2"
        >
          <h2 className="text-lg font-semibold">📖 学习新词</h2>
          <p className="text-sm text-ink-500">每天学 {dailyGoal} 个新单词，先选意思再看解释</p>
        </Link>
        <Link
          to="/review"
          className="va-card hover:border-ink-900 transition-colors flex flex-col gap-2"
        >
          <h2 className="text-lg font-semibold">🔄 复习旧词</h2>
          <p className="text-sm text-ink-500">从学过的单词里随机抽取，巩固记忆</p>
        </Link>
      </section>

      {wrongWords.length > 0 && (
        <Link
          to="/wrongbook"
          className="va-card hover:border-ink-900 transition-colors flex flex-col gap-2"
        >
          <h2 className="text-lg font-semibold">📕 错题本（{wrongWords.length}）</h2>
          <p className="text-sm text-ink-500">答错的单词都在这里，点进去巩固复习</p>
        </Link>
      )}
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