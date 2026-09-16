import { useState } from 'react'
import { generateQuiz, Quiz } from '@/services/quiz'

interface QuizPanelProps {
  headword: string
  onClose?: () => void
}

/**
 * AI 出题面板：完形填空 4 选 1
 */
export function QuizPanel({ headword, onClose }: QuizPanelProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setSelected(null)
    setAnswered(false)
    setQuiz(null)
    try {
      const result = await generateQuiz(headword)
      setQuiz(result)
    } catch (e: any) {
      setError(e?.message ?? '出题失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (label: string) => {
    if (answered) return
    setSelected(label)
    setAnswered(true)
  }

  return (
    <div className="bg-amber-50 rounded-xl p-4 text-left space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-700">
          <span>🎯</span>
          <span className="font-semibold">AI 出题</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-amber-500 hover:text-amber-700 text-sm">
            ×
          </button>
        )}
      </div>

      {!quiz && !loading && !error && (
        <button
          onClick={handleGenerate}
          className="va-btn va-btn--secondary va-btn--sm"
        >
          🎯 用「{headword}」出一题
        </button>
      )}

      {loading && (
        <div className="text-sm text-amber-700 py-2">AI 出题中...</div>
      )}

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {quiz && (
        <>
          <div className="text-sm text-ink-900 leading-relaxed font-medium">
            {quiz.sentence.split('_______').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="inline-block px-2 py-0.5 bg-amber-200 rounded font-mono mx-1">
                    _______
                  </span>
                )}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {quiz.choices.map((c) => {
              const isCorrect = answered && c.label === quiz.correct_label
              const isWrong = answered && selected === c.label && c.label !== quiz.correct_label
              const isSelected = selected === c.label
              return (
                <button
                  key={c.label}
                  onClick={() => handleSelect(c.label)}
                  disabled={answered}
                  className={[
                    'text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                    isCorrect
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : isWrong
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : isSelected
                      ? 'bg-amber-100 border-amber-300'
                      : 'bg-white border-ink-100 hover:border-amber-300',
                    answered && !isCorrect && !isWrong ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  <span className="font-mono font-semibold mr-2">{c.label}.</span>
                  {c.text}
                  {isCorrect && <span className="ml-2">✓</span>}
                  {isWrong && <span className="ml-2">✗</span>}
                </button>
              )
            })}
          </div>

          {answered && (
            <div className="text-xs text-ink-500 bg-white/60 rounded-lg p-3">
              {quiz.explanation}
            </div>
          )}

          {answered && (
            <button
              onClick={handleGenerate}
              className="va-btn va-btn--ghost va-btn--sm"
            >
              ↻ 再来一题
            </button>
          )}
        </>
      )}
    </div>
  )
}