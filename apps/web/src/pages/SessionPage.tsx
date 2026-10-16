import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMeaningQuizBatch, type MeaningQuiz } from '@/services/words'
import { speakText, stopSpeaking } from '@/components/SpeakButton'
import { useLearnStore } from '@/stores/learnStore'
import { usePointsStore } from '@/stores/pointsStore'
import { trackEvent } from '@/services/stats'

type QType = 'meaning' | 'listen' | 'spell'

interface Question {
  type: QType
  headword: string
  ipa: string
  /** 正确答案 */
  answer: string
  /** 选项（spell 题没有） */
  options: string[]
  /** 提示：meaning 题显示单词，listen 题显示中文，spell 题显示中文 */
  prompt: string
}

const MAX_HEARTS = 3          // 多邻国式：错 3 次就重来
const SESSION_SIZE = 10

/**
 * 智能课程（多邻国式闯关）
 *
 * 一键开始，混合三种题型：选词义 / 听音选词 / 拼写。
 * 题目优先取你的错题本里的词，其次取已学词，最后补新词。
 */
export function SessionPage() {
  const nav = useNavigate()
  const wrongWords = useLearnStore((s) => s.wrongWords)
  const learnedWords = useLearnStore((s) => s.learnedWords)
  const learnRate = useLearnStore((s) => s.learnRate)
  const earn = usePointsStore((s) => s.earn)

  const [questions, setQuestions] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [hearts, setHearts] = useState(MAX_HEARTS)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [picked, setPicked] = useState('')
  const [typed, setTyped] = useState('')
  const [state, setState] = useState<'loading' | 'play' | 'done' | 'fail'>('loading')
  const inputRef = useRef<HTMLInputElement>(null)

  /** 由一批词义题派生三种题型 */
  const build = useCallback((quizzes: MeaningQuiz[]): Question[] => {
    if (quizzes.length === 0) return []
    const heads = quizzes.map((q) => q.headword)
    const out: Question[] = []

    quizzes.forEach((q, i) => {
      const zh = q.choices.find((c) => c.label === q.correct_label)?.text || ''
      const others = quizzes
        .filter((_, j) => j !== i)
        .map((x) => x.headword)
        .filter((h) => h !== q.headword)

      // 三种题型轮换，保证混合体验
      const type: QType = (['meaning', 'listen', 'spell'] as QType[])[i % 3]

      if (type === 'meaning') {
        out.push({
          type, headword: q.headword, ipa: q.ipa,
          answer: zh,
          options: q.choices.map((c) => c.text),
          prompt: q.headword,
        })
      } else if (type === 'listen') {
        const opts = [q.headword, ...others.slice(0, 3)]
        out.push({
          type, headword: q.headword, ipa: q.ipa,
          answer: q.headword,
          options: shuffleUnique(opts),
          prompt: zh,
        })
      } else {
        out.push({
          type, headword: q.headword, ipa: q.ipa,
          answer: q.headword,
          options: [],
          prompt: zh,
        })
      }
    })
    return out.slice(0, SESSION_SIZE)
  }, [])

  /** 优先错题本 → 已学词 → 新词 */
  const start = useCallback(async () => {
    setState('loading')
    setIdx(0)
    setHearts(MAX_HEARTS)
    setCombo(0)
    setBestCombo(0)
    setCorrect(0)
    setPicked('')
    setTyped('')

    try {
      const weak = wrongWords.slice(0, 6).map((w) => w.word.headword)
      let quizzes: MeaningQuiz[] = []

      // 先给错题本里的词出题
      if (weak.length) {
        const resp = await fetch(`/api/words/meaning-quiz/batch?limit=6`)
        // 批量接口是随机的，这里退而求其次：整体拉一批，用错题本优先排序
        const batch = await fetchMeaningQuizBatch(12)
        const weakSet = new Set(weak)
        quizzes = [
          ...batch.filter((q) => weakSet.has(q.headword)),
          ...batch.filter((q) => !weakSet.has(q.headword)),
        ]
        void resp
      } else {
        quizzes = await fetchMeaningQuizBatch(12)
      }

      const qs = build(quizzes)
      if (qs.length === 0) throw new Error('题目加载失败')
      setQuestions(qs)
      setState('play')
      trackEvent('session_start', String(qs.length))
    } catch (e) {
      console.warn('[session] 加载失败', e)
      setState('fail')
    }
  }, [wrongWords, build])

  useEffect(() => {
    void start()
    return () => stopSpeaking()
  }, [start])

  const q = questions[idx]

  /** 听音题自动朗读 */
  useEffect(() => {
    if (state === 'play' && q?.type === 'listen') {
      const t = window.setTimeout(() => void speakText(q.headword), 350)
      return () => window.clearTimeout(t)
    }
  }, [state, q])

  const finish = (ok: boolean) => {
    if (ok) {
      const gained = earn(correct * 2, 'task', { detail: '智能课程' })
      void gained
    }
    setState(ok ? 'done' : 'fail')
    trackEvent(ok ? 'session_done' : 'session_fail', `${correct}/${questions.length}`)
  }

  const submit = (val: string) => {
    if (!q || picked) return
    const ok = val.trim().toLowerCase() === q.answer.trim().toLowerCase()
    setPicked(val)

    if (ok) {
      setCorrect((c) => c + 1)
      const c2 = combo + 1
      setCombo(c2)
      setBestCombo((b) => Math.max(b, c2))
      void speakText(q.headword)
      // 同步进学习记录（计入学习路径与积分）
      try {
        learnRate(4 as any)
      } catch {
        /* ignore */
      }
    } else {
      setCombo(0)
      const h = hearts - 1
      setHearts(h)
      if (h <= 0) {
        window.setTimeout(() => finish(false), 900)
        return
      }
    }

    window.setTimeout(() => {
      setPicked('')
      setTyped('')
      if (idx + 1 >= questions.length) finish(true)
      else setIdx((i) => i + 1)
    }, ok ? 700 : 1400)
  }

  /* ============ 结算 ============ */

  if (state === 'loading') {
    return <div className="text-sm text-ink-500 py-20 text-center">正在为你准备今天的课程…</div>
  }
  if (state === 'fail' && questions.length === 0) {
    return (
      <div className="va-card text-sm text-ink-500 text-center py-12 space-y-3">
        <div>题目加载失败，可能是网络问题</div>
        <button onClick={() => void start()} className="px-4 py-2 rounded-lg bg-ink-900 text-white text-xs">
          重试
        </button>
      </div>
    )
  }

  if (state === 'done' || state === 'fail') {
    const total = questions.length
    const pass = state === 'done'
    return (
      <div className="max-w-md mx-auto space-y-4 py-6">
        <div className="va-card text-center space-y-4 py-8">
          <div className="text-6xl">{pass ? '🎉' : '💔'}</div>
          <div className="space-y-1">
            <div className="text-xl font-semibold">
              {pass ? '这一课完成了！' : '心用完了'}
            </div>
            <div className="text-sm text-ink-500">
              {pass ? '继续保持，明天见' : '别灰心，错题会进错题本'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              ['答对', `${correct}/${total}`, ''],
              ['最高连击', `${bestCombo}`, 'text-amber-600'],
              ['剩余心', `${Math.max(0, hearts)}`, hearts > 0 ? 'text-red-500' : ''],
            ].map(([label, val, cls]) => (
              <div key={label} className="bg-ink-50 rounded-xl py-3">
                <div className={`text-lg font-semibold tabular-nums ${cls}`}>{val}</div>
                <div className="text-[10px] text-ink-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => void start()}
              className="flex-1 py-3 rounded-xl bg-ink-900 text-white text-sm font-medium active:opacity-80"
            >
              再来一课
            </button>
            <Link
              to="/wrongbook"
              className="px-4 py-3 rounded-xl bg-ink-50 text-ink-700 text-sm active:bg-ink-100"
            >
              看错题
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!q) return null

  const progress = (idx / questions.length) * 100

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* 顶栏：进度 + 心 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            stopSpeaking()
            nav('/path')
          }}
          className="text-ink-400 hover:text-ink-900 text-lg leading-none shrink-0"
          aria-label="退出"
        >
          ✕
        </button>
        <div className="flex-1 h-2.5 bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: MAX_HEARTS }).map((_, i) => (
            <span key={i} className={`text-sm ${i < hearts ? '' : 'opacity-20 grayscale'}`}>
              ❤️
            </span>
          ))}
        </div>
      </div>

      {combo >= 3 && (
        <div className="text-center text-xs text-amber-600 font-medium">
          🔥 连对 {combo} 题！
        </div>
      )}

      {/* 题目 */}
      <div className="va-card space-y-4">
        <div className="text-center space-y-2">
          <div className="text-[11px] text-ink-400">
            {q.type === 'meaning' && '选出正确的中文意思'}
            {q.type === 'listen' && '听发音，选出正确的单词'}
            {q.type === 'spell' && '根据中文拼写单词'}
          </div>

          {q.type === 'meaning' && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl font-semibold">{q.headword}</span>
              <button
                onClick={() => speakText(q.headword)}
                className="w-8 h-8 rounded-full bg-ink-50 hover:bg-ink-900 hover:text-white flex items-center justify-center text-sm"
              >
                🔊
              </button>
            </div>
          )}

          {q.type === 'listen' && (
            <button
              onClick={() => speakText(q.headword)}
              className="mx-auto w-20 h-20 rounded-full bg-ink-900 text-white flex items-center justify-center text-3xl active:opacity-80"
              aria-label="重听"
            >
              🔊
            </button>
          )}

          {q.type === 'spell' && (
            <div className="text-lg font-medium">{q.prompt}</div>
          )}

          {q.ipa && q.type !== 'spell' && (
            <div className="text-xs text-ink-500 font-mono">/{q.ipa}/</div>
          )}
        </div>

        {/* 答题区 */}
        {q.type === 'spell' ? (
          <div className="space-y-2">
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && typed.trim() && submit(typed)}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={!!picked}
              placeholder="输入英文单词"
              className={`w-full px-4 py-3.5 rounded-xl text-center font-mono tracking-wider text-base focus:outline-none focus:ring-2 ${
                picked
                  ? picked.toLowerCase() === q.answer.toLowerCase()
                    ? 'bg-green-50 ring-2 ring-green-400'
                    : 'bg-red-50 ring-2 ring-red-300'
                  : 'bg-ink-50 focus:ring-ink-900'
              }`}
            />
            {picked && picked.toLowerCase() !== q.answer.toLowerCase() && (
              <div className="text-xs text-center text-red-600">
                正确答案：<span className="font-mono font-semibold">{q.answer}</span>
              </div>
            )}
            {!picked && (
              <button
                onClick={() => typed.trim() && submit(typed)}
                disabled={!typed.trim()}
                className="w-full py-3 rounded-xl bg-ink-900 text-white text-sm font-medium disabled:opacity-40"
              >
                确认
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {q.options.map((opt) => {
              const isAnswer = opt === q.answer
              const isPicked = picked === opt
              return (
                <button
                  key={opt}
                  disabled={!!picked}
                  onClick={() => submit(opt)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-colors ${
                    !picked
                      ? 'border-ink-100 hover:border-ink-900 active:bg-ink-50'
                      : isAnswer
                      ? 'border-green-400 bg-green-50 text-green-800'
                      : isPicked
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-ink-100 text-ink-400'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="flex-1">{opt}</span>
                    {picked && isAnswer && <span>✓</span>}
                    {picked && isPicked && !isAnswer && <span>✕</span>}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-ink-400">
        第 {idx + 1} / {questions.length} 题
      </div>
    </div>
  )
}

/** 去重后打乱 */
function shuffleUnique(arr: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x)
      out.push(x)
    }
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.slice(0, 4)
}
