import { useState } from 'react'
import { useLearnStore } from '@/stores/learnStore'
import {
  generateWriting,
  fetchWritingPrompts,
  WritingResult,
  WritingPrompt,
} from '@/services/writing'

type Mode = 'bank' | 'free'

export function WritingPage() {
  const [mode, setMode] = useState<Mode>('bank')

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">✍️ 写作助手</h1>
        <p className="text-ink-500 mt-1 text-sm">
          官方真题范文，或用你学过的单词自由写作
        </p>
      </header>

      <div className="flex gap-2">
        <TabBtn active={mode === 'bank'} onClick={() => setMode('bank')}>
          🏛️ 官方真题
        </TabBtn>
        <TabBtn active={mode === 'free'} onClick={() => setMode('free')}>
          ✏️ 自由主题
        </TabBtn>
      </div>

      {mode === 'bank' ? <BankWriting /> : <FreeWriting />}
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

/* ============ 官方真题范文 ============ */

function BankWriting() {
  const { learnedWords } = useLearnStore()
  const [taskType, setTaskType] = useState<'issue' | 'argument'>('issue')
  const [item, setItem] = useState<WritingPrompt | null>(null)
  const [total, setTotal] = useState(0)
  const [result, setResult] = useState<WritingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useLearned, setUseLearned] = useState(false)

  const recentWords = learnedWords.slice(-5).map((l) => l.word.headword)

  const draw = async () => {
    setDrawing(true)
    setError(null)
    setResult(null)
    try {
      const r = await fetchWritingPrompts({ limit: 1, taskType, shuffle: true })
      setTotal(r.total)
      if (r.items.length === 0) {
        setError('题库为空')
        setItem(null)
      } else {
        setItem(r.items[0])
      }
    } catch (e: any) {
      setError(e?.message ?? '抽题失败')
    } finally {
      setDrawing(false)
    }
  }

  const handleGenerate = async () => {
    if (!item) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const words = useLearned ? recentWords : []
      const r = await generateWriting(
        item.prompt,
        words,
        'academic',
        400,
        item.instruction,
        item.taskLabel,
      )
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
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">题型</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTaskType('issue')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                taskType === 'issue'
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-500 border-ink-100 hover:border-ink-900'
              }`}
            >
              Analyze an Issue
            </button>
            <button
              onClick={() => setTaskType('argument')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                taskType === 'argument'
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white text-ink-500 border-ink-100 hover:border-ink-900'
              }`}
            >
              Analyze an Argument
            </button>
          </div>
          {total > 0 && <span className="text-xs text-ink-500 ml-auto">题库 {total} 题</span>}
        </div>

        <button onClick={draw} disabled={drawing} className="va-btn va-btn--primary va-btn--md">
          {drawing ? '抽题中...' : item ? '换一道真题' : '抽一道官方真题'}
        </button>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {item && (
        <div className="va-card space-y-4">
          <div className="text-xs uppercase tracking-wider text-ink-500">
            {item.source} · {item.taskLabel}
          </div>

          <div>
            <div className="text-xs text-ink-500 mb-2">题目</div>
            <div className="text-[15px] leading-relaxed text-ink-900 bg-ink-50 rounded-xl p-4 whitespace-pre-wrap">
              {item.prompt}
            </div>
          </div>

          <div>
            <div className="text-xs text-ink-500 mb-2">写作指令（必须照此作答）</div>
            <div className="text-sm leading-relaxed text-ink-600 border-l-2 border-ink-900 pl-3">
              {item.instruction}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useLearned}
              onChange={(e) => setUseLearned(e.target.checked)}
              className="w-4 h-4"
            />
            顺便用上最近学过的词
            {recentWords.length > 0 && (
              <span className="text-ink-500 text-xs">（{recentWords.join('、')}）</span>
            )}
          </label>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="va-btn va-btn--primary va-btn--md"
          >
            {loading ? '生成范文中...' : '生成高分范文'}
          </button>

          {loading && (
            <div className="text-xs text-ink-500">AI 正在按官方评分标准写范文，约需 10-20 秒...</div>
          )}
        </div>
      )}

      {result && <ResultCard result={result} />}
    </div>
  )
}

/* ============ 自由主题 ============ */

function FreeWriting() {
  const { learnedWords } = useLearnStore()
  const [topic, setTopic] = useState('')
  const [result, setResult] = useState<WritingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useLearned, setUseLearned] = useState(true)

  const recentWords = learnedWords.slice(-5).map((l) => l.word.headword)

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('请先输入写作主题')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const words = useLearned ? recentWords : []
      const r = await generateWriting(topic.trim(), words)
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
          <label className="text-sm font-medium block mb-2">写作主题</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例：科技对教育的影响"
            className="w-full px-4 py-2.5 bg-white border border-ink-100 rounded-xl focus:outline-none focus:border-ink-900"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useLearned}
            onChange={(e) => setUseLearned(e.target.checked)}
            className="w-4 h-4"
          />
          使用最近学过的词
          {recentWords.length > 0 && (
            <span className="text-ink-500 text-xs">（{recentWords.join('、')}）</span>
          )}
        </label>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="va-btn va-btn--primary va-btn--md"
        >
          {loading ? '生成中...' : '生成短文'}
        </button>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {result && <ResultCard result={result} />}
    </div>
  )
}

function ResultCard({ result }: { result: WritingResult }) {
  return (
    <div className="va-card space-y-4">
      <h2 className="text-xl font-semibold">{result.title}</h2>

      <div className="text-base leading-relaxed whitespace-pre-wrap">
        {renderContent(result.content)}
      </div>

      {result.used_words?.length > 0 && (
        <div className="text-sm text-ink-500 pt-2 border-t border-ink-100">
          用到的词：
          {result.used_words.map((w) => (
            <span
              key={w}
              className="inline-block bg-accent-soft text-accent-deep px-2 py-0.5 rounded mx-1 text-xs font-medium"
            >
              {w}
            </span>
          ))}
        </div>
      )}

      {result.is_mock && (
        <div className="text-xs text-ink-500">（当前为模板生成，充值 AI 后获得更自然的短文）</div>
      )}
    </div>
  )
}

/** 渲染 **word** 高亮 */
function renderContent(content: string) {
  const parts = content.split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-accent-deep font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
