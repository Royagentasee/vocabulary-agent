import { useState, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { colors, radius, spacing } from '../styles/tokens'

const API_BASE = 'https://your-ai-gateway-domain.com'

interface VoiceRecorderProps {
  onResult: (text: string, audioBase64: string) => void
  referenceText?: string  // 用于发音评分
  mode?: 'recognize' | 'pronunciation'  // 识别模式 vs 发音评分
  prompt?: string
}

const formatMap: Record<string, string> = {
  mp3: 'mp3',
  wav: 'wav',
  PCM: 'pcm',
}

/**
 * 语音录制组件（基于 Taro RecorderManager）
 */
export function VoiceRecorder({ onResult, referenceText, mode = 'recognize', prompt = '点击开始录音' }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const recorderManager = useRef<any>(null)
  const audioData = useRef<string>('')

  const initRecorder = () => {
    if (recorderManager.current) return recorderManager.current
    recorderManager.current = Taro.getRecorderManager()
    recorderManager.current.onStart(() => {
      setRecording(true)
    })
    recorderManager.current.onStop(async (res) => {
      setRecording(false)
      setProcessing(true)
      try {
        const buffer = res.tempFilePath
        // 读取文件为 base64
        const fileSystem = Taro.getFileSystemManager()
        const base64 = fileSystem.readFileSync(buffer, 'utf-8')
        audioData.current = base64
        await processAudio(base64, res.format || 'mp3')
      } catch (e: any) {
        Taro.showToast({ title: e.message || '录音失败', icon: 'none' })
      } finally {
        setProcessing(false)
      }
    })
    recorderManager.current.onError((err: any) => {
      Taro.showToast({ title: '录音错误', icon: 'none' })
      console.error(err)
      setRecording(false)
    })
    return recorderManager.current
  }

  const startRecording = () => {
    if (!Taro.getRecorderManager) {
      Taro.showToast({ title: '当前环境不支持录音', icon: 'none' })
      return
    }
    const manager = initRecorder()
    manager.start({
      duration: 30000,  // 30 秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3',
    })
  }

  const stopRecording = () => {
    if (recorderManager.current) recorderManager.current.stop()
  }

  const processAudio = async (base64: string, format: string) => {
    if (mode === 'pronunciation' && referenceText) {
      // 发音评分
      const resp = await fetch(`${API_BASE}/api/ai/voice/pronunciation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: base64,
          reference_text: referenceText,
          format: formatMap[format] || 'pcm',
          sample_rate: 16000,
          language: 'en-US',
        }),
      })
      const data = await resp.json()
      Taro.showModal({
        title: '发音评分',
        content: `总分：${Math.round(data.overall)}\n发音：${Math.round(data.pronunciation)}\n流利度：${Math.round(data.fluency)}`,
        showCancel: false,
      })
    } else {
      // 语音识别
      const resp = await fetch(`${API_BASE}/api/ai/voice/asr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: base64,
          format: formatMap[format] || 'pcm',
          sample_rate: 16000,
          language: 'en-US',
        }),
      })
      const data = await resp.json()
      onResult(data.text, base64)
    }
  }

  return (
    <View
      onClick={() => (recording ? stopRecording() : startRecording())}
      style={{
        backgroundColor: recording ? colors.danger : colors.ink[900],
        padding: `${spacing.md}px ${spacing.xl}px`,
        borderRadius: radius.full,
        alignItems: 'center',
        opacity: processing ? 0.6 : 1,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
        {processing ? '处理中...' : recording ? '⏹ 停止录音' : `🎙 ${prompt}`}
      </Text>
    </View>
  )
}