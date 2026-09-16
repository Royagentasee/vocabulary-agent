import { Link } from 'react-router-dom'
import { useLearnStore } from '@/stores/learnStore'

export function HomePage() {
  const { todayLearned, todayReviewed, wrongWords } = useLearnStore()

  return (
    <div className="p-8 space-y-8 max-w-5xl">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">你好，今天学一会儿 👋</h1>
        <p className="text-ink-500 mt-2">AI 陪伴，考点驱动，让每一个单词都记得更牢。</p>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <StatCard label="今日新词" value={todayLearned} />
        <StatCard label="今日复习" value={todayReviewed} />
        <StatCard label="错词本" value={wrongWords.length} />
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Link to="/wordbooks" className="va-card hover:border-ink-900 transition-colors">
          <h2 className="text-lg font-semibold">选词书开始</h2>
          <p className="text-sm text-ink-500 mt-2">从 GRE / 雅思 / 托福高频词库中选择</p>
        </Link>
        <Link to="/review" className="va-card hover:border-ink-900 transition-colors">
          <h2 className="text-lg font-semibold">继续复习</h2>
          <p className="text-sm text-ink-500 mt-2">FSRS 智能调度，到期卡片依次复现</p>
        </Link>
      </section>
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