import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Rating, rate, nextWord, useLearnStore } from '@/stores/learnStore'

export function ReviewPage() {
  const { queue, index, currentWordbookId } = useLearnStore()
  const [revealed, setRevealed] = useState(false)

  if (!currentWordbookId) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <p className="text-ink-500 mb-4">请先选择词书</p>
        <Link to="/wordbooks" className="va-btn va-btn--primary va-btn--md inline-block">
          去选词书
        </Link>
      </div>
    )
  }

  const finished = queue.length > 0 && index >= queue.length
  if (finished) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="text-4xl">🎉</div>
        <h2 className="text-2xl font-semibold">今日复习完成</h2>
        <p className="text-ink-500">共 {queue.length} 张卡片</p>
        <Link to="/stats" className="va-btn va-btn--primary va-btn--md inline-block">
          查看学习报告
        </Link>
      </div>
    )
  }

  const current = queue[index]
  if (!current) {
    return <div className="p-8">暂无复习内容</div>
  }

  const handleRate = (r: Rating) => {
    rate(r)
    setRevealed(false)
    nextWord()
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between text-sm text-ink-500">
        <span>{index + 1} / {queue.length}</span>
        <span className="font-mono text-xs">{current.card.state}</span>
      </div>

      <div className="va-card text-center py-16">
        <div className="text-5xl font-semibold tracking-tight">{current.word.headword}</div>
        <div className="text-ink-500 mt-3 font-mono">{current.word.ipa}</div>

        {!revealed ? (
          <button onClick={() => setRevealed(true)} className="va-btn va-btn--primary va-btn--lg mt-8">
            显示释义
          </button>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="text-2xl text-ink-900">
              {current.word.senses.map((s) => s.definitionCn).join('；')}
            </div>

            <div className="grid grid-cols-4 gap-2 pt-4">
              <button onClick={() => handleRate(Rating.Again)} className="va-btn va-btn--md bg-red-50 text-red-700 hover:bg-red-100 border-0">忘记</button>
              <button onClick={() => handleRate(Rating.Hard)} className="va-btn va-btn--md bg-amber-50 text-amber-700 hover:bg-amber-100 border-0">困难</button>
              <button onClick={() => handleRate(Rating.Good)} className="va-btn va-btn--md bg-blue-50 text-blue-700 hover:bg-blue-100 border-0">良好</button>
              <button onClick={() => handleRate(Rating.Easy)} className="va-btn va-btn--md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0">简单</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}