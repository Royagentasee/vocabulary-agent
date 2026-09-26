/**
 * 口语朗读 API
 */
import { config, fetchWithFallback } from '../config'

export interface SpeakingSentence {
  id: string
  text: string
  translation: string
  focus: string
  difficulty: string
}

export interface Mispronounced {
  word: string
  tip: string
}

export interface SpeakingAssessResult {
  accuracy: number
  feedback: string
  mispronounced: Mispronounced[]
  is_mock: boolean
}

export async function fetchSpeakingSentences(): Promise<SpeakingSentence[]> {
  const path = '/api/speaking/sentences'
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, directUrl, { method: 'GET' })
  if (!resp.ok) throw new Error(`朗读句加载失败 ${resp.status}`)
  const data = await resp.json()
  return data?.items ?? []
}

export async function assessSpeaking(
  text: string,
  transcript: string,
): Promise<SpeakingAssessResult> {
  const path = '/api/speaking/assess'
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, transcript }),
  })
  if (!resp.ok) throw new Error(`发音评估失败 ${resp.status}`)
  return resp.json()
}

/* ============ 服务端语音识别（Whisper，不依赖 Google）============ */

export interface SttStatus {
  available: boolean
  engine: string
  model: string
}

export async function fetchSttStatus(): Promise<SttStatus> {
  const path = '/api/speaking/stt-status'
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  try {
    const resp = await fetchWithFallback(path, directUrl, { method: 'GET' })
    if (!resp.ok) return { available: false, engine: '', model: '' }
    return resp.json()
  } catch {
    return { available: false, engine: '', model: '' }
  }
}

/** 上传录音，返回识别出的英文文本 */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const path = '/api/speaking/transcribe'
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path

  const fd = new FormData()
  fd.append('file', blob, 'audio.webm')

  const resp = await fetchWithFallback(path, directUrl, { method: 'POST', body: fd })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`语音识别失败 ${resp.status}: ${body.slice(0, 100)}`)
  }
  const data = await resp.json()
  return data?.text ?? ''
}
