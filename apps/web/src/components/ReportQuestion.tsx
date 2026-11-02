import { useState } from 'react'
import { reportQuestion, type ReportPayload } from '@/services/feedback'

/** 常见报错原因，一点即选，减少输入成本 */
const REASONS = [
  '正确答案标错了',
  '有两个选项都对',
  '解析说得不对',
  '题目本身有语法错误',
  '选项重复/看不清',
]

/**
 * 「题目有误？」按钮 + 报错弹层
 *
 * 用法：放在每道题的底部，传题目的完整信息进来。
 */
export function ReportQuestion(props: {
  kind: ReportPayload['kind']
  question: string
  options?: string[]
  correct?: string
  topic?: string
}) {
  const [open, setOpen] = useState(false)
  const [reasons, setReasons] = useState<string[]>([])
  const [chosen, setChosen] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const toggle = (r: string) =>
    setReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))

  const submit = async () => {
    setBusy(true)
    const text = [reasons.join('；'), note.trim()].filter(Boolean).join('。')
    const ok = await reportQuestion({
      kind: props.kind,
      question: props.question,
      options: props.options,
      correct: props.correct,
      chosen,
      topic: props.topic,
      note: text,
    })
    setBusy(false)
    if (ok) {
      setDone(true)
      window.setTimeout(() => {
        setOpen(false)
        setDone(false)
        setReasons([])
        setNote('')
        setChosen('')
      }, 1600)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[11px] text-ink-400 hover:text-ink-700 transition-colors"
      >
        ⚠️ 题目有误？
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2.5">
      {done ? (
        <div className="text-sm text-green-700 py-2 text-center">
          ✅ 已提交，谢谢反馈！作者会核对并修正
        </div>
      ) : (
        <>
          <div className="text-xs font-medium text-ink-700">哪里有问题？</div>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                onClick={() => toggle(r)}
                className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                  reasons.includes(r)
                    ? 'bg-ink-900 text-white border-ink-900'
                    : 'bg-white border-ink-200 text-ink-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {props.options && props.options.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-ink-600">你认为正确答案是？</div>
              <div className="flex flex-wrap gap-1.5">
                {props.options.map((o) => (
                  <button
                    key={o}
                    onClick={() => setChosen(o)}
                    className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                      chosen === o
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white border-ink-200 text-ink-600'
                    }`}
                  >
                    {o.length > 24 ? o.slice(0, 24) + '…' : o}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="补充说明（可不填）"
            className="w-full px-2.5 py-2 bg-white border border-ink-200 rounded-lg text-xs focus:outline-none focus:border-ink-900"
          />

          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy || (reasons.length === 0 && !note.trim() && !chosen)}
              className="flex-1 py-2 rounded-lg bg-ink-900 text-white text-xs font-medium disabled:opacity-40"
            >
              {busy ? '提交中…' : '提交'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-lg bg-white border border-ink-200 text-ink-600 text-xs"
            >
              取消
            </button>
          </div>
        </>
      )}
    </div>
  )
}
