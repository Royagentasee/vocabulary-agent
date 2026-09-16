import { Link } from 'react-router-dom'

export function PracticePage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">专项练习</h1>
      <p className="text-ink-500 text-sm mb-8">多模式切换，强化记忆</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/review" className="va-card hover:border-ink-900 transition-colors">
          <div className="text-3xl mb-3">👀</div>
          <h2 className="text-lg font-semibold">看英忆中</h2>
          <p className="text-sm text-ink-500 mt-2">看英文单词回忆中文释义，最经典模式</p>
        </Link>
        <Link to="/review" className="va-card hover:border-ink-900 transition-colors">
          <div className="text-3xl mb-3">✍️</div>
          <h2 className="text-lg font-semibold">拼写听写</h2>
          <p className="text-sm text-ink-500 mt-2">看中文写英文，强化主动回忆</p>
        </Link>
        <Link to="/review" className="va-card hover:border-ink-900 transition-colors">
          <div className="text-3xl mb-3">📝</div>
          <h2 className="text-lg font-semibold">例句填空</h2>
          <p className="text-sm text-ink-500 mt-2">在真题语境中填词，理解用法</p>
        </Link>
      </div>
    </div>
  )
}