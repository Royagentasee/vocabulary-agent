import { useEffect, useRef, useState } from 'react'

interface Props {
  text: string
  /** 词典真人发音地址（后端返回的 audioUrl），有则优先播放 */
  audioUrl?: string
  /** 语速，默认 0.9（比正常略慢，适合学词） */
  rate?: number
  className?: string
}

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * 小喇叭发音按钮
 * 优先播放词典音频（audioUrl），没有则用浏览器内置 TTS 朗读。
 * 注意：iOS Safari 需要用户手势触发，点击即满足条件。
 */
export function SpeakButton({ text, audioUrl, rate = 0.9, className = '' }: Props) {
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      if (audioRef.current) audioRef.current.pause()
      if (speechSupported) window.speechSynthesis.cancel()
    }
  }, [])

  const stop = () => {
    if (speechSupported) window.speechSynthesis.cancel()
    if (audioRef.current) audioRef.current.pause()
    setSpeaking(false)
  }

  const tts = () => {
    if (!speechSupported) {
      setSpeaking(false)
      return
    }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = rate

    // 优先挑一个英语音色，避免用中文音色读英文
    const voices = window.speechSynthesis.getVoices()
    const en = voices.find((v) => /en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang))
    if (en) u.voice = en

    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }

  const handleClick = () => {
    if (speaking) {
      stop()
      return
    }
    setSpeaking(true)

    if (audioUrl) {
      // 有词典音频就播真人发音
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onended = () => setSpeaking(false)
      audio.onerror = () => {
        // 音频加载失败 → 退回 TTS
        tts()
      }
      audio.play().catch(() => tts())
      return
    }

    tts()
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
