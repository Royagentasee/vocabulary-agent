import { useLearnStore } from '@/stores/learnStore'

export function StatsPage() {
  const { todayLearned, todayReviewed, wrongWords, learnedWords } = useLearnStore()
  const total = learnedWords.length
  const progress = total > 0 ? Math.round((todayReviewed / total) * 100) : 0

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">学习报告</h1>
        <p className="text-ink-500 mt-1 text-sm">FSRS 帮你调度每一次复习</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="今日新词" value={todayLearned} />
        <StatCard label="今日复习" value={todayReviewed} />
        <StatCard label="错词本" value={wrongWords.length} />
        <StatCard label="已学词数" value={total} />
      </div>

      <div className="va-card">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">完成进度</div>
          <div className="text-sm text-ink-500">{progress}%</div>
        </div>
        <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-ink-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {wrongWords.length > 0 && (
        <div className="va-card">
          <div className="font-semibold mb-3">错词本（前 10 个）</div>
          <ul className="space-y-2">
            {wrongWords.slice(0, 10).map((w) => (
              <li key={w.word.id} className="text-sm flex items-center justify-between">
                <span className="font-mono">{w.word.headword}</span>
                <span className="text-ink-500">
                  {w.word.senses.map((s) => s.definitionCn).join('；')}
                  <span className="text-red-500 ml-2">×{w.wrongCount}</span>
                </span>
              </li>
            ))}
          </ul>
          {wrongWords.length > 10 && (
            <div className="text-xs text-ink-500 mt-2">
              还有 {wrongWords.length - 10} 个，去错题本查看全部
            </div>
          )}
        </div>
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
