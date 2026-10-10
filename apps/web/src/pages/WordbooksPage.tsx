import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchWordbooks, fetchWordbookDetail, Wordbook } from '@/services/words'
import { useLearnStore } from '@/stores/learnStore'
import { trackEvent } from '@/services/stats'

export function WordbooksPage() {
  const navigate = useNavigate()
  const { setWordbook, startLearn, currentWordbookId } = useLearnStore()
  const [books, setBooks] = useState<Wordbook[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [preview, setPreview] = useState<{ id: string; words: string[] } | null>(null)

  useEffect(() => {
    fetchWordbooks()
      .then(setBooks)
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (id: string) => {
    setBusy(id)
    try {
      setWordbook(id)
      await startLearn()
      trackEvent('wordbook_select', id)
      navigate('/learn')
    } finally {
      setBusy('')
    }
  }

  const showPreview = async (id: string) => {
    if (preview?.id === id) {
      setPreview(null)
      return
    }
    try {
      const d = await fetchWordbookDetail(id)
      setPreview({ id, words: (d.preview || []).map((w: any) => w.headword) })
    } catch {
      setPreview({ id, words: [] })
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">选择词书</h1>
        <p className="text-ink-500 mt-1.5 text-sm">
          词数按平台真实词库统计 · 选好后学习新词只从这个词书里出
        </p>
      </header>

      {loading ? (
        <div className="text-sm text-ink-500 py-12 text-center">加载中…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {books.map((wb) => {
            const active = wb.id === currentWordbookId
            return (
              <div
                key={wb.id}
                className={`va-card space-y-2 transition-colors ${
                  active ? 'border-ink-900 ring-1 ring-ink-900' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-12 rounded-md shrink-0 flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: wb.coverColor }}
                  >
                    {wb.examTag}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{wb.name}</span>
                      {active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-900 text-white shrink-0">
                          学习中
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-500">{wb.description}</div>
                    <div className="text-xs text-ink-400 mt-1">
                      <strong className="text-ink-700 tabular-nums">
                        {wb.wordCount.toLocaleString()}
                      </strong>{' '}
                      词 · {wb.level}
                    </div>
                  </div>
                </div>

                {preview?.id === wb.id && (
                  <div className="text-[11px] text-ink-500 bg-ink-50 rounded-lg px-2.5 py-2">
                    示例词：
                    {preview.words.length > 0 ? (
                      <span className="font-mono">{preview.words.join(' · ')}</span>
                    ) : (
                      '加载中…'
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelect(wb.id)}
                    disabled={!!busy}
                    className="flex-1 py-2 rounded-lg bg-ink-900 text-white text-xs font-medium active:opacity-80 disabled:opacity-40"
                  >
                    {busy === wb.id ? '准备中…' : active ? '继续学习' : '开始学习'}
                  </button>
                  <button
                    onClick={() => showPreview(wb.id)}
                    className="px-3 py-2 rounded-lg bg-ink-50 text-ink-600 text-xs active:bg-ink-100"
                  >
                    {preview?.id === wb.id ? '收起' : '看例子'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && books.every((b) => b.wordCount === 0) && (
        <div className="va-card text-sm text-amber-700 bg-amber-50">
          词书统计为空 —— 可能是词库的考试标签还没导入，稍后再试。
        </div>
      )}

      <div className="va-card text-xs text-ink-500 space-y-1.5">
        <div className="text-sm font-semibold text-ink-700">关于词书</div>
        <ul className="space-y-1 leading-relaxed">
          <li>• 词数来自真实词库（基于 ECDICT 的考试标签），不是估算值</li>
          <li>• 选定词书后，「学习新词」只从这个词书里抽词</li>
          <li>• 不选也能学 —— 默认从全库高频词里出</li>
        </ul>
      </div>
    </div>
  )
}
