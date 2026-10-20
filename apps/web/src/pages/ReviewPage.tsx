import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Rating, useLearnStore, isQueueStale } from '@/stores/learnStore'
import { trackEvent } from '@/services/stats'
import { LearningCard } from '@/features/learn/LearningCard'

export function ReviewPage() {
  useEffect(() => {
    trackEvent('review_open')
  }, [])
  const {
    reviewQueue, reviewIndex, nextReview, reviewRate,
    learnedWords, startReview, lastActiveDate,
  } = useLearnStore()

  // 进入复习页时重建队列。
  //
  // 之前只判断「队列为空」，于是上次复习走完的队列被持久化下来，
  // 一点「去复习」就直接跳到「复习完成」屏，显示的还是老队列的数量。
  // 现在三种情况都重建：队列为空 / 上次已走完 / 跨天了。
  useEffect(() => {
    if (learnedWords.length === 0) return
    const done = reviewQueue.length > 0 && reviewIndex >= reviewQueue.length
    if (reviewQueue.length === 0 || done || isQueueStale(lastActiveDate)) {
      startReview()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    trackEvent('review_answer', String(rating))
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
