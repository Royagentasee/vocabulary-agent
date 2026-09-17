import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Rating, useLearnStore } from '@/stores/learnStore'
import { LearningCard } from '@/features/learn/LearningCard'

export function ReviewPage() {
  const { reviewQueue, reviewIndex, nextReview, reviewRate, learnedWords, startReview } = useLearnStore()

  // 进入复习页时，若还没有复习队列，自动筛选到期词
  useEffect(() => {
    if (reviewQueue.length === 0 && learnedWords.length > 0) {
      startReview()
    }
  }, [])

  // 没有学过的词
  if (learnedWords.length === 0) {
    return (
      <div className="va-card text-center space-y-4">
        <div className="text-4xl">📚</div>
        <h2 className="text-xl font-semibold">还没有可复习的词</h2>
        <p className="text-ink-500">先学习一些新单词，之后就能在这里复习了</p>
        <Link to="/wordbooks" className="va-btn va-btn--primary va-btn--md inline-block">
          去学新词
        </Link>
      </div>
    )
  }

  // 复习队列为空（学完但都还没到期）
  if (reviewQueue.length === 0) {
    return (
      <div className="va-card text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-semibold">暂无需要复习的词</h2>
        <p className="text-ink-500">已学 {learnedWords.length} 个词，都还没到复习时间</p>
        <Link to="/wordbooks" className="va-btn va-btn--primary va-btn--md inline-block">
          继续学新词
        </Link>
      </div>
    )
  }

  const finished = reviewIndex >= reviewQueue.length
  if (finished) {
    return (
      <div className="va-card text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-xl font-semibold">复习完成！</h2>
        <p className="text-ink-500">本次复习了 {reviewQueue.length} 个词</p>
        <Link to="/stats" className="va-btn va-btn--primary va-btn--md inline-block">
          查看学习报告
        </Link>
      </div>
    )
  }

  const current = reviewQueue[reviewIndex]
  if (!current) {
    return <div className="va-card text-center text-ink-500">加载中...</div>
  }

  const handleRate = (rating: Rating) => {
    reviewRate(rating)
    nextReview()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <LearningCard
        word={current.word}
        onRate={handleRate}
        progress={`${reviewIndex + 1} / ${reviewQueue.length}`}
        cardState={current.card.state}
      />
    </div>
  )
}
