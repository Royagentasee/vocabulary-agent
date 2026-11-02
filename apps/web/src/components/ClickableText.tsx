import { useState } from 'react'
import { speakText } from '@/components/SpeakButton'
import { useLearnStore } from '@/stores/learnStore'

/**
 * 可点词的英文文本
 *
 * 点任意英文单词 → 底部弹层显示音标、中文释义，可朗读、可加入生词本。
 * 用于新闻、阅读文章、SAT 真题等「读英文」的场景。
 */
export function ClickableText({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  const [popup, setPopup] = useState<{ w: string; loading: boolean; data: any } | null>(null)
  const [saved, setSaved] = useState('')
  const addToWordbook = useLearnStore((s2) => s2.addToWordbook)

  /** 把查到的词塞进生词本（复用 learnStore 的错词列表） */
  const saveWord = (d: any, fallback: string) => {
    try {
      const head = d?.headword || fallback
      const senses = (d?.senses || []).map((x: any) => ({
        pos: x.pos || '',
        definitionEn: x.definitionEn || '',
        definitionCn: x.definitionCn || '',
      }))
      addToWordbook({
        id: String(d?.id || head),
        headword: head,
        pos: d?.pos || [],
        ipa: d?.ipa || '',
        audioUrl: '',
        senses: senses.length
          ? senses
          : [{ pos: '', definitionEn: '', definitionCn: d?.translation || '' }],
        etymology: '',
        collocations: [],
        examTags: [],
        examples: [],
        translation: d?.translation || '',
      } as any)
    } catch (e) {
      console.warn('[clickable] 保存生词失败', e)
    }
  }

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
                title="朗读"
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
            {!popup.loading && popup.data?.found && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  saveWord(popup.data, popup.w)
                  setSaved(popup.w)
                  window.setTimeout(() => setSaved(''), 2000)
                }}
                className="w-full py-2 rounded-lg bg-ink-900 text-white text-xs font-medium active:opacity-80"
              >
                {saved === popup.w ? '✅ 已加入生词本' : '＋ 加入生词本'}
              </button>
            )}
            <div className="text-[10px] text-ink-400">点空白处关闭</div>
          </div>
        </div>
      )}
    </div>
  )
}
