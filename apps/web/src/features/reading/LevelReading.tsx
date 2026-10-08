import { useEffect, useState } from 'react'
import {
  fetchLevelStats,
  fetchLevelItems,
  fetchLevelDetail,
  LevelId,
  LevelItem,
  LevelDetail,
  LevelStats,
} from '@/services/readingLevels'
import { speakText } from '@/components/SpeakButton'
import { trackEvent } from '@/services/stats'

const LEVEL_META: { id: LevelId; label: string; desc: string; color: string }[] = [
  { id: 'junior', label: '初中', desc: '中考难度 · 1600 词', color: 'bg-green-100 text-green-700' },
  { id: 'senior', label: '高中', desc: '高考难度 · 3500 词', color: 'bg-blue-100 text-blue-700' },
  { id: 'college', label: '大学', desc: '四六级/考研 · 5500 词', color: 'bg-purple-100 text-purple-700' },
]

export function LevelReading() {
  const [level, setLevel] = useState<LevelId>('junior')
  const [stats, setStats] = useState<LevelStats | null>(null)
  const [items, setItems] = useState<LevelItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState('')

  useEffect(() => {
    fetchLevelStats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    if (!level) return
    setLoading(true)
    fetchLevelItems({ level, limit: 60 })
      .then((r) => {
        setItems(r.items)
        setTotal(r.total)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [level])

  if (openId) {
    return <PassageView id={openId} onBack={() => setOpenId('')} />
  }

  const countOf = (lv: LevelId) => stats?.byLevel.find((b) => b.level === lv)?.count ?? 0

  return (
    <div className="space-y-4">
      {/* 难度选择 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {LEVEL_META.map((m) => {
          const active = level === m.id
          return (
            <button
              key={m.id}
              onClick={() => {
                setLevel(m.id)
                trackEvent('reading_level', m.id)
              }}
              className={`p-3 rounded-xl border text-left transition-colors ${
                active
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'bg-white border-ink-100 hover:border-ink-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{m.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    active ? 'bg-white/20 text-white' : m.color
                  }`}
                >
                  {countOf(m.id)} 篇
                </span>
              </div>
              <div className={`text-xs mt-1 ${active ? 'text-white/60' : 'text-ink-500'}`}>
                {m.desc}
              </div>
            </button>
          )
        })}
      </div>

      {stats && (
        <div className="text-xs text-ink-500">
          共 {stats.total} 篇文章 · {stats.questionCount} 道题 · 点开文章即可作答，做完立刻看解析
        </div>
      )}

      {loading ? (
        <div className="text-sm text-ink-500 py-10 text-center">加载中…</div>
      ) : items.length === 0 ? (
        <div className="va-card text-center text-sm text-ink-500 py-10">
          这一档的文章还在生成中，稍后再来～
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => {
                setOpenId(it.id)
                trackEvent('reading_open', it.id)
              }}
              className="va-card w-full text-left hover:border-ink-900 transition-colors active:bg-ink-50 space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{it.title}</div>
                  {it.titleZh && (
                    <div className="text-xs text-ink-500 truncate">{it.titleZh}</div>
                  )}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600 shrink-0">
                  {it.topic}
                </span>
              </div>
              <div className="text-xs text-ink-400">
                {it.wordCount} 词 · {it.questionCount} 题
              </div>
              <div className="text-xs text-ink-500 line-clamp-2">{it.excerpt}</div>
            </button>
          ))}
          {total > items.length && (
            <div className="text-center text-xs text-ink-400 py-2">
              共 {total} 篇，已显示前 {items.length} 篇
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ============ 文章阅读 + 答题 ============ */

function PassageView({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<LevelDetail | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showZh, setShowZh] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchLevelDetail(id)
      .then(setData)
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [id])

  // 答完全部题目 → 记一次「读完一篇」（学习路径用）
  useEffect(() => {
    if (data && data.questions.length > 0 && Object.keys(answers).length === data.questions.length) {
      trackEvent('reading_done', data.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, data])

  if (loading) return <div className="text-sm text-ink-500 py-10 text-center">加载中…</div>
  if (error || !data)
    return (
      <div className="space-y-3">
        <button onClick={onBack} className="text-sm text-ink-500">
          ← 返回列表
        </button>
        <div className="text-sm text-red-600">{error || '文章不存在'}</div>
      </div>
    )

  const answered = Object.keys(answers).length
  const correct = data.questions.filter((q, i) => answers[i] === q.correctLabel).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="text-sm text-ink-500 hover:text-ink-900 shrink-0">
          ← 返回列表
        </button>
        <div className="text-right min-w-0">
          <div className="text-sm font-medium truncate">{data.title}</div>
          <div className="text-xs text-ink-500">
            {data.levelName} · {data.wordCount} 词
          </div>
        </div>
      </div>

      {/* 正文 */}
      <div className="va-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 text-ink-600">
            {data.topic}
          </span>
          <button
            onClick={() => speakText(data.passage)}
            className="w-8 h-8 rounded-full bg-ink-50 hover:bg-ink-900 hover:text-white flex items-center justify-center"
            title="朗读全文"
          >
            🔊
          </button>
        </div>
        <div className="space-y-3 leading-[1.9] text-[15px]">
          {data.passage.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>

      {/* 题目 */}
      <div className="va-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">阅读理解</div>
          <div className="text-xs text-ink-500">
            {answered > 0 ? `${correct}/${answered} 正确` : `${data.questions.length} 题`}
          </div>
        </div>

        {data.questions.map((q, qi) => {
          const chosen = answers[qi]
          return (
            <div key={qi} className="space-y-2 pb-3 border-b border-ink-100 last:border-0">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium shrink-0">{qi + 1}.</span>
                <div className="flex-1 space-y-1">
                  <div className="text-sm leading-relaxed">{q.question}</div>
                  {q.questionType && (
                    <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-ink-50 text-ink-500">
                      {q.questionType}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 pl-5">
                {q.choices.map((c) => {
                  const isRight = c.label === q.correctLabel
                  const picked = chosen === c.label
                  return (
                    <button
                      key={c.label}
                      disabled={!!chosen}
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: c.label }))}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors flex gap-2 ${
                        !chosen
                          ? 'border-ink-100 hover:border-ink-900 active:bg-ink-50'
                          : isRight
                          ? 'border-green-400 bg-green-50 text-green-800'
                          : picked
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-ink-100 text-ink-400'
                      }`}
                    >
                      <span className="font-medium shrink-0">{c.label}.</span>
                      <span className="flex-1">{c.text}</span>
                      {chosen && isRight && <span className="shrink-0">✓</span>}
                      {chosen && picked && !isRight && <span className="shrink-0">✕</span>}
                    </button>
                  )
                })}
              </div>

              {chosen && q.explanation && (
                <div className="ml-5 text-xs text-ink-600 bg-ink-50 rounded-lg p-2.5 leading-relaxed">
                  <span className="font-medium">解析：</span>
                  {q.explanation}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {answered === data.questions.length && (
        <div className="va-card text-center space-y-2">
          <div className="text-2xl">
            {correct === data.questions.length ? '🎉' : correct >= data.questions.length / 2 ? '👍' : '💪'}
          </div>
          <div className="text-sm font-medium">
            答对 {correct}/{data.questions.length} 题
          </div>
          <div className="text-xs text-ink-500">
            {correct === data.questions.length
              ? '全对！可以挑战更高难度了'
              : correct >= data.questions.length / 2
              ? '不错，再看看错题的解析'
              : '别灰心，读慢一点，先看解析再重读文章'}
          </div>
          <div className="flex gap-2 justify-center pt-1">
            <button
              onClick={() => {
                setAnswers({})
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="va-btn va-btn--secondary va-btn--sm"
            >
              重做一遍
            </button>
            <button onClick={onBack} className="va-btn va-btn--primary va-btn--sm">
              换一篇
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
