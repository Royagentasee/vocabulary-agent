import { useState } from 'react'
import { TTS_VOICES, getTtsVoice, setTtsVoice, speakText } from '@/components/SpeakButton'
import { trackEvent } from '@/services/stats'

/** 发音音色设置 */
export function VoicePicker() {
  const [voice, setVoice] = useState(getTtsVoice())

  const pick = (key: string) => {
    setVoice(key)
    setTtsVoice(key)
    trackEvent('tts_voice', key)
    // 立刻试听，让用户听到效果
    void speakText('Hello, this is how I sound.')
  }

  return (
    <section className="va-card space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">🔊 发音音色</div>
        <button
          onClick={() => void speakText('Hello, this is how I sound.')}
          className="text-xs text-accent-deep hover:underline"
        >
          试听
        </button>
      </div>
      <div className="text-xs text-ink-500">
        神经语音，接近真人朗读。选好后所有单词、句子、文章都用这个音色。
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
        {TTS_VOICES.map((v) => (
          <button
            key={v.key}
            onClick={() => pick(v.key)}
            className={`py-2 rounded-lg text-xs border transition-colors ${
              voice === v.key
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white border-ink-100 text-ink-700 hover:border-ink-900 active:bg-ink-50'
            }`}
          >
            <div className="text-sm leading-none mb-0.5">{v.flag}</div>
            <div>{v.label}</div>
          </button>
        ))}
      </div>
    </section>
  )
}
