import { useEffect, useRef, useState } from 'react'
import {
  compressImage,
  ocrStatus,
  recognizeImage,
  translateText,
  OcrResult,
  TranslateResult,
} from '@/services/ocr'
import { QuotaBadge } from '@/components/Quota'
import { speakText } from '@/components/SpeakButton'
import { lookupWord, WordLookup } from '@/services/library'
import { useQuotaStore } from '@/stores/quotaStore'
import { trackEvent } from '@/services/stats'

export function PhotoPage() {
  const [available, setAvailable] = useState(true)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState('')
  const [ocr, setOcr] = useState<OcrResult | null>(null)
  const [text, setText] = useState('')
  const [tr, setTr] = useState<TranslateResult | null>(null)
  const [error, setError] = useState('')
  const [popup, setPopup] = useState<{ word: string; loading: boolean; data: WordLookup | null } | null>(null)
  const [editing, setEditing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ocrStatus().then((s) => setAvailable(s.available)).catch(() => {})
    trackEvent('photo_view')
  }, [])

  const reset = () => {
    setPreview('')
    setOcr(null)
    setText('')
    setTr(null)
    setError('')
    setPopup(null)
    setEditing(false)
  }

  const handleFile = async (file: File) => {
    reset()
    setBusy('正在读取图片…')
    try {
      setPreview(URL.createObjectURL(file))
      setBusy('正在压缩图片…')
      const blob = await compressImage(file)

      setBusy('正在识别文字…')
      const r = await recognizeImage(blob)
      setOcr(r)
      setText(r.text)
      trackEvent('photo_ocr', r.quality)
      if (!r.ok) setError('没识别出文字，换个角度或离近一点重拍试试')
    } catch (e: any) {
      setError(e?.message || '识别失败')
    } finally {
      setBusy('')
    }
  }

  const doTranslate = async () => {
    if (!text.trim()) return
    setBusy('正在翻译…')
    setError('')
    try {
      const r = await translateText(text)
      setTr(r)
      useQuotaStore.getState().consumeLocal('photo')
      trackEvent('photo_translate')
    } catch (e: any) {
      setError(e?.message || '翻译失败')
    } finally {
      setBusy('')
    }
  }

  const lookup = async (raw: string) => {
    const w = raw.replace(/^[^A-Za-z'-]+|[^A-Za-z'-]+$/g, '')
    if (w.length < 2) return
    setPopup({ word: w, loading: true, data: null })
    try {
      const d = await lookupWord(w.toLowerCase())
      setPopup({ word: w, loading: false, data: d })
    } catch {
      setPopup({ word: w, loading: false, data: null })
    }
  }

  if (!available) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight">📷 拍照翻译</h1>
        <div className="va-card text-sm text-amber-700 bg-amber-50">
          服务端还没装 OCR 引擎，暂时不可用。
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl" onClick={() => popup && setPopup(null)}>
      <header className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
          📷 拍照翻译
          <QuotaBadge feature="photo" className="align-middle" />
        </h1>
        <p className="text-ink-500 text-sm">
          拍书上或屏幕上的英文，自动识别成文字并翻译成中文
        </p>
      </header>

      {/* 上传 */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.target.value = ''
        }}
      />

      {!preview && (
        <button
          onClick={() => fileRef.current?.click()}
          className="va-card w-full py-12 flex flex-col items-center gap-3 hover:border-ink-900 transition-colors active:bg-ink-50"
        >
          <span className="text-5xl">📷</span>
          <span className="text-sm font-medium">点这里拍照 / 从相册选图</span>
          <span className="text-xs text-ink-400">支持书上、屏幕上、打印稿上的英文</span>
        </button>
      )}

      {/* 预览 */}
      {preview && (
        <div className="va-card space-y-3">
          <img src={preview} alt="待识别图片" className="w-full max-h-64 object-contain rounded-xl bg-ink-50" />
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="va-btn va-btn--secondary va-btn--sm"
            >
              换一张
            </button>
            <button onClick={reset} className="va-btn va-btn--secondary va-btn--sm">
              清空
            </button>
            {ocr && (
              <span className="ml-auto self-center text-xs text-ink-500">
                识别 {ocr.wordCount} 词 · 置信度 {ocr.confidence}%
                {ocr.quality === 'poor' && '（偏低，建议重拍）'}
              </span>
            )}
          </div>
        </div>
      )}

      {busy && (
        <div className="va-card text-sm text-ink-500 flex items-center gap-2">
          <span className="animate-pulse">⏳</span> {busy}
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* 识别结果 */}
      {text && (
        <div className="va-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">识别结果</div>
            <div className="flex gap-1.5">
              <button
                onClick={() => speakText(text)}
                className="w-8 h-8 rounded-full bg-ink-50 hover:bg-ink-900 hover:text-white flex items-center justify-center"
                title="朗读"
              >
                🔊
              </button>
              <button
                onClick={() => navigator.clipboard?.writeText(text).catch(() => {})}
                className="w-8 h-8 rounded-full bg-ink-50 hover:bg-ink-900 hover:text-white flex items-center justify-center text-xs"
                title="复制"
              >
                📋
              </button>
            </div>
          </div>

          {editing ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={Math.min(14, Math.max(5, text.split('\n').length + 1))}
              className="w-full px-3 py-2 bg-ink-50 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-ink-900 resize-y"
            />
          ) : (
            <div className="bg-ink-50 rounded-xl px-3 py-2.5 text-sm leading-[1.9] whitespace-pre-wrap font-serif">
              {text.split(/(\s+)/).map((tok, i) =>
                /[A-Za-z]/.test(tok) ? (
                  <span
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation()
                      lookup(tok)
                    }}
                    className="cursor-pointer hover:bg-accent-soft hover:text-accent-deep rounded px-[1px]"
                  >
                    {tok}
                  </span>
                ) : (
                  <span key={i}>{tok}</span>
                ),
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-ink-400">💡 点任意英文单词可查释义</div>
            <button
              onClick={() => setEditing((v) => !v)}
              className="text-xs text-accent-deep hover:underline shrink-0"
            >
              {editing ? '完成编辑' : '识别有误？手动改'}
            </button>
          </div>

          <button
            onClick={doTranslate}
            disabled={!!busy}
            className="va-btn va-btn--primary va-btn--md w-full disabled:opacity-40"
          >
            {busy === '正在翻译…' ? '翻译中…' : '🌐 翻译成中文'}
          </button>
        </div>
      )}

      {/* 翻译结果 */}
      {tr && (
        <div className="va-card space-y-3">
          <div className="text-sm font-semibold">中文翻译</div>
          {tr.summary && (
            <div className="text-xs text-accent-deep bg-accent-soft rounded-lg px-3 py-2">
              📌 {tr.summary}
            </div>
          )}
          <div className="text-sm leading-[1.9] text-ink-800 space-y-3">
            {tr.translation.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {tr.vocabulary.length > 0 && (
            <div className="border-t border-ink-100 pt-3 space-y-2">
              <div className="text-xs font-semibold text-ink-500">值得记的词</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {tr.vocabulary.map((v, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-xs">
                    <button
                      onClick={() => lookup(v.word)}
                      className="font-mono font-medium text-accent-deep hover:underline shrink-0"
                    >
                      {v.word}
                    </button>
                    <span className="text-ink-600 flex-1">{v.meaning}</span>
                    <button
                      onClick={() => speakText(v.word)}
                      className="text-ink-400 hover:text-ink-900 shrink-0"
                    >
                      🔊
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 使用提示 */}
      {!preview && (
        <section className="va-card space-y-2 text-xs text-ink-500">
          <div className="text-sm font-semibold text-ink-700">怎么拍识别率最高</div>
          <ul className="space-y-1 leading-relaxed">
            <li>• 光线充足，避免阴影和反光</li>
            <li>• 手机尽量与页面平行，不要斜着拍</li>
            <li>• 一次拍一段（4-6 行），不要拍整页小字</li>
            <li>• 拍屏幕时调高亮度，避免摩尔纹</li>
            <li>• OCR 是本地识别，图片不会外传；只有点「翻译」时会把文字发给 AI</li>
          </ul>
        </section>
      )}

      {/* 点词弹窗 */}
      {popup && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-3" onClick={(e) => e.stopPropagation()}>
          <div className="max-w-2xl mx-auto va-card shadow-lg space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold">
                    {popup.data?.headword || popup.word}
                  </span>
                  {popup.data?.ipa && (
                    <span className="text-xs text-ink-500 font-mono">/{popup.data.ipa}/</span>
                  )}
                  {popup.data?.source === 'ai' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent-deep">
                      AI 释义
                    </span>
                  )}
                </div>
                {popup.data?.pos && popup.data.pos.length > 0 && (
                  <div className="text-xs text-ink-400">{popup.data.pos.join(' · ')}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => speakText(popup.data?.headword || popup.word)}
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

            {!popup.loading && popup.data?.found && (
              <div className="space-y-1.5">
                {popup.data.senses.length > 0 ? (
                  popup.data.senses.slice(0, 3).map((s, i) => (
                    <div key={i} className="text-sm">
                      {s.pos && <span className="text-accent-deep font-medium mr-1">{s.pos}</span>}
                      <span className="text-ink-900">{s.definitionCn}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-ink-900">{popup.data.translation}</div>
                )}
              </div>
            )}

            {!popup.loading && popup.data && !popup.data.found && (
              <div className="text-sm text-ink-500">
                没查到 <span className="font-mono">{popup.word}</span>，可能是人名或拼写变体
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
