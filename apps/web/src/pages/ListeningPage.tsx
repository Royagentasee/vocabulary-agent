import { useEffect, useState } from 'react'
import {
  fetchListeningPassages,
  listeningTypeLabel,
  ListeningPassage,
  ListeningQuestion,
} from '@/services/listening'
import { trackEvent } from '@/services/stats'

type ExamFilter = 'all' | 'TOEFL' | 'IELTS'

export function ListeningPage() {
  const [filter, setFilter] = useState<ExamFilter>('all')
  const [passages, setPassages] = useState<ListeningPassage[]>([])
  const [selected, setSelected] = useState<ListeningPassage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchListeningPassages({ exam: filter === 'all' ? undefined : filter })
      .then(setPassages)
      .catch((e: any) => setError(e?.message ?? '加载失败'))
  }, [filter])

  if (selected) {
    return (
      <ListeningPlayer
        item={selected}
        onBack={() => {
          setSelected(null)
          if ('speechSynthesis' in window) window.speechSynthesis.cancel()
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">🎧 听力练习</h1>
        <p className="text-ink-500 mt-1 text-sm">
          原创托福 / 雅思风格听力材料，点击播放后答题
        </p>
      </header>

      {/* 考试筛选 */}
      <div className="flex gap-2">
        {(['all', 'TOEFL', 'IELTS'] as ExamFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === f
                ? 'bg-ink-900 text-white'
                : 'bg-white text-ink-500 border border-ink-100 hover:border-ink-900'
            }`}
          >
            {f === 'all' ? '全部' : f}
          </button>
        ))}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {passages.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              trackEvent('listening_practice', p.exam)
              setSelected(p)
            }}
            className="va-card hover:border-ink-900 transition-colors text-left space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-ink-50 text-ink-600 font-medium">
                  {p.exam}
                </span>
                <span className="text-xs text-ink-500">{listeningTypeLabel(p.type)}</span>
              </div>
              <span className="text-xs text-ink-400">{p.word_count} 词</span>
            </div>
            <div className="font-medium">{p.title}</div>
            <div className="text-xs text-ink-500">{p.questions.length} 道题</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============ 听力播放 + 答题 ============ */

function ListeningPlayer({ item, onBack }: { item: ListeningPassage; onBack: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showTranscript, setShowTranscript] = useState(false)
  const [played, setPlayed] = useState(false)
  const { playing, play, stop } = useSpeaker(item.passage)

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-ink-500 hover:text-ink-900">
        ← 返回列表
      </button>

      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{item.title}</h1>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-ink-500">
            <span className="px-2 py-0.5 rounded bg-ink-50 text-ink-600 font-medium">{item.exam}</span>
            <span>{listeningTypeLabel(item.type)}</span>
            <span>·</span>
            <span>{item.word_count} 词</span>
          </div>
        </div>
      </header>

      {/* 播放控制 */}
      <div className="va-card text-center py-8 space-y-4">
        <button
          onClick={() => {
            if (!played) setPlayed(true)
            play()
          }}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-colors ${
            playing ? 'bg-ink-900 text-white animate-pulse' : 'bg-ink-100 text-ink-900 hover:bg-ink-900 hover:text-white'
          }`}
          aria-label={playing ? '停止播放' : '播放听力'}
        >
          {playing ? '⏹' : '▶'}
        </button>
        <div className="text-sm text-ink-500">
          {playing ? '正在播放…' : played ? '播放完成，可再听一遍或直接答题' : '点击播放，仔细听内容'}
        </div>
        {played && (
          <div className="flex items-center justify-center gap-3 text-xs">
            <button onClick={play} className="text-ink-500 hover:text-ink-900 underline">
              {playing ? '停止' : '🔊 再听一遍'}
            </button>
            <button
              onClick={() => setShowTranscript((v) => !v)}
              className="text-ink-500 hover:text-ink-900 underline"
            >
              {showTranscript ? '隐藏原文' : '显示原文'}
            </button>
          </div>
        )}
      </div>

      {/* 原文（默认隐藏，点击显示） */}
      {showTranscript && (
        <div className="va-card">
          <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">听力原文</div>
          <p className="text-sm leading-relaxed text-ink-900 whitespace-pre-wrap">{item.passage}</p>
        </div>
      )}

      {/* 题目 */}
      <div className="space-y-4">
        <div className="text-xs uppercase tracking-wider text-ink-500 pt-2">听力理解</div>
        {item.questions.map((q, qi) => (
          <ListeningQuizCard
            key={qi}
            index={qi}
            question={q}
            selected={answers[qi] ?? null}
            onSelect={(label) => setAnswers((a) => ({ ...a, [qi]: label }))}
          />
        ))}
      </div>
    </div>
  )
}

function ListeningQuizCard({
  index,
  question,
  selected,
  onSelect,
}: {
  index: number
  question: ListeningQuestion
  selected: string | null
  onSelect: (label: string) => void
}) {
  const answered = selected !== null
  const isCorrect = answered && selected === question.correct_label

  return (
    <div className="va-card">
      <div className="text-sm text-ink-500 mb-2">第 {index + 1} 题</div>
      <div className="font-medium mb-4">{question.question}</div>

      <div className="space-y-2">
        {question.choices.map((c) => {
          const isThisCorrect = answered && c.label === question.correct_label
          const isThisWrong = answered && selected === c.label && c.label !== question.correct_label
          return (
            <button
              key={c.label}
              onClick={() => !answered && onSelect(c.label)}
              disabled={answered}
              className={[
                'flex items-start gap-3 w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors',
                isThisCorrect
                  ? 'bg-green-50 border-green-400'
                  : isThisWrong
                  ? 'bg-red-50 border-red-400'
                  : 'bg-white border-ink-100 hover:border-ink-900',
                answered && !isThisCorrect && !isThisWrong ? 'opacity-50' : '',
              ].join(' ')}
            >
              <span className="font-mono font-semibold">{c.label}.</span>
              <span className="flex-1">{c.text}</span>
              {isThisCorrect && <span className="text-green-600">✓</span>}
              {isThisWrong && <span className="text-red-500">✗</span>}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className="mt-3 text-sm bg-ink-50 rounded-lg p-3 space-y-1">
          <div className={isCorrect ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
            {isCorrect ? '✓ 正确' : `✗ 正确答案是 ${question.correct_label}`}
          </div>
          {question.explanation && (
            <div className="text-ink-600 leading-relaxed">{question.explanation}</div>
          )}
        </div>
      )}
    </div>
  )
}

/** 用浏览器 TTS 朗读整段听力文本 */
function useSpeaker(text: string) {
  const [playing, setPlaying] = useState(false)

  const stop = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setPlaying(false)
  }

  const play = () => {
    if (!('speechSynthesis' in window)) return
    if (playing) {
      stop()
      return
    }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.95
    const voices = window.speechSynthesis.getVoices()
    const en = voices.find((v) => /en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang))
    if (en) u.voice = en
    u.onend = () => setPlaying(false)
    u.onerror = () => setPlaying(false)
    window.speechSynthesis.speak(u)
    setPlaying(true)
  }

  useEffect(() => stop, [text])

  return { playing, play, stop }
}
