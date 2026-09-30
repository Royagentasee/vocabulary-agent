import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchBooks,
  fetchLibraryStats,
  getAllProgress,
  BookSummary,
  LibraryStats,
  ReadingProgress,
} from '@/services/library'
import { trackEvent } from '@/services/stats'

type Tab = 'all' | 'story' | 'classic'

const LEVEL_STYLE: Record<string, string> = {
  A2: 'bg-green-100 text-green-700',
  B1: 'bg-blue-100 text-blue-700',
  B2: 'bg-purple-100 text-purple-700',
}

const LEVEL_LABEL: Record<string, string> = {
  A2: '入门',
  B1: '进阶',
  B2: '高阶',
}

// 按难度给书脊配色
const SPINE: Record<string, string> = {
  A2: 'from-green-500 to-emerald-600',
  B1: 'from-blue-500 to-indigo-600',
  B2: 'from-purple-500 to-fuchsia-600',
}

export function LibraryPage() {
  const nav = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [level, setLevel] = useState('')
  const [category, setCategory] = useState('')
  const [letter, setLetter] = useState('')
  const [books, setBooks] = useState<BookSummary[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [stats, setStats] = useState<LibraryStats | null>(null)
  const [progress, setProgress] = useState<ReadingProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLibraryStats().then(setStats).catch(() => {})
    setProgress(getAllProgress())
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchBooks({
      kind: tab === 'all' ? '' : tab,
      level,
      category,
      letter: tab === 'story' ? letter : '',
      limit: 500,
    })
      .then((r) => {
        setBooks(r.items)
        setCategories(r.categories)
      })
      .catch((e: any) => setError(e?.message ?? '加载失败'))
      .finally(() => setLoading(false))
  }, [tab, level, category, letter])

  const progressMap = useMemo(
    () => Object.fromEntries(progress.map((p) => [p.bookId, p])),
    [progress],
  )
  const continuing = progress.filter((p) => p.title).slice(0, 4)

  const openBook = (b: BookSummary, chapter = 0) => {
    trackEvent('library_open', b.id)
    nav(`/library/${b.id}${chapter > 0 ? `?c=${chapter}` : ''}`)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">📚 书库</h1>
        <p className="text-ink-500 mt-1 text-sm">
          原版阅读 · 点词查义 · 整段朗读
          {stats && (
            <span className="ml-2 text-ink-400">
              {stats.classicCount} 本名著 + {stats.storyCount} 篇分级故事 ·{' '}
              {(stats.totalWords / 10000).toFixed(0)} 万词
            </span>
          )}
        </p>
      </header>

      {/* 继续阅读 */}
      {continuing.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-ink-600">继续阅读</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {continuing.map((p) => (
              <button
                key={p.bookId}
                onClick={() => nav(`/library/${p.bookId}?c=${p.chapterIndex}`)}
                className="va-card hover:border-ink-900 transition-colors text-left flex items-center gap-3"
              >
                <span className="text-2xl">📖</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">{p.title}</span>
                  <span className="block text-xs text-ink-500">
                    读到第 {p.chapterIndex + 1} 章 · 点击继续
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 分类 Tab */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', '全部'],
            ['story', 'A-Z 分级小故事'],
            ['classic', '世界名著'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
              tab === k
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white text-ink-600 border-ink-100 hover:border-ink-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-500">难度</span>
        {['', 'A2', 'B1', 'B2'].map((l) => (
          <button
            key={l || 'all'}
            onClick={() => setLevel(l)}
            className={`px-3 py-1 rounded-full border transition-colors ${
              level === l ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-ink-100 text-ink-600'
            }`}
          >
            {l ? `${l} ${LEVEL_LABEL[l]}` : '全部'}
          </button>
        ))}

        {tab !== 'story' && categories.length > 0 && (
          <>
            <span className="text-ink-500 ml-3">分类</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-ink-100 bg-white text-ink-700"
            >
              <option value="">全部</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* A-Z 字母导航（仅小故事） */}
      {tab === 'story' && (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setLetter('')}
            className={`w-8 h-8 rounded text-sm ${
              letter === '' ? 'bg-ink-900 text-white' : 'bg-white border border-ink-100 text-ink-600'
            }`}
          >
            全
          </button>
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
            <button
              key={l}
              onClick={() => setLetter(l)}
              className={`w-8 h-8 rounded text-sm ${
                letter === l ? 'bg-ink-900 text-white' : 'bg-white border border-ink-100 text-ink-600'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* 书目 */}
      {loading ? (
        <div className="text-sm text-ink-500 py-8 text-center">加载中…</div>
      ) : books.length === 0 ? (
        <div className="text-sm text-ink-500 py-8 text-center">
          没有符合条件的书
          {tab === 'story' && stats?.storyCount === 0 && '（分级故事正在生成中）'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {books.map((b) => {
            const prog = progressMap[b.id]
            return (
              <button
                key={b.id}
                onClick={() => openBook(b, prog?.chapterIndex ?? 0)}
                className="va-card hover:border-ink-900 transition-colors text-left flex gap-3"
              >
                {/* 书脊 */}
                <div
                  className={`w-12 shrink-0 rounded-md bg-gradient-to-b ${
                    SPINE[b.level] || 'from-ink-400 to-ink-600'
                  } flex items-center justify-center text-white text-xs font-semibold py-3`}
                >
                  <span className="[writing-mode:vertical-rl] tracking-widest">
                    {b.kind === 'story' ? b.letter || 'A' : b.level}
                  </span>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{b.title}</div>
                      {b.titleZh && (
                        <div className="text-xs text-ink-500 truncate">{b.titleZh}</div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
                        LEVEL_STYLE[b.level] || 'bg-ink-100 text-ink-600'
                      }`}
                    >
                      {b.level}
                    </span>
                  </div>

                  <div className="text-xs text-ink-500 truncate">
                    {b.author}
                    {b.category && ` · ${b.category}`}
                  </div>

                  <div className="text-xs text-ink-400">
                    {(b.wordCount / 1000).toFixed(1)}k 词
                    {b.kind === 'classic' && ` · ${b.chapterCount} 章`}
                  </div>

                  {b.blurb && (
                    <div className="text-xs text-ink-500 line-clamp-2">{b.blurb}</div>
                  )}

                  {prog && (
                    <div className="text-[11px] text-accent-deep">
                      读到第 {prog.chapterIndex + 1} 章
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="text-xs text-ink-400 pt-2 border-t border-ink-100">
        名著均来自 <strong>Project Gutenberg</strong>（公共版权，作者逝世逾 70 年）；分级小故事为
        AI 原创。均无版权风险。
      </div>
    </div>
  )
}
