/**
 * 口语对话陪练 API
 */
import { config, fetchWithFallback } from '../config'

export type Scenario = 'interview' | 'travel' | 'business' | 'academic' | 'daily'
export type Level = 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export interface DialogueStartResult {
  session_id: string
  scenario: string
  level: string
  opening: string
}

export interface DialogueTurnResult {
  assistant_text: string
  corrections: string[]
  vocabulary_used: string[]
  next_question: string
}

export interface DialogueMessage {
  role: 'assistant' | 'user'
  content: string
}

export interface DialogueScoreResult {
  overall_score: number
  pronunciation: number
  grammar: number
  vocabulary: number
  fluency: number
  highlights: string[]
  improvements: string[]
}

const BASE = '/api/ai/dialogue'

export async function startDialogue(
  scenario: Scenario,
  level: Level,
): Promise<DialogueStartResult> {
  const path = `${BASE}/start`
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: 'web', scenario, level, language: 'en-US' }),
  })
  if (!resp.ok) throw new Error(`开始对话失败 ${resp.status}`)
  return resp.json()
}

export async function turnDialogue(
  sessionId: string,
  userText: string,
): Promise<DialogueTurnResult> {
  const path = `${BASE}/turn`
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, user_text: userText }),
  })
  if (!resp.ok) throw new Error(`对话失败 ${resp.status}`)
  return resp.json()
}

export async function scoreDialogue(
  sessionId: string,
  transcript: DialogueMessage[],
): Promise<DialogueScoreResult> {
  const path = `${BASE}/score`
  const directUrl = config.aiGateway ? `${config.aiGateway}${path}` : path
  const resp = await fetchWithFallback(path, directUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, transcript }),
  })
  if (!resp.ok) throw new Error(`评分失败 ${resp.status}`)
  return resp.json()
}

export const SCENARIOS: { id: Scenario; label: string; emoji: string; desc: string }[] = [
  { id: 'interview', label: '面试', emoji: '💼', desc: '模拟求职面试' },
  { id: 'travel', label: '旅行', emoji: '✈️', desc: '旅行出行场景' },
  { id: 'business', label: '商务', emoji: '📈', desc: '商务会议沟通' },
  { id: 'academic', label: '学术', emoji: '🎓', desc: '学术讨论交流' },
  { id: 'daily', label: '日常', emoji: '☕', desc: '日常生活闲聊' },
]

export const LEVELS: Level[] = ['A2', 'B1', 'B2', 'C1', 'C2']
