import { useRef, useState } from 'react'
import {
  startDialogue,
  turnDialogue,
  scoreDialogue,
  DialogueScoreResult,
  SCENARIOS,
  LEVELS,
  Scenario,
  Level,
} from '@/services/dialogue'
import { SpeakButton } from '@/components/SpeakButton'
import { trackEvent } from '@/services/stats'

const SpeechRecognitionCtor: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined
const voiceSupported = !!SpeechRecognitionCtor

type Msg = { id: number; role: 'assistant' | 'user'; content: string; corrections?: string[] }

export function DialoguePage() {
  const [scenario, setScenario] = useState<Scenario>('interview')
  const [level, setLevel] = useState<Level>('B2')
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<DialogueScoreResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const recRef = useRef<any>(null)

  const started = sessionId !== '' && messages.length > 0

  const handleStart = async () => {
    setError(null)
    try {
      const r = await startDialogue(scenario, level)
      setSessionId(r.session_id)
      setMessages([{ id: 1, role: 'assistant', content: r.opening }])
      trackEvent('dialogue_start', scenario)
    } catch (e: any) {
      setError(e?.message ?? '开始失败')
    }
  }

  const handleSend = async (text?: string) => {
    const t = (text ?? input).trim()
    if (!t || sending) return
    setInput('')
    const tmpId = Date.now()
    setMessages((prev) => [...prev, { id: tmpId, role: 'user', content: t }])
    setSending(true)
    setError(null)
    try {
      const r = await turnDialogue(sessionId, t)
      setMessages((prev) => [
        ...prev.map((m) => (m.id === tmpId ? { ...m, corrections: r.corrections } : m)),
        { id: tmpId + 1, role: 'assistant', content: r.assistant_text },
      ])
    } catch (e: any) {
      setError(e?.message ?? '对话失败')
    } finally {
      setSending(false)
    }
  }

  const handleScore = async () => {
    setError(null)
    try {
      const transcript = messages.map((m) => ({ role: m.role, content: m.content }))
      const r = await scoreDialogue(sessionId, transcript)
      setResult(r)
      trackEvent('dialogue_score', scenario)
    } catch (e: any) {
      setError(e?.message ?? '评分失败')
    }
  }

  const reset = () => {
    setSessionId('')
    setMessages([])
    setResult(null)
    setInput('')
  }

  // 语音输入
  const startVoice = () => {
    if (!voiceSupported || recording) return
    const rec = new SpeechRecognitionCtor()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (ev: any) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript
      }
      setInput(finalText)
    }
    rec.onend = () => setRecording(false)
    rec.onerror = () => setRecording(false)
    recRef.current = rec
    rec.start()
    setRecording(true)
  }

  /* ============ 评分结果 ============ */
  if (result) {
    return (
      <div className="space-y-6 max-w-2xl">
        <header>
          <h1 className="text-2xl font-semibold">对话评分</h1>
          <p className="text-ink-500 mt-1 text-sm">
            {SCENARIOS.find((s) => s.id === scenario)?.label} · {level}
          </p>
        </header>

        <div className="va-card text-center py-8">
          <div className="text-5xl font-semibold">{Math.round(result.overall_score)}</div>
          <div className="text-sm text-ink-500 mt-2">综合得分</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ScoreCard label="发音" value={result.pronunciation} />
          <ScoreCard label="语法" value={result.grammar} />
          <ScoreCard label="词汇" value={result.vocabulary} />
          <ScoreCard label="流利度" value={result.fluency} />
        </div>

        {result.highlights.length > 0 && (
          <div className="va-card">
            <div className="text-sm font-semibold mb-2 text-green-600">做得好的地方</div>
            <ul className="space-y-1 text-sm text-ink-600">
              {result.highlights.map((h, i) => (
                <li key={i}>✓ {h}</li>
              ))}
            </ul>
          </div>
        )}

        {result.improvements.length > 0 && (
          <div className="va-card">
            <div className="text-sm font-semibold mb-2 text-amber-600">可以改进</div>
            <ul className="space-y-1 text-sm text-ink-600">
              {result.improvements.map((h, i) => (
                <li key={i}>• {h}</li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={reset} className="va-btn va-btn--primary va-btn--md">
          再来一场对话
        </button>
      </div>
    )
  }

  /* ============ 开始页 ============ */
  if (!started) {
    return (
      <div className="space-y-6 max-w-2xl">
        <header>
          <h1 className="text-2xl font-semibold">💬 口语对话陪练</h1>
          <p className="text-ink-500 mt-1 text-sm">
            选一个场景，和 AI 用英语对话，随时结束评分
          </p>
        </header>

        <div>
          <div className="text-sm font-medium mb-2">场景</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={`p-3 rounded-xl border text-center transition-colors ${
                  scenario === s.id ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-ink-100 hover:border-ink-900'
                }`}
              >
                <div className="text-2xl">{s.emoji}</div>
                <div className="text-sm font-medium mt-1">{s.label}</div>
                <div className={`text-xs mt-0.5 ${scenario === s.id ? 'text-white/60' : 'text-ink-400'}`}>
                  {s.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">难度（CEFR 等级）</div>
          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                  level === l ? 'bg-ink-900 text-white border-ink-900' : 'bg-white text-ink-500 border-ink-100 hover:border-ink-900'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button onClick={handleStart} className="va-btn va-btn--primary va-btn--md">
          开始对话
        </button>
      </div>
    )
  }

  /* ============ 聊天页 ============ */
  return (
    <div className="space-y-4 max-w-2xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {SCENARIOS.find((s) => s.id === scenario)?.emoji}{' '}
            {SCENARIOS.find((s) => s.id === scenario)?.label}对话
          </h1>
          <div className="text-xs text-ink-500">{level}</div>
        </div>
        <button onClick={handleScore} className="va-btn va-btn--secondary va-btn--sm">
          结束并评分
        </button>
      </header>

      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] space-y-1`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-ink-900 text-white rounded-br-sm'
                    : 'bg-white border border-ink-100 text-ink-900 rounded-bl-sm'
                }`}
              >
                {m.content}
              </div>

              {/* AI 回复可点发音 */}
              {m.role === 'assistant' && (
                <div className="flex items-center gap-1">
                  <SpeakButton text={m.content} className="w-6 h-6 text-xs" />
                </div>
              )}

              {/* 用户消息的纠错 */}
              {m.role === 'user' && m.corrections && m.corrections.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  {m.corrections.map((c, i) => (
                    <div key={i}>✎ {c}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="text-sm text-ink-500 bg-white border border-ink-100 rounded-2xl px-4 py-2.5">
              正在输入…
            </div>
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* 输入区 */}
      <div className="flex items-center gap-2">
        {voiceSupported && (
          <button
            onClick={startVoice}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors ${
              recording ? 'bg-red-500 text-white animate-pulse' : 'bg-ink-50 text-ink-600 hover:bg-ink-900 hover:text-white'
            }`}
            aria-label="语音输入"
            title="语音输入"
          >
            🎤
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={recording ? '正在聆听…' : '输入英语，或点麦克风说话'}
          className="flex-1 px-4 py-2.5 bg-white border border-ink-100 rounded-xl focus:outline-none focus:border-ink-900"
        />
        <button
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
          className="px-4 py-2.5 bg-ink-900 text-white rounded-xl text-sm disabled:opacity-40"
        >
          发送
        </button>
      </div>
    </div>
  )
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="va-card text-center">
      <div className="text-2xl font-semibold">{Math.round(value)}</div>
      <div className="text-xs text-ink-500 mt-1">{label}</div>
    </div>
  )
}
