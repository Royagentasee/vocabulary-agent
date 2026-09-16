import type { AIExplanationResponse } from '@vocab-agent/types'
import { WordRootCard } from '@/features/learn/WordRootCard'

interface Props {
  loading: boolean
  explanation: AIExplanationResponse | null
  onAsk: () => void
}

export function AIExplainPanel({ loading, explanation, onAsk }: Props) {
  if (!explanation && !loading) {
    return (
      <button
        onClick={onAsk}
        className="va-btn va-btn--secondary va-btn--sm"
      >
        ✨ 让 AI 解释
      </button>
    )
  }

  if (loading) {
    return (
      <div className="text-sm text-ink-500 py-2">AI 思考中...</div>
    )
  }

  const root = explanation?.rootAffix

  return (
    <div className="text-left bg-accent-soft rounded-xl p-4 text-sm space-y-3">
      <div className="flex items-center gap-2 text-accent">
        <span>✨</span>
        <span className="font-semibold">AI 解读</span>
      </div>

      {/* 词根词缀拆解（结构化展示） */}
      <WordRootCard rootAffix={root} />

      {/* 词源说明（没有拆解时才单独显示词源） */}
      {explanation?.etymology && !(root && (root.prefix || root.root || root.suffix)) && (
        <div>
          <span className="text-ink-500">词源：</span>
          {explanation.etymology}
        </div>
      )}

      {/* 记忆窍门 */}
      {explanation?.explanation && (
        <div className="text-ink-900">
          <span className="text-ink-500">💡 记忆：</span>
          {explanation.explanation}
        </div>
      )}
    </div>
  )
}
