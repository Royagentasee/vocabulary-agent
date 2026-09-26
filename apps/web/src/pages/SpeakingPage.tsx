import { useEffect, useState } from 'react'
import {
  fetchSpeakingSentences,
  assessSpeaking,
  transcribeAudio,
  SpeakingSentence,
  SpeakingAssessResult,
} from '@/services/speaking'
import { SpeakButton } from '@/components/SpeakButton'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { trackEvent } from '@/services/stats'

const hasRecorder =
  typeof window !== 'undefined' &&
  typeof MediaRecorder !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia

// 浏览器安全规则：只有 HTTPS（或 localhost）才允许访问麦克风
const secureContext = typeof window !== 'undefined' ? window.isSecureContext : true
const micAvailable = hasRecorder && secureContext

/** 麦克风不可用时的准确原因说明 */
function MicNotice() {
  if (!secureContext) {
    return (
      <div className="va-card text-sm text-amber-800 bg-amber-50 space-y-1">
        <div className="font-semibold">⚠️ 麦克风无法使用：当前网站是 HTTP 明文访问</div>
        <div>
          浏览器出于安全规定（secure context），<strong>只有 HTTPS 网站才允许调用麦克风</strong>，
          这是浏览器的硬性限制，网页本身无法绕过。改用 <strong>https://</strong> 访问即可。
        </div>
      </div>
    )
  }
  if (!hasRecorder) {
    return (
      <div className="va-card text-sm text-amber-700 bg-amber-50">
        ⚠️ 当前浏览器不支持录音。请用 <strong>Chrome / Edge / Safari</strong> 打开。
      </div>
    )
  }
  return null
}

export function SpeakingPage() {
  const [sentences, setSentences] = useState<SpeakingSentence[]>([])
  const [selected, setSelected] = useState<SpeakingSentence | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSpeakingSentences()
      .then(setSentences)
      .catch((e: any) => setError(e?.message ?? '加载失败'))
  }, [])

  if (selected) {
    return <PracticeView sentence={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">🎙️ 口语朗读</h1>
        <p className="text-ink-500 mt-1 text-sm">先听标准发音，再跟读，AI 帮你纠正发音</p>
      </header>

      <MicNotice />

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sentences.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              trackEvent('speaking_practice', s.focus)
              setSelected(s)
            }}
            className="va-card hover:border-ink-900 transition-colors text-left space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs px-2 py-0.5 rounded bg-accent-soft text-accent-deep font-medium">
                {s.focus}
              </span>
              <span className="text-xs text-ink-400">
                {s.difficulty === 'easy' ? '入门' : s.difficulty === 'medium' ? '进阶' : '高阶'}
              </span>
            </div>
            <div className="text-sm text-ink-900 leading-relaxed">{s.text}</div>
            <div className="text-xs text-ink-500">{s.translation}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============ 跟读练习 ============ */

