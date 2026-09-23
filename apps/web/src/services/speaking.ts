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
