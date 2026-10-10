import { useEffect, useRef, useState } from 'react'
import { config } from '@/config'

interface Props {
  text: string
  /** 词典真人发音地址（后端返回的 audioUrl），有则优先播放 */
  audioUrl?: string
  /** 语速，仅浏览器兜底 TTS 生效 */
  rate?: number
  className?: string
}

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

/* ============ 音色偏好 ============ */

const VOICE_KEY = 'va-tts-voice'
export const TTS_VOICES = [
  { key: 'us-f', label: '美音 · 女', flag: '🇺🇸' },
  { key: 'us-m', label: '美音 · 男', flag: '🇺🇸' },
  { key: 'uk-f', label: '英音 · 女', flag: '🇬🇧' },
  { key: 'uk-m', label: '英音 · 男', flag: '🇬🇧' },
  { key: 'au-f', label: '澳音 · 女', flag: '🇦🇺' },
] as const

export function getTtsVoice(): string {
  try {
    return localStorage.getItem(VOICE_KEY) || 'us-f'
  } catch {
    return 'us-f'
  }
}

export function setTtsVoice(key: string): void {
  try {
    localStorage.setItem(VOICE_KEY, key)
  } catch {
    /* ignore */
  }
}

/** 服务端 TTS 地址（同一个词 URL 相同，浏览器会长期缓存） */
export function ttsUrl(text: string, voice = getTtsVoice()): string {
  const p = `/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`
  return config.aiGateway ? `${config.aiGateway}${p}` : p
}

/* ============ 播放 ============ */

let currentAudio: HTMLAudioElement | null = null

/** 浏览器内置 TTS（服务端不可用时的兜底） */
function browserTts(text: string, rate: number): boolean {
  if (!speechSupported || !text?.trim()) return false
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = getTtsVoice().startsWith('uk') ? 'en-GB' : 'en-US'
  u.rate = rate
  const voices = window.speechSynthesis.getVoices()
  const want = getTtsVoice().startsWith('uk') ? /en[-_]GB/i : /en[-_]US/i
  const v = voices.find((x) => want.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang))
  if (v) u.voice = v
  window.speechSynthesis.speak(u)
  return true
}

/**
 * 朗读一段文本：优先服务端神经语音，失败退回浏览器 TTS。
 * 返回一个 Promise，resolve(true) 表示已用服务端语音播放。
 */
export async function speakText(text: string, rate = 0.95): Promise<boolean> {
  const t = (text || '').trim()
  if (!t) return false

  stopSpeaking()

  // 长文本服务端 TTS 也有上限，超了就退回浏览器
  if (t.length <= 1200) {
    try {
      const audio = new Audio(ttsUrl(t))
      currentAudio = audio
      await audio.play()
      return true
    } catch {
      /* 播放失败（网络/自动播放限制）→ 退回浏览器 TTS */
    }
  }

  return browserTts(t, rate)
}

/** 停止当前朗读 */
export function stopSpeaking(): void {
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.currentTime = 0
    } catch {
      /* ignore */
    }
    currentAudio = null
  }
  if (speechSupported) window.speechSynthesis.cancel()
}

/**
 * 小喇叭发音按钮
 * 优先播放词典音频（audioUrl）→ 服务端神经语音 → 浏览器内置 TTS。
 * 注意：iOS Safari 需要用户手势触发，点击即满足条件。
 */
export function SpeakButton({ text, audioUrl, rate = 0.9, className = '' }: Props) {
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause()
      stopSpeaking()
    }
  }, [])

  const stop = () => {
    stopSpeaking()
    if (audioRef.current) audioRef.current.pause()
    setSpeaking(false)
  }

  const handleClick = async () => {
    if (speaking) {
      stop()
      return
    }
    setSpeaking(true)

    // 1) 词典自带音频
    if (audioUrl) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onended = () => setSpeaking(false)
      audio.onerror = () => {
        void fallback()
      }
      try {
        await audio.play()
        return
      } catch {
        /* 继续兜底 */
      }
    }

    // 2) 服务端神经语音 → 3) 浏览器 TTS
    const ok = await speakText(text, rate)
    if (!ok) {
      setSpeaking(false)
      return
    }
    // 服务端音频播完就复位
    window.setTimeout(() => setSpeaking(false), 200 + text.length * 70)

    async function fallback() {
      const ok2 = await speakText(text, rate)
      if (!ok2) setSpeaking(false)
      else window.setTimeout(() => setSpeaking(false), 200 + text.length * 70)
    }
  }

  const disabled = !speechSupported && !audioUrl

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={disabled ? '当前浏览器不支持发音' : '点击发音'}
      aria-label={`朗读 ${text}`}
      className={[
        'inline-flex items-center justify-center rounded-full transition-colors',
        'w-9 h-9 text-lg leading-none',
        speaking
          ? 'bg-ink-900 text-white animate-pulse'
          : 'bg-ink-50 text-ink-600 hover:bg-ink-900 hover:text-white',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
        className,
      ].join(' ')}
    >
      {speaking ? '🔉' : '🔊'}
    </button>
  )
}