function PracticeView({ sentence, onBack }: { sentence: SpeakingSentence; onBack: () => void }) {
  const rec = useVoiceRecorder()
  const [transcript, setTranscript] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [result, setResult] = useState<SpeakingAssessResult | null>(null)
  const [assessing, setAssessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const micBusy = transcribing || assessing

  /* 点击麦克风：开始录音 / 停止并识别 */
  const handleMic = async () => {
    if (micBusy) return

    // —— 停止录音 → 上传识别 ——
    if (rec.recording) {
      const blob = await rec.stop()
      if (!blob || blob.size < 1000) {
        setError('没有录到声音，请靠近麦克风再读一遍')
        return
      }
      setTranscribing(true)
      setError(null)
      try {
        const text = await transcribeAudio(blob)
        if (!text) {
          setError('没听清，请放慢速度、大声清晰地再读一遍')
        } else {
          setTranscript(text)
        }
      } catch (e: any) {
        setError(e?.message ?? '语音识别失败')
      } finally {
        setTranscribing(false)
      }
      return
    }

    // —— 开始录音 ——
    setTranscript('')
    setResult(null)
    setError(null)
    const ok = await rec.start()
    if (!ok) setError('无法访问麦克风，请确认已允许麦克风权限（且网站是 HTTPS）')
  }

  const handleAssess = async () => {
    if (!transcript.trim()) {
      setError('还没识别到内容，请先朗读')
      return
    }
    setAssessing(true)
    setError(null)
    try {
      const r = await assessSpeaking(sentence.text, transcript.trim())
      setResult(r)
    } catch (e: any) {
      setError(e?.message ?? '评估失败')
    } finally {
      setAssessing(false)
    }
  }

  const scoreColor =
    (result?.accuracy ?? 0) >= 80
      ? 'text-green-600'
      : (result?.accuracy ?? 0) >= 60
      ? 'text-amber-600'
      : 'text-red-600'

  return (
    <div className="space-y-6">
      <button
        onClick={async () => {
          if (rec.recording) await rec.stop()
          onBack()
        }}
        className="text-sm text-ink-500 hover:text-ink-900"
      >
        ← 返回列表
      </button>

      <MicNotice />

      <div className="va-card space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs px-2 py-0.5 rounded bg-accent-soft text-accent-deep font-medium">
            {sentence.focus}
          </span>
          <SpeakButton text={sentence.text} className="w-10 h-10" />
        </div>

        <div className="text-lg font-medium leading-relaxed">{sentence.text}</div>
        <div className="text-sm text-ink-500">{sentence.translation}</div>

        {/* 录音按钮 */}
        <div className="text-center pt-2">
          <button
            onClick={handleMic}
            disabled={!micAvailable || micBusy}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-colors ${
              !micAvailable || micBusy
                ? 'bg-ink-100 text-ink-400 cursor-not-allowed'
                : rec.recording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-ink-900 text-white hover:opacity-90'
            }`}
            aria-label={rec.recording ? '停止朗读' : '开始朗读'}
          >
            {transcribing ? '⏳' : rec.recording ? '⏹' : '🎤'}
          </button>
          <div className="text-sm text-ink-500 mt-2">
            {transcribing
              ? '正在识别…'
              : rec.recording
              ? '正在录音…读完点一下停止'
              : !secureContext
              ? '需要 HTTPS 才能使用麦克风'
              : hasRecorder
              ? '点击麦克风开始朗读'
              : '当前浏览器不支持录音'}
          </div>
        </div>

        {transcript && (
          <div className="bg-ink-50 rounded-lg p-3 text-sm">
            <span className="text-ink-500">识别结果：</span>
            <span className="text-ink-900 font-mono">{transcript}</span>
          </div>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}

        {transcript && !result && (
          <button onClick={handleAssess} disabled={assessing} className="va-btn va-btn--primary va-btn--md w-full">
            {assessing ? 'AI 评分中...' : 'AI 评分'}
          </button>
        )}
      </div>

      {/* 评估结果 */}
      {result && (
        <div className="va-card space-y-4">
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-semibold ${scoreColor}`}>{result.accuracy}</div>
            <div className="flex-1">
              <div className="text-sm text-ink-500 mb-1">发音准确度</div>
              <div className="w-full h-2.5 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    result.accuracy >= 80 ? 'bg-green-500' : result.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${result.accuracy}%` }}
                />
              </div>
            </div>
          </div>

          {result.feedback && <p className="text-sm leading-relaxed text-ink-900">{result.feedback}</p>}

          {result.mispronounced.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-ink-500">需要改进的发音</div>
              {result.mispronounced.map((m, i) => (
                <div key={i} className="bg-ink-50 rounded-lg p-3 text-sm space-y-1">
                  <span className="font-mono font-semibold text-red-600">{m.word}</span>
                  {m.tip && <div className="text-ink-600">{m.tip}</div>}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setResult(null)
              setTranscript('')
            }}
            className="va-btn va-btn--secondary va-btn--sm"
          >
            再读一遍
          </button>

          {result.is_mock && (
            <div className="text-xs text-ink-500">（当前为简单比对，AI 恢复后给出更精准的发音点评）</div>
          )}
        </div>
      )}
    </div>
  )
}
