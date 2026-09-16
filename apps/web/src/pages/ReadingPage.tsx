import { useState } from 'react'
import {
  generateReading,
  fetchReadingBank,
  ReadingResult,
  ReadingQuestion,
  BankItem,
} from '@/services/reading'

type Mode = 'bank' | 'ai'

export function ReadingPage() {
  const [mode, setMode] = useState<Mode>('bank')

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">📖 阅读理解</h1>
        <p className="text-ink-500 mt-1 text-sm">
          官方真题实战，或粘贴自己的文章让 AI 出题
        </p>
      </header>

      <div className="flex gap-2">
        <TabBtn active={mode === 'bank'} onClick={() => setMode('bank')}>
          🏛️ 官方真题库
        </TabBtn>
        <TabBtn active={mode === 'ai'} onClick={() => setMode('ai')}>
          🤖 AI 出题
        </TabBtn>
      </div>

      {mode === 'bank' ? <BankPractice /> : <AiPractice />}
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-ink-900 text-white'
          : 'bg-white text-ink-500 border border-ink-100 hover:border-ink-900'
      }`}
    >
      {children}
    </button>
  )
}

/* ============ 官方真题练习 ============ */

function BankPractice() {
  const [items, setItems] = useState<BankItem[]>([])
  const [total, setTotal] = useState(0)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [finished, setFinished] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    setFinished(false)
    setIndex(0)
    setSelected(null)
    setCorrectCount(0)
    setAnsweredCount(0)
    try {
      const r = await fetchReadingBank({ limit: 10, shuffle: true })
      setItems(r.items)
      setTotal(r.total)
      if (r.items.length === 0) setError('题库为空')
    } catch (e: any) {
      setError(e?.message ?? '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const current = items[index]

  const handleSelect = (label: string) => {
    if (selected !== null || !current) return
    setSelected(label)
    setAnsweredCount((n) => n + 1)
    if (label === current.correctLabel) setCorrectCount((n) => n + 1)
  }

  const handleNext = () => {
    if (index + 1 >= items.length) {
      setFinished(true)
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
  }

  if (items.length === 0 || finished) {
    return (
      <div className="va-card text-center space-y-4">
        {finished ? (
          <>
            <div className="text-4xl">🎉</div>
            <h2 className="text-xl font-semibold">本组练习完成</h2>
            <p className="text-ink-500">
              答对 {correctCount} / {answeredCount} 题
              （正确率 {answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0}%）
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl">🏛️</div>
            <h2 className="text-lg font-semibold">官方真题库</h2>
            <p className="text-sm text-ink-500">
              收录 College Board 官方 SAT 练习题 {total || ''} 道，随机抽 10 题练习
            </p>
          </>
        )}
        <button onClick={load} disabled={loading} className="va-btn va-btn--primary va-btn--md">
          {loading ? '加载中...' : finished ? '再来一组' : '开始练习'}
        </button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    )
  }

  const answered = selected !== null
  const isCorrect = answered && selected === current.correctLabel

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-ink-500">
        <span>
          第 {index + 1} / {items.length} 题
        </span>
        <span>
          已答对 {correctCount} / {answeredCount}
        </span>
      </div>

      <div className="va-card">
        <div className="text-xs uppercase tracking-wider text-ink-500 mb-3">
          {current.source}
        </div>

        <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink-900 bg-ink-50 rounded-xl p-4">
          {current.passage}
        </div>

        <div className="font-medium mt-5 mb-4">{current.question}</div>

        <div className="space-y-2">
          {current.choices.map((c) => {
            const isThisCorrect = answered && c.label === current.correctLabel
            const isThisWrong = answered && selected === c.label && c.label !== current.correctLabel
            return (
              <button
                key={c.label}
                onClick={() => handleSelect(c.label)}
                disabled={answered}
                className={[
                  'flex items-start gap-3 w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors',
                  isThisCorrect
                    ? 'bg-green-50 border-green-400'
                    : isThisWrong
                    ? 'bg-red-50 border-red-400'
                    : 'bg-white border-ink-100 hover:border-ink-900',
                  answered && !isThisCorrect && !isThisWrong ? 'opacity-50' : '',
                ].join(' ')}
              >
                <span className="font-mono font-semibold">{c.label})</span>
                <span className="flex-1">{c.text}</span>
                {isThisCorrect && <span className="text-green-600">✓</span>}
                {isThisWrong && <span className="text-red-500">✗</span>}
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="mt-4 text-sm bg-ink-50 rounded-lg p-4 space-y-2">
            <div className={isCorrect ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
              {isCorrect ? '✓ 回答正确' : `✗ 回答错误，正确答案是 ${current.correctLabel}`}
            </div>
            {current.explanation && (
              <div className="text-ink-600 leading-relaxed">{current.explanation}</div>
            )}
          </div>
        )}

        {answered && (
          <button onClick={handleNext} className="va-btn va-btn--primary va-btn--md mt-4">
            {index + 1 >= items.length ? '查看结果' : '下一题'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ============ AI 出题 ============ */

function AiPractice() {
  const [passage, setPassage] = useState('')
  const [numQuestions, setNumQuestions] = useState(3)
  const [result, setResult] = useState<ReadingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (passage.trim().length < 50) {
      setError('请粘贴至少 50 字的英文文章')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const r = await generateReading(passage.trim(), numQuestions)
      setResult(r)
    } catch (e: any) {
      setError(e?.message ?? '生成失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="va-card space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2">英文文章</label>
          <textarea
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            rows={8}
            placeholder="粘贴一篇英文文章（至少 50 字）..."
            className="w-full px-4 py-3 bg-white border border-ink-100 rounded-xl focus:outline-none focus:border-ink-900 resize-y"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">题目数量</label>
          <select
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="px-3 py-2 border border-ink-100 rounded-lg"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} 题</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="va-btn va-btn--primary va-btn--md"
        >
          {loading ? '出题中...' : '生成阅读理解题'}
        </button>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {result && (
        <div className="space-y-4">
          {result.summary && (
            <div className="va-card">
              <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">文章摘要</div>
              <p className="text-sm text-ink-900">{result.summary}</p>
            </div>
          )}

          {result.questions.map((q, qi) => (
            <QuestionCard key={qi} index={qi} question={q} />
          ))}

          {result.is_mock && (
            <div className="text-xs text-ink-500">（当前为模板出题，充值 AI 后获得更精准的题目）</div>
          )}
        </div>
      )}
    </div>
  )
}

function QuestionCard({ index, question }: { index: number; question: ReadingQuestion }) {
  const [selected, setSelected] = useState<string | null>(null)
  const answered = selected !== null
  const isCorrect = answered && selected === question.correct_label

  return (
    <div className="va-card">
      <div className="text-sm text-ink-500 mb-2">第 {index + 1} 题</div>
      <div className="font-medium mb-4">{question.question}</div>

      <div className="space-y-2">
        {question.choices.map((c) => {
          const isThisCorrect = answered && c.label === question.correct_label
          const isThisWrong = answered && selected === c.label && c.label !== question.correct_label
          return (
            <button
              key={c.label}
              onClick={() => !answered && setSelected(c.label)}
              disabled={answered}
              className={[
                'flex items-start gap-3 w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors',
                isThisCorrect
                  ? 'bg-green-50 border-green-400'
                  : isThisWrong
                  ? 'bg-red-50 border-red-400'
                  : 'bg-white border-ink-100 hover:border-ink-900',
                answered && !isThisCorrect && !isThisWrong ? 'opacity-50' : '',
              ].join(' ')}
            >
              <span className="font-mono font-semibold">{c.label}.</span>
              <span className="flex-1">{c.text}</span>
              {isThisCorrect && <span className="text-green-600">✓</span>}
              {isThisWrong && <span className="text-red-500">✗</span>}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="mt-3 text-sm text-ink-600 bg-ink-50 rounded-lg p-3">
          {question.explanation}
        </div>
      )}
    </div>
  )
}
