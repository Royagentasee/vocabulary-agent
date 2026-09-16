import { useState, useEffect } from 'react'
import { Rating } from '@vocab-agent/sdk-fsrs'
import type { Word, RootAffix } from '@vocab-agent/types'
import { explainWord } from '@/services/ai'
import { fetchMeaningQuiz, MeaningQuiz, fetchRootAffix } from '@/services/words'
import { AIExplainPanel } from '@/features/ai/AIExplainPanel'
import { QuizPanel } from '@/features/ai/QuizPanel'
import { WordRootCard } from '@/features/learn/WordRootCard'
import { SpeakButton } from '@/components/SpeakButton'
import { trackEvent } from '@/services/stats'

interface LearningCardProps {
  word: Word
  onRate: (rating: Rating) => void
  progress?: string  // 如 "3 / 20"
  cardState?: string // FSRS 状态，如 "review"
}

/**
 * 单词学习卡片：先选意思（4 选 1）→ 不懂再看解释
 * 选对自动评 Good，选错自动评 Again
 */
export function LearningCard({ word, onRate, progress, cardState }: LearningCardProps) {
  const [meaningQuiz, setMeaningQuiz] = useState<MeaningQuiz | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<Awaited<ReturnType<typeof explainWord>> | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [rootAffix, setRootAffix] = useState<RootAffix | null>(word.rootAffix ?? null)

  // 单词变化时重置并重新取选择题
  useEffect(() => {
    setMeaningQuiz(null)
    setSelected(null)
    setAnswered(false)
    setShowExplanation(false)
    setAiExplanation(null)
    fetchMeaningQuiz(word.headword).then(setMeaningQuiz)
  }, [word.headword])

  // 词根词缀：优先用词条自带数据；老数据（缓存的队列）没有则向后端兜底拉取
  useEffect(() => {
    if (word.rootAffix) {
      setRootAffix(word.rootAffix)
      return
    }
    setRootAffix(null)
    let alive = true
    fetchRootAffix(word.headword).then((r) => {
      if (alive) setRootAffix(r)
    })
    return () => {
      alive = false
    }
  }, [word.headword, word.rootAffix])

  const handleSelect = (label: string) => {
    if (answered || showExplanation) return
    setSelected(label)
    setAnswered(true)
    const isCorrect = meaningQuiz && label === meaningQuiz.correct_label
    trackEvent('learn_answer', isCorrect ? 'correct' : 'wrong')
    setTimeout(() => {
      onRate(isCorrect ? Rating.Good : Rating.Again)
    }, 1200)
  }

  const handleAskAI = async () => {
    setShowExplanation(true)
    setAiLoading(true)
    trackEvent('ai_explain', word.headword)
    try {
      const result = await explainWord(word.headword)
      setAiExplanation(result)
    } catch (e: any) {
      setAiExplanation({
        explanation: `调用失败: ${e?.message ?? '未知错误'}`,
        etymology: '',
        examples: [],
        difficulty: 'medium',
      })
    } finally {
      setAiLoading(false)
    }
  }

  const handleManualRate = (rating: Rating) => {
    onRate(rating)
  }

  const isCorrect = answered && meaningQuiz && selected === meaningQuiz.correct_label

  return (
    <div className="space-y-4">
      {progress && (
        <div className="flex items-center justify-between text-sm text-ink-500">
          <span>{progress}</span>
          {cardState && <span className="font-mono text-xs">{cardState}</span>}
        </div>
      )}

      {/* 单词卡片 */}
      <div className="va-card text-center py-10">
        <div className="flex items-center justify-center gap-3">
          <div className="text-5xl font-semibold tracking-tight">{word.headword}</div>
          <SpeakButton text={word.headword} audioUrl={word.audioUrl} />
        </div>
        {word.ipa && (
          <div className="text-ink-500 mt-3 font-mono flex items-center justify-center gap-2">
            <span>{word.ipa}</span>
          </div>
        )}

        {/* 词根词缀注释：常驻显示在单词下方 */}
        <WordRootCard rootAffix={rootAffix} className="mt-5 text-left" />

        {/* 选意思 4 选 1 */}
        <div className="mt-8 text-left">
          <p className="text-sm text-ink-500 text-center mb-4">选择正确的中文释义</p>

          {!meaningQuiz && !answered && (
            <p className="text-sm text-ink-500 text-center py-4">加载选项中...</p>
          )}

          {meaningQuiz && (
            <div className="grid grid-cols-1 gap-2">
              {meaningQuiz.choices.map((c) => {
                const isThisCorrect = answered && c.label === meaningQuiz.correct_label
                const isThisWrong = answered && selected === c.label && c.label !== meaningQuiz.correct_label
                const isSelected = selected === c.label
                return (
                  <button
                    key={c.label}
                    onClick={() => handleSelect(c.label)}
                    disabled={answered || showExplanation}
                    className={[
                      'flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-base transition-all',
                      isThisCorrect
                        ? 'bg-green-50 border-green-400 text-green-800'
                        : isThisWrong
                        ? 'bg-red-50 border-red-400 text-red-700'
                        : isSelected
                        ? 'bg-ink-50 border-ink-900'
                        : 'bg-white border-ink-100 hover:border-ink-900 hover:bg-ink-50',
                      answered && !isThisCorrect && !isThisWrong ? 'opacity-40' : '',
                    ].join(' ')}
                  >
                    <span className="font-mono font-semibold w-6 text-center">{c.label}</span>
                    <span className="flex-1">{c.text}</span>
                    {isThisCorrect && <span className="text-green-600">✓</span>}
                    {isThisWrong && <span className="text-red-500">✗</span>}
                  </button>
                )
              })}
            </div>
          )}

          {answered && (
            <div className="text-center pt-3">
              <p className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {isCorrect ? '✓ 正确！' : '✗ 选错了'}
                {!isCorrect && meaningQuiz && (
                  <span className="text-ink-500">
                    {' '}正确：{meaningQuiz.choices.find((c) => c.label === meaningQuiz.correct_label)?.text}
                  </span>
                )}
              </p>
              <p className="text-xs text-ink-500 mt-1">即将进入下一词...</p>
            </div>
          )}
        </div>

        {/* 实在不懂 → 看解释 */}
        {!showExplanation && !answered && (
          <button onClick={handleAskAI} className="va-btn va-btn--ghost va-btn--sm mt-6">
            💡 实在不懂，看解释
          </button>
        )}

        {/* 解释面板 */}
        {showExplanation && (
          <div className="mt-6 text-left">
            <AIExplainPanel loading={aiLoading} explanation={aiExplanation} onAsk={handleAskAI} />
          </div>
        )}

        {/* 看完解释后手动评分 */}
        {showExplanation && aiExplanation && !aiExplanation.explanation.includes('调用失败') && (
          <div className="mt-6">
            <div className="text-sm text-ink-500 mb-2">现在你记住了吗？</div>
            <div className="grid grid-cols-4 gap-2">
              <RateBtn label="忘记" color="red" onClick={() => handleManualRate(Rating.Again)} />
              <RateBtn label="困难" color="amber" onClick={() => handleManualRate(Rating.Hard)} />
              <RateBtn label="良好" color="blue" onClick={() => handleManualRate(Rating.Good)} />
              <RateBtn label="简单" color="emerald" onClick={() => handleManualRate(Rating.Easy)} />
            </div>
          </div>
        )}

        {/* AI 出题（看完解释后可选） */}
        {showExplanation && aiExplanation && !aiExplanation.explanation.includes('调用失败') && (
          <div className="mt-6 text-left">
            <QuizPanel headword={word.headword} />
          </div>
        )}
      </div>
    </div>
  )
}

function RateBtn({
  label,
  color,
  onClick,
}: {
  label: string
  color: 'red' | 'amber' | 'blue' | 'emerald'
  onClick: () => void
}) {
  const colorMap = {
    red: 'bg-red-50 text-red-700 hover:bg-red-100',
    amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  }
  return (
    <button onClick={onClick} className={`va-btn va-btn--md ${colorMap[color]} border-0`}>
      {label}
    </button>
  )
}
