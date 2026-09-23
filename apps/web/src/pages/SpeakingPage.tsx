import { useEffect, useRef, useState } from 'react'
import {
  fetchSpeakingSentences,
  assessSpeaking,
  SpeakingSentence,
  SpeakingAssessResult,
} from '@/services/speaking'
import { SpeakButton } from '@/components/SpeakButton'
import { trackEvent } from '@/services/stats'

const SpeechRecognitionCtor: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined

const supported = !!SpeechRecognitionCtor

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
    return (
      <PracticeView
        sentence={selected}
        onBack={() => setSelected(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">🎙️ 口语朗读</h1>
        <p className="text-ink-500 mt-1 text-sm">
          先听标准发音，再跟读，AI 帮你纠正发音
        </p>
      </header>

      {!supported && (
        <div className="va-card text-sm text-amber-700 bg-amber-50">
          ⚠️ 当前浏览器不支持语音识别。请用 <strong>Chrome / Edge / Safari</strong> 打开本页面。
        </div>
      )}

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
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [result, setResult] = useState<SpeakingAssessResult | null>(null)
  const [assessing, setAssessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<any>(null)

  const stopRec = () => {
    if (recRef.current) {
      try {
        recRef.current.stop()
      } catch {
        /* ignore */
      }
    }
    setRecording(false)
  }

  const startRec = () => {
    if (!supported) return
    if (recording) {
      stopRec()
      return
    }
    setTranscript('')
    setResult(null)
    setError(null)

    const rec = new SpeechRecognitionCtor()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1

    let finalText = ''
    rec.onresult = (ev: any) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript
      }
      setTranscript(finalText)
    }
    rec.onend = () => setRecording(false)
    rec.onerror = (e: any) => {
      setRecording(false)
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        setError('麦克风权限被拒绝，请在浏览器设置里允许麦克风访问')
      } else if (e?.error !== 'aborted') {
        setError(`识别出错：${e?.error ?? '未知错误'}`)
      }
    }

    recRef.current = rec
    rec.start()
    setRecording(true)
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

  const scoreColor = (result?.accuracy ?? 0) >= 80 ? 'text-green-600' : (result?.accuracy ?? 0) >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="space-y-6">
      <button onClick={() => { stopRec(); onBack() }} className="text-sm text-ink-500 hover:text-ink-900">
        ← 返回列表
      </button>

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
            onClick={startRec}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-colors ${
              recording ? 'bg-red-500 text-white animate-pulse' : 'bg-ink-900 text-white hover:opacity-90'
            }`}
            aria-label={recording ? '停止朗读' : '开始朗读'}
          >
            {recording ? '⏹' : '🎤'}
          </button>
          <div className="text-sm text-ink-500 mt-2">
            {recording ? '正在聆听…请朗读上面的句子' : supported ? '点击麦克风，开始朗读' : '当前浏览器不支持语音识别'}
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
                  className={`h-full transition-all ${result.accuracy >= 80 ? 'bg-green-500' : result.accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${result.accuracy}%` }}
                />
              </div>
            </div>
          </div>

          {result.feedback && (
            <p className="text-sm leading-relaxed text-ink-900">{result.feedback}</p>
          )}

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

          <div className="flex gap-2">
            <button onClick={() => { setResult(null); setTranscript(''); }} className="va-btn va-btn--secondary va-btn--sm">
              再读一遍
            </button>
            <button onClick={startRec} className="va-btn va-btn--primary va-btn--sm">
              {recording ? '停止' : '重新录音'}
            </button>
          </div>

          {result.is_mock && (
            <div className="text-xs text-ink-500">（当前为简单比对，AI 恢复后给出更精准的发音点评）</div>
          )}
        </div>
      )}
    </div>
  )
}
