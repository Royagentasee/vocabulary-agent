import { Link } from 'react-router-dom'
import { Rating, useLearnStore } from '@/stores/learnStore'
import { LearningCard } from '@/features/learn/LearningCard'

const GOAL_OPTIONS = [5, 10, 15, 20, 30, 50]

export function LearnPage() {
  const {
    learnQueue, learnIndex, nextLearn, learnRate,
    currentWordbookId, dailyGoal, setDailyGoal, startLearn,
  } = useLearnStore()

  if (!currentWordbookId) {
    return (
      <div className="va-card text-center">
        <p className="text-ink-500">请先选择词书</p>
        <Link to="/wordbooks" className="va-btn va-btn--primary va-btn--md mt-4 inline-block">
          去选词书
        </Link>
      </div>
    )
  }

  const finished = learnQueue.length > 0 && learnIndex >= learnQueue.length
  if (finished) {
    return (
      <div className="va-card text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-semibold">今日新词学完了！</h2>
        <p className="text-ink-500">共学了 {learnQueue.length} 个新词</p>
        <div className="flex justify-center gap-3">
          <Link to="/review" className="va-btn va-btn--primary va-btn--md">
            去复习
          </Link>
        </div>
      </div>
    )
  }

  if (learnQueue.length === 0) {
    return (
      <div className="va-card text-center">
        <p className="text-ink-500">暂无新词，选词书开始学习</p>
        <Link to="/wordbooks" className="va-btn va-btn--primary va-btn--md mt-4 inline-block">
          选词书开始
        </Link>
      </div>
    )
  }

  const current = learnQueue[learnIndex]
  if (!current) {
    return <div className="va-card text-center text-ink-500">加载中...</div>
  }

  const handleRate = (rating: Rating) => {
    learnRate(rating)
    nextLearn()
  }

  const handleGoalChange = (n: number) => {
    setDailyGoal(n)
    // 重新取词（按新数量）
    startLearn()
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 每日词数选择器 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <span className="text-sm text-ink-500">每日背词数量</span>
        <div className="flex flex-wrap gap-1">
          {GOAL_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => handleGoalChange(n)}
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

      <LearningCard
        word={current}
        onRate={handleRate}
        progress={`${learnIndex + 1} / ${learnQueue.length}`}
      />
    </div>
  )
}
