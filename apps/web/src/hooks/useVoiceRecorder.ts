/**
 * 浏览器录音（MediaRecorder）
 *
 * 相比 SpeechRecognition 的优势：
 * - 可以随时 stop()（不会出现"点了停不下来"）
 * - 不依赖 Google 服务，录音上传到我们自己服务器用 Whisper 识别
 *
 * 注意：getUserMedia 需要安全上下文（HTTPS 或 localhost）。
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    } catch {
      /* ignore */
    }
    streamRef.current = null
    mrRef.current = null
    setRecording(false)
  }, [])

  useEffect(() => () => cleanup(), [cleanup])

  /** 开始录音；返回是否成功 */
  const start = useCallback(async (): Promise<boolean> => {
    if (mrRef.current) return true
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false
    if (typeof MediaRecorder === 'undefined') return false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const preferred = 'audio/webm;codecs=opus'
      const mr =
        typeof MediaRecorder.isTypeSupported === 'function' &&
        MediaRecorder.isTypeSupported(preferred)
          ? new MediaRecorder(stream, { mimeType: preferred })
          : new MediaRecorder(stream)

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.start()
      mrRef.current = mr
      setRecording(true)
      return true
    } catch {
      cleanup()
      return false
    }
  }, [cleanup])

  /** 停止录音并返回音频 Blob */
  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const mr = mrRef.current
      if (!mr || mr.state === 'inactive') {
        cleanup()
        resolve(new Blob())
        return
      }
      const mime = mr.mimeType || 'audio/webm'
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime })
        cleanup()
        resolve(blob)
      }
      mr.stop()
    })
  }, [cleanup])

  return { recording, start, stop }
}
