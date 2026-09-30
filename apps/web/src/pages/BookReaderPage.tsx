import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  fetchBook,
  fetchChapter,
  saveProgress,
  BookDetail,
  ChapterContent,
} from '@/services/library'
import { getWordDetail } from '@/services/search'
import { speakText } from '@/components/SpeakButton'
import { trackEvent } from '@/services/stats'

const WORDS_PER_PAGE = 900

interface PopupState {
  word: string
  loading: boolean
  data: any | null
  notFound: boolean
}

export function BookReaderPage() {
  const { bookId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const nav = useNavigate()

  const [book, setBook] = useState<BookDetail | null>(null)
  const [chapter, setChapter] = useState<ChapterContent | null>(null)
  const [chapterIndex, setChapterIndex] = useState(Number(searchParams.get('c') || 0))
  const [page, setPage] = useState(0)
  const [showZh, setShowZh] = useState(false)
  const [showVocab, setShowVocab] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [popup, setPopup] = useState<PopupState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const cacheRef = useRef<Record<string, any>>({})

  /* 加载书籍信息 */
  useEffect(() => {
    fetchBook(bookId)
      .then(setBook)
      .catch((e: any) => setError(e?.message ?? '书籍加载失败'))
  }, [bookId])

  /* 加载章节 */
  useEffect(() => {
    setLoading(true)
    setError(null)
    setPopup(null)
    fetchChapter(bookId, chapterIndex)
      .then((c) => {
        setChapter(c)
        setPage(0)
        setAnswers({})
        setShowZh(false)
        setShowQuiz(false)
        saveProgress(bookId, chapterIndex, book?.title || c.title)
        trackEvent('library_chapter', `${bookId}#${chapterIndex}`)
      })
      .catch((e: any) => setError(e?.message ?? '章节加载失败'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, chapterIndex])

  /* 章节分页 */
  const pages = useMemo(() => {
    if (!chapter) return [] as string[][]
    const paras = chapter.text.split(/\n\s*\n/).filter((p) => p.trim())
    const out: string[][] = []
    let cur: string[] = []
    let words = 0
    for (const p of paras) {
      const w = p.split(/\s+/).length
      if (words + w > WORDS_PER_PAGE && cur.length > 0) {
        out.push(cur)
        cur = []
        words = 0
      }
      cur.push(p)
      words += w
    }
    if (cur.length) out.push(cur)
    return out.length ? out : [['']]
  }, [chapter])

  const currentParas = pages[page] || []

  /* 点词查义 */
  const lookup = useCallback(async (raw: string) => {
    const word = raw.replace(/^[^A-Za-z'-]+|[^A-Za-z'-]+$/g, '')
    if (!word || word.length < 2) return

    const key = word.toLowerCase()
    if (cacheRef.current[key]) {
      setPopup({ word, loading: false, data: cacheRef.current[key], notFound: false })
      return
    }
    setPopup({ word, loading: true, data: null, notFound: false })
    const data = await getWordDetail(key)
    if (data) cacheRef.current[key] = data
    setPopup({ word, loading: false, data, notFound: !data })
  }, [])

  /* 整段朗读 */
  const speak = (text: string) => {
    speakText(text)
  }

  const goChapter = (idx: number | null) => {
    if (idx === null || idx < 0) return
    setChapterIndex(idx)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isStory = book?.kind === 'story'

  return (
    <div className="space-y-4 max-w-3xl" onClick={() => popup && setPopup(null)}>
      {/* 顶部 */}
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => nav('/library')}
          className="text-sm text-ink-500 hover:text-ink-900 shrink-0"
        >
          ← 返回书库
        </button>
        {book && (
          <div className="text-right min-w-0">
            <div className="text-sm font-medium truncate">{book.title}</div>
            <div className="text-xs text-ink-500 truncate">
              {book.author} · {book.level}
            </div>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading && !chapter && (
        <div className="text-sm text-ink-500 py-12 text-center">加载中…</div>
      )}

      {chapter && (
        <>
          {/* 章节标题 */}
          <div className="va-card space-y-1">
            <div className="text-xs text-ink-400">
              {isStory ? `${chapter.titleZh || chapter.title}` : `第 ${chapterIndex + 1} 章 / ${book?.chapterCount ?? '?'}`}
            </div>
            {!isStory && <div className="text-lg font-semibold">{chapter.title}</div>}
            <div className="text-xs text-ink-500">
              {chapter.wordCount} 词
              {pages.length > 1 && ` · 第 ${page + 1}/${pages.length} 页`}
            </div>
          </div>

          {/* 正文 */}
          <div className="va-card space-y-4 leading-[1.9] text-[15px]">
            {currentParas.map((para, pi) => (
              <div key={pi} className="group relative">
                <p>
                  {para.split(/(\s+)/).map((tok, ti) =>
                    /[A-Za-z]/.test(tok) ? (
                      <span
                        key={ti}
                        onClick={(e) => {
                          e.stopPropagation()
                          lookup(tok)
                        }}
                        className="cursor-pointer hover:bg-accent-soft hover:text-accent-deep rounded px-[1px] transition-colors"
                      >
                        {tok}
                      </span>
                    ) : (
                      <span key={ti}>{tok}</span>
                    ),
                  )}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    speak(para)
                  }}
                  className="absolute -left-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-white border border-ink-100 rounded-full w-6 h-6 flex items-center justify-center shadow-sm"
                  title="朗读本段"
                >
                  🔊
                </button>
              </div>
            ))}
          </div>

          {/* 分页控制 */}
          {pages.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setPage((p) => Math.max(0, p - 1))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                disabled={page === 0}
                className="va-btn va-btn--secondary va-btn--sm disabled:opacity-40"
              >
                上一页
              </button>
              <span className="text-sm text-ink-500">
                {page + 1} / {pages.length}
              </span>
              <button
                onClick={() => {
                  setPage((p) => Math.min(pages.length - 1, p + 1))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                disabled={page >= pages.length - 1}
                className="va-btn va-btn--secondary va-btn--sm disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          )}

          {/* 小故事：翻译 / 生词 / 题目 */}
          {isStory && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {chapter.translation && (
                  <button
                    onClick={() => setShowZh((v) => !v)}
                    className="va-btn va-btn--secondary va-btn--sm"
                  >
                    {showZh ? '隐藏翻译' : '显示翻译'}
                  </button>
                )}
                {chapter.vocabulary.length > 0 && (
                  <button
                    onClick={() => setShowVocab((v) => !v)}
                    className="va-btn va-btn--secondary va-btn--sm"
                  >
                    {showVocab ? '隐藏生词表' : `生词表 (${chapter.vocabulary.length})`}
                  </button>
                )}
                {chapter.questions.length > 0 && (
                  <button
                    onClick={() => setShowQuiz((v) => !v)}
                    className="va-btn va-btn--secondary va-btn--sm"
                  >
                    {showQuiz ? '隐藏练习' : `理解练习 (${chapter.questions.length})`}
                  </button>
                )}
              </div>

              {showZh && chapter.translation && (
                <div className="va-card bg-ink-50/60 space-y-3 text-sm leading-[1.9] text-ink-700">
                  {chapter.translation.split(/\n\s*\n/).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              {showVocab && chapter.vocabulary.length > 0 && (
                <div className="va-card space-y-2">
                  <div className="text-sm font-semibold">生词表</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {chapter.vocabulary.map((v, i) => (
                      <div key={i} className="flex items-baseline gap-2 text-sm">
                        <button
                          onClick={() => lookup(v.word)}
                          className="font-mono font-medium text-accent-deep hover:underline"
                        >
                          {v.word}
                        </button>
                        <span className="text-ink-600 text-xs flex-1">{v.meaning}</span>
                        <button
                          onClick={() => speak(v.word)}
                          className="text-xs text-ink-400 hover:text-ink-900"
                        >
                          🔊
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showQuiz && chapter.questions.length > 0 && (
                <div className="va-card space-y-4">
                  <div className="text-sm font-semibold">理解练习</div>
                  {chapter.questions.map((q, qi) => (
                    <div key={qi} className="space-y-2">
                      <div className="text-sm font-medium">
                        {qi + 1}. {q.question}
                      </div>
                      <div className="space-y-1">
                        {q.choices.map((c, ci) => {
                          const label = String(c).trim().charAt(0).toUpperCase()
                          const chosen = answers[qi]
                          const isRight = label === q.answer
                          const picked = chosen === label
                          return (
                            <button
                              key={ci}
                              disabled={!!chosen}
                              onClick={() => setAnswers((a) => ({ ...a, [qi]: label }))}
                              className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                                !chosen
                                  ? 'border-ink-100 hover:border-ink-900'
                                  : isRight
                                  ? 'border-green-400 bg-green-50 text-green-800'
                                  : picked
                                  ? 'border-red-300 bg-red-50 text-red-700'
                                  : 'border-ink-100 text-ink-400'
                              }`}
                            >
                              {c}
                            </button>
                          )
                        })}
                      </div>
                      {answers[qi] && q.explanation && (
                        <div className="text-xs text-ink-600 bg-ink-50 rounded-lg p-2 leading-relaxed">
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 章节导航 */}
          {!isStory && (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => goChapter(chapter.prevIndex)}
                disabled={chapter.prevIndex === null}
                className="va-btn va-btn--secondary va-btn--md disabled:opacity-40"
              >
                ← 上一章
              </button>
              <button
                onClick={() => goChapter(chapter.nextIndex)}
                disabled={chapter.nextIndex === null}
                className="va-btn va-btn--primary va-btn--md disabled:opacity-40"
              >
                下一章 →
              </button>
            </div>
          )}

          {/* 章节目录（名著） */}
          {!isStory && book && (
            <details className="va-card">
              <summary className="text-sm font-medium cursor-pointer">章节目录</summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-1 max-h-72 overflow-auto">
                {book.chapters.map((c) => (
                  <button
                    key={c.index}
                    onClick={() => goChapter(c.index)}
                    className={`text-left text-xs px-2 py-1.5 rounded hover:bg-ink-50 ${
                      c.index === chapterIndex ? 'bg-ink-900 text-white hover:bg-ink-900' : 'text-ink-600'
                    }`}
                  >
                    <span className="text-ink-400 mr-1">{c.index + 1}.</span>
                    {c.title}
                  </button>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* 点词弹窗 */}
      {popup && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-2xl mx-auto va-card shadow-lg border-ink-900/10 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold">{popup.word}</span>
                  {popup.data?.ipa && (
                    <span className="text-xs text-ink-500 font-mono">/{popup.data.ipa}/</span>
                  )}
                </div>
                {popup.data?.pos?.length > 0 && (
                  <div className="text-xs text-ink-400">{popup.data.pos.join(' · ')}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => speak(popup.word)}
                  className="w-8 h-8 rounded-full bg-ink-50 hover:bg-ink-900 hover:text-white flex items-center justify-center"
                >
                  🔊
                </button>
                <button
                  onClick={() => setPopup(null)}
                  className="text-ink-400 hover:text-ink-900 text-sm px-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {popup.loading && <div className="text-sm text-ink-500">查询中…</div>}

            {!popup.loading && popup.data && (
              <div className="space-y-1">
                <div className="text-sm text-ink-900">{popup.data.translation || '（无释义）'}</div>
                {popup.data.rootAffix && (
                  <div className="text-xs text-ink-500">
                    词根词缀：
                    {popup.data.rootAffix.prefix && ` ${popup.data.rootAffix.prefix}-(${popup.data.rootAffix.prefixMeaning})`}
                    {popup.data.rootAffix.root && ` ${popup.data.rootAffix.root}(${popup.data.rootAffix.rootMeaning})`}
                    {popup.data.rootAffix.suffix && ` ${popup.data.rootAffix.suffix}(${popup.data.rootAffix.suffixMeaning})`}
                  </div>
                )}
                {(popup.data.examples || []).slice(0, 2).map((ex: any, i: number) => (
                  <div key={i} className="text-xs text-ink-600 border-l-2 border-ink-100 pl-2">
                    {typeof ex === 'string' ? ex : ex.en || ex.text}
                    {typeof ex === 'object' && ex.zh && (
                      <div className="text-ink-400">{ex.zh}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!popup.loading && popup.notFound && (
              <div className="text-sm text-ink-500">
                词库里没有 <span className="font-mono">{popup.word}</span>
                （可能是专有名词或变形词）。可以试试查原形，或长按选中复制。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
