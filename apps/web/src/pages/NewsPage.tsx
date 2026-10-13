import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchNews, fetchSources, timeAgo, type NewsItem, type NewsSource } from '@/services/news'
import { speakText, stopSpeaking, getTtsVoice, TTS_VOICES, setTtsVoice } from '@/components/SpeakButton'
import { trackEvent } from '@/services/stats'

/**
 * 国外新闻（可听）
 *
 * 有原声音频的直接播；没有的用本站神经语音念 —— 所以每条新闻都能「听」。
 */
export function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [sources, setSources] = useState<NewsSource[]>([])
  const [src, setSrc] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<NewsItem | null>(null)

  useEffect(() => {
    fetchSources().then(setSources).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchNews(src, 60)
      .then(setItems)
      .finally(() => setLoading(false))
    trackEvent('news_view', src || 'all')
  }, [src])

  if (open) return <NewsDetail item={open} onBack={() => setOpen(null)} />

  return (
    <div className="space-y-4 max-w-2xl">
      <header className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">📰 国外新闻</h1>
        <p className="text-ink-500 text-sm">
          边看边听 · 点任意单词查释义 · 有原声就播原声，没有就用语音朗读
        </p>
      </header>

      {/* 源筛选 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
        <button
          onClick={() => setSrc('')}
          className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border shrink-0 ${
            src === '' ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-ink-100 text-ink-600'
          }`}
        >
          全部
        </button>
        {sources.map((s) => (
          <button
            key={s.key}
            onClick={() => setSrc(s.key)}
            title={s.desc}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border shrink-0 ${
              src === s.key ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-ink-100 text-ink-600'
            }`}
          >
            {s.flag} {s.name.replace(' News', '').replace(' World', '')}
            <span className="ml-1 opacity-60">{s.level}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-ink-500 py-14 text-center">正在获取最新新闻…</div>
      ) : items.length === 0 ? (
        <div className="va-card text-sm text-ink-500 text-center py-10">
          暂时拉不到新闻，稍后再试（新闻源偶尔会抽风）
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => {
                setOpen(it)
                trackEvent('news_open', it.source)
              }}
              className="va-card w-full text-left space-y-1.5 hover:border-ink-900 transition-colors"
            >
              <div className="flex items-center gap-2 text-[11px] text-ink-500">
                <span>{it.flag}</span>
                <span>{it.sourceName}</span>
                <span className="px-1.5 py-0.5 rounded bg-ink-100">{it.level}</span>
                {it.audio && <span className="text-green-600">🔊 原声</span>}
                <span className="ml-auto">{timeAgo(it.pubDate)}</span>
              </div>
              <div className="text-sm font-medium leading-snug">{it.title}</div>
              {it.summary && (
                <div className="text-xs text-ink-500 leading-relaxed line-clamp-2">{it.summary}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============ 详情（阅读 + 听） ============ */

function NewsDetail({ item, onBack }: { item: NewsItem; onBack: () => void }) {
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [showVoice, setShowVoice] = useState(false)
  const [voice, setVoice] = useState(getTtsVoice())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const text = useMemo(
    () => [item.title, item.summary].filter(Boolean).join('\n\n'),
    [item.title, item.summary],
  )

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      stopSpeaking()
    }
  }, [])

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause()
      stopSpeaking()
      setPlaying(false)
      return
    }
    setPlaying(true)
    trackEvent('news_play', item.audio ? 'native' : 'tts')

    if (item.audio) {
      const a = audioRef.current || new Audio(item.audio)
      audioRef.current = a
      a.playbackRate = rate
      a.onended = () => setPlaying(false)
      a.onerror = () => {
        // 原声放不了 → 用语音朗读兜底
        void speakText(text, rate).then((ok) => {
          if (!ok) setPlaying(false)
          else window.setTimeout(() => setPlaying(false), 500 + text.length * 70)
        })
      }
      try {
        await a.play()
        return
      } catch {
        /* 继续兜底 */
      }
    }

    const ok = await speakText(text, rate)
    if (!ok) setPlaying(false)
    else window.setTimeout(() => setPlaying(false), 500 + text.length * 70)
  }

  const changeRate = (r: number) => {
    setRate(r)
    if (audioRef.current) audioRef.current.playbackRate = r
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <button onClick={onBack} className="text-sm text-ink-500 hover:text-ink-900">
        ← 返回列表
      </button>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <span>{item.flag}</span>
          <span>{item.sourceName}</span>
          <span className="px-1.5 py-0.5 rounded bg-ink-100">{item.level}</span>
          <span className="ml-auto">{timeAgo(item.pubDate)}</span>
        </div>
        <h1 className="text-lg sm:text-xl font-semibold leading-snug">{item.title}</h1>
      </div>

      {/* 播放控制 */}
      <section className="va-card space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
              playing ? 'bg-ink-900 text-white' : 'bg-ink-900 text-white active:opacity-80'
            }`}
            aria-label={playing ? '暂停' : '播放'}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {item.audio ? '原声新闻' : '语音朗读'}
            </div>
            <div className="text-[11px] text-ink-500">
              {item.audio ? '来自新闻源的真实播音' : '用本站神经语音朗读（该源没有音频）'}
            </div>
          </div>
          {item.audio && (
            <div className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-700 shrink-0">
              🔊 原声
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-ink-500">语速</span>
          {[0.75, 1, 1.25].map((r) => (
            <button
              key={r}
              onClick={() => changeRate(r)}
              className={`px-2.5 py-1 rounded-lg text-xs border ${
                rate === r ? 'bg-ink-900 text-white border-ink-900' : 'border-ink-100 text-ink-600'
              }`}
            >
              {r === 1 ? '正常' : `${r}×`}
            </button>
          ))}
          {!item.audio && (
            <button
              onClick={() => setShowVoice((v) => !v)}
              className="ml-auto text-xs text-ink-500 hover:text-ink-900"
            >
              {showVoice ? '收起音色' : '换音色'}
            </button>
          )}
        </div>

        {showVoice && !item.audio && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {TTS_VOICES.map((v) => (
              <button
                key={v.key}
                onClick={() => {
                  setVoice(v.key)
                  setTtsVoice(v.key)
                }}
                className={`py-1.5 rounded-lg text-[11px] border ${
                  voice === v.key ? 'bg-ink-900 text-white border-ink-900' : 'border-ink-100 text-ink-600'
                }`}
              >
                {v.flag} {v.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 正文（点词查义） */}
      <section className="va-card space-y-3">
        <div className="text-xs text-ink-400">
          💡 点任意英文单词可查释义
        </div>
        <ClickableText text={item.title} className="text-base font-medium leading-relaxed" />
        <ClickableText text={item.summary} className="text-sm leading-[1.9]" />

        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-accent-deep hover:underline border-t border-ink-100 pt-3 w-full"
          >
            查看原文（{item.sourceName}）→
          </a>
        )}
      </section>

      <div className="text-[11px] text-ink-400 leading-relaxed pb-4">
        新闻内容版权归原媒体所有，本站只做学习用途的摘录与朗读。
      </div>
    </div>
  )
}

/** 可点词查询的文本 */
function ClickableText({ text, className = '' }: { text: string; className?: string }) {
  const [popup, setPopup] = useState<{ w: string; loading: boolean; data: any } | null>(null)

  const lookup = async (raw: string) => {
    const w = raw.replace(/^[^A-Za-z'-]+|[^A-Za-z'-]+$/g, '')
    if (w.length < 2) return
    setPopup({ w, loading: true, data: null })
    try {
      const { lookupWord } = await import('@/services/library')
      const d = await lookupWord(w.toLowerCase())
      setPopup({ w, loading: false, data: d })
    } catch {
      setPopup({ w, loading: false, data: null })
    }
  }

  return (
    <div className={className}>
      {text.split(/(\s+)/).map((tok, i) =>
        /[A-Za-z]/.test(tok) ? (
          <span
            key={i}
            onClick={() => lookup(tok)}
            className="cursor-pointer hover:bg-accent-soft hover:text-accent-deep rounded px-[1px]"
          >
            {tok}
          </span>
        ) : (
          <span key={i}>{tok}</span>
        ),
      )}

      {popup && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 p-3"
          onClick={(e) => {
            e.stopPropagation()
            setPopup(null)
          }}
        >
          <div className="max-w-2xl mx-auto va-card shadow-lg space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold">{popup.data?.headword || popup.w}</span>
              {popup.data?.ipa && (
                <span className="text-xs text-ink-500 font-mono">/{popup.data.ipa}/</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  void speakText(popup.data?.headword || popup.w)
                }}
                className="ml-auto text-sm"
              >
                🔊
              </button>
            </div>
            {popup.loading ? (
              <div className="text-xs text-ink-500">查询中…</div>
            ) : (
              <div className="text-sm text-ink-800">
                {popup.data?.senses?.[0]?.definitionCn ||
                  popup.data?.translation ||
                  '没查到这个词'}
              </div>
            )}
            <div className="text-[10px] text-ink-400">点空白处关闭</div>
          </div>
        </div>
      )}
    </div>
  )
}
