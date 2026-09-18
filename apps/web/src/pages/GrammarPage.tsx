import { useEffect, useState } from 'react'
import {
  fetchGrammarTopics,
  generateGrammar,
  GrammarTopic,
  GrammarResult,
  GrammarQuestion,
} from '@/services/grammar'
import { SpeakButton } from '@/components/SpeakButton'
import { trackEvent } from '@/services/stats'

const DIFF_LABEL: Record<string, string> = {
  easy: '入门',
  medium: '进阶',
  hard: '高阶',
}

const DIFF_COLOR: Record<string, string> = {
  easy: 'bg-green-50 text-green-700',
  medium: 'bg-amber-50 text-amber-700',
  hard: 'bg-red-50 text-red-700',
}

export function GrammarPage() {
  const [topics, setTopics] = useState<GrammarTopic[]>([])
  const [selected, setSelected] = useState<GrammarTopic | null>(null)
  const [result, setResult] = useState<GrammarResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGrammarTopics()
      .then(setTopics)
      .catch((e: any) => setError(e?.message ?? '知识点加载失败'))
  }, [])

  const handleSelect = async (t: GrammarTopic) => {
    setSelected(t)
    setResult(null)
    setError(null)
    setLoading(true)
    trackEvent('grammar_practice', t.title)
    try {
      const r = await generateGrammar(t.title, t.titleEn, 4)
      setResult(r)
    } catch (e: any) {
      setError(e?.message ?? '生成失败')
    } finally {
      setLoading(false)
    }
  }

  if (selected) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelected(null)} className="text-sm text-ink-500 hover:text-ink-900">
          ← 返回知识点列表
        </button>

        <header>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{selected.title}</h1>
            {selected.titleEn && (
              <span className="text-ink-500 font-mono text-lg">{selected.titleEn}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded ${DIFF_COLOR[selected.difficulty] ?? 'bg-ink-50 text-ink-600'}`}>
              {DIFF_LABEL[selected.difficulty] ?? selected.difficulty}
            </span>
            {selected.examTags.map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded bg-ink-50 text-ink-600">
                {t}
              </span>
            ))}
          </div>
        </header>

        {error && <div className="text-sm text-red-600">{error}</div>}

        {loading && <div className="va-card text-center text-ink-500 py-8">AI 正在准备讲解和题目...</div>}

        {result && !loading && <Lesson result={result} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">📝 语法学习</h1>
        <p className="text-ink-500 mt-1 text-sm">
          选择语法知识点，AI 讲解规则 + 出题巩固（覆盖雅思/托福/GRE/SAT）
        </p>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {topics.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t)}
            className="va-card hover:border-ink-900 transition-colors text-left space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{t.title}</span>
                {t.titleEn && <span className="font-mono text-xs text-ink-400">{t.titleEn}</span>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${DIFF_COLOR[t.difficulty] ?? 'bg-ink-50 text-ink-600'}`}>
                {DIFF_LABEL[t.difficulty] ?? t.difficulty}
              </span>
            </div>
            <p className="text-sm text-ink-500">{t.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============ 讲解 + 练习 ============ */

function Lesson({ result }: { result: GrammarResult }) {
  const [answers, setAnswers] = useState<Record<number, string>>({})

  return (
    <div className="space-y-4">
      {/* 整体讲解 */}
      {result.explanation && (
        <div className="va-card">
          <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">讲解</div>
          <p className="text-sm leading-relaxed text-ink-900">{result.explanation}</p>
        </div>
      )}

      {/* 核心规则 */}
      {result.rules.length > 0 && (
        <div className="va-card space-y-3">
          <div className="text-xs uppercase tracking-wider text-ink-500">核心规则</div>
          {result.rules.map((r, i) => (
            <div key={i} className="space-y-1">
              <div className="text-sm">
                <span className="font-semibold text-ink-900">{i + 1}. </span>
                {r.rule}
              </div>
              {r.example && (
                <div className="ml-5 space-y-0.5">
                  <div className="font-mono text-sm text-accent-deep flex items-center gap-2">
                    <span>{r.example}</span>
                    <SpeakButton text={r.example} className="w-6 h-6 text-xs" />
                  </div>
                  {r.example_translation && (
                    <div className="text-xs text-ink-500">{r.example_translation}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 例句 */}
      {result.examples.length > 0 && (
        <div className="va-card space-y-2">
          <div className="text-xs uppercase tracking-wider text-ink-500">更多例句</div>
          {result.examples.map((e, i) => (
            <div key={i} className="space-y-0.5">
              <div className="font-mono text-sm text-ink-900">{e.sentence}</div>
              {e.translation && <div className="text-xs text-ink-500">{e.translation}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 练习题 */}
      {result.questions.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs uppercase tracking-wider text-ink-500 pt-2">随堂练习</div>
          {result.questions.map((q, qi) => (
            <GrammarQuizCard
              key={qi}
              index={qi}
              question={q}
              selected={answers[qi] ?? null}
              onSelect={(label) => setAnswers((a) => ({ ...a, [qi]: label }))}
            />
          ))}
        </div>
      )}

      {result.is_mock && (
        <div className="text-xs text-ink-500">（当前为模板内容，AI 恢复后获得更完整的讲解）</div>
      )}
    </div>
  )
}

function GrammarQuizCard({
  index,
  question,
  selected,
  onSelect,
}: {
  index: number
  question: GrammarQuestion
  selected: string | null
  onSelect: (label: string) => void
}) {
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
              onClick={() => !answered && onSelect(c.label)}
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
        <div className="mt-3 text-sm bg-ink-50 rounded-lg p-3 space-y-1">
          <div className={isCorrect ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
            {isCorrect ? '✓ 正确' : `✗ 正确答案是 ${question.correct_label}`}
          </div>
          {question.explanation && (
            <div className="text-ink-600 leading-relaxed">{question.explanation}</div>
          )}
        </div>
      )}
    </div>
  )
}
