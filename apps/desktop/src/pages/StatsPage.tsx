import { useLearnStore } from '@/stores/learnStore'

export function StatsPage() {
  const { todayLearned, todayReviewed, wrongWords, queue } = useLearnStore()
  const total = queue.length
  const progress = total > 0 ? Math.round((todayReviewed / total) * 100) : 0

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <h1 className="text-2xl font-semibold">学习报告</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="今日新词" value={todayLearned} />
        <Stat label="今日复习" value={todayReviewed} />
        <Stat label="错词本" value={wrongWords.length} />
        <Stat label="总词数" value={total} />
      </div>

      <div className="va-card">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">完成进度</div>
          <div className="text-sm text-ink-500">{progress}%</div>
        </div>
        <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
          <div className="h-full bg-ink-900 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="va-card text-center">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-sm text-ink-500 mt-1">{label}</div>
    </div>
  )
}